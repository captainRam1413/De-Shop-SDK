"""
De-Shop SDK — Real AI/ML Pricing Engine
=========================================
Replaces the rule-based mock engine with a statistical regression model
trained on historical sales data from the database.

Features:
  - Linear regression on time-decay-weighted transaction history
  - Market signal analysis (supply vs demand, moving averages, volatility)
  - Demand forecasting with exponential moving average (EMA)
  - Feature extraction from skin name (weapon class, visual effects)
  - Graceful fallback to rule-based defaults when data is insufficient
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any


# ─── Dataclass (backward-compatible) ─────────────────────────────────────────

@dataclass(frozen=True)
class PriceSuggestion:
    price: int
    confidence: int
    trend: str
    rarity_score: int
    demand_score: int


# ─── Constants ────────────────────────────────────────────────────────────────

# Half-life for time-decay weighting in seconds (7 days)
HALF_LIFE_SECONDS = 7 * 24 * 60 * 60  # 604_800
HALF_LIFE_LN2 = math.log(2)  # ~0.6931

# Minimum training samples before using ML model (otherwise fall back to rules)
MIN_TRAINING_SAMPLES = 5

# Moving-average window size
MA_WINDOW = 30

# EMA smoothing factor (alpha) for demand forecasting
EMA_ALPHA = 0.3

# Default rarity base prices (μALGO)
RARITY_DEFAULTS: dict[str, int] = {
    "common": 10,
    "uncommon": 20,
    "rare": 50,
    "epic": 120,
    "legendary": 300,
    "mythic": 800,
}

# Rarity numeric scale (used as a feature in regression)
RARITY_NUMERIC: dict[str, float] = {
    "common": 1.0,
    "uncommon": 2.0,
    "rare": 3.0,
    "epic": 4.0,
    "legendary": 5.0,
    "mythic": 6.0,
}

# ─── Weapon-class detection (longest-match-first) ────────────────────────────
# Sorted by key length descending so that "ak-47" matches before "ak"

_WEAPON_PATTERNS_RAW: list[tuple[str, str]] = [
    ("ak-47", "AR"), ("ak47", "AR"), ("assault", "AR"), ("mac-10", "SMG"),
    ("m4a1", "AR"), ("kar98", "Sniper"), ("m249", "LMG"),
    ("ak", "AR"), ("m4", "AR"), ("m16", "AR"), ("scar", "AR"), ("grau", "AR"),
    ("fal", "AR"), ("rifle", "AR"), ("ar", "AR"),
    ("mp5", "SMG"), ("mp7", "SMG"), ("mp9", "SMG"), ("uzi", "SMG"), ("p90", "SMG"),
    ("smg", "SMG"), ("vector", "SMG"),
    ("sniper", "Sniper"), ("awp", "Sniper"), ("awm", "Sniper"), ("hdr", "Sniper"),
    ("barrett", "Sniper"),
    ("shotgun", "Shotgun"), ("spas", "Shotgun"), ("725", "Shotgun"),
    ("pistol", "Pistol"), ("deagle", "Pistol"), ("glock", "Pistol"),
    ("revolver", "Pistol"), ("magnum", "Pistol"),
    ("knife", "Melee"), ("sword", "Melee"), ("blade", "Melee"), ("katana", "Melee"),
    ("axe", "Melee"), ("dagger", "Melee"),
    ("lmg", "LMG"), ("pkm", "LMG"),
    ("rpg", "Launcher"), ("launcher", "Launcher"),
]

# Pre-sort by key length descending for longest-match-first
WEAPON_PATTERNS: list[tuple[str, str]] = sorted(
    _WEAPON_PATTERNS_RAW, key=lambda kv: len(kv[0]), reverse=True
)

# Weapon class price multipliers (some weapon types are more desirable)
WEAPON_CLASS_MULTIPLIER: dict[str, float] = {
    "AR": 1.0,
    "SMG": 0.9,
    "Sniper": 1.3,
    "Shotgun": 0.85,
    "Pistol": 0.8,
    "Melee": 1.5,
    "LMG": 0.95,
    "Launcher": 0.85,
    "Unknown": 1.0,
}

# Visual effect keywords and their price multipliers
EFFECT_SCORES: dict[str, float] = {
    "reactive": 2.2, "diamond": 2.5, "tracer": 1.8, "holographic": 1.8,
    "holo": 1.8, "gold": 2.0, "galaxy": 2.0, "void": 1.7, "plasma": 1.6,
    "dragon": 1.5, "fire": 1.5, "flame": 1.5, "animated": 1.5,
    "lightning": 1.4, "electric": 1.4, "ice": 1.3, "frost": 1.3,
    "neon": 1.2, "shadow": 1.1, "dark": 1.1,
}

# Character-detection keywords
CHARACTER_KEYWORDS: list[str] = [
    "operator", "character", "soldier", "ghost", "phantom", "warrior",
    "ninja", "samurai", "knight", "guardian", "hunter", "assassin",
    "outfit", "armor", "suit", "hero",
]


# ─── Feature Extraction ──────────────────────────────────────────────────────

def detect_weapon_class(name: str) -> str:
    """Detect weapon class from skin name using longest-match-first with word boundaries."""
    lower = name.lower()
    for pattern, cls in WEAPON_PATTERNS:
        # Use word-boundary regex to avoid false matches (e.g. "ar" in "warrior")
        if re.search(rf'\b{re.escape(pattern)}\b', lower):
            return cls
    return "Unknown"


def detect_effects(name: str) -> tuple[list[str], float]:
    """Detect visual effects from skin name. Returns (effects, max_bonus)."""
    lower = name.lower()
    effects: list[str] = []
    max_bonus = 0.0
    for kw, score in EFFECT_SCORES.items():
        if kw in lower:
            effects.append(kw)
            max_bonus = max(max_bonus, score)
    return effects, max_bonus


def classify_skin_type(name: str, skin_type: str) -> str:
    """Classify as 'weapon' or 'character' based on name and declared type."""
    if skin_type and skin_type != "weapon":
        return skin_type
    lower = name.lower()
    # Check weapon patterns first (using word-boundary matching)
    if detect_weapon_class(name) != "Unknown":
        return "weapon"
    # Then check character keywords
    for kw in CHARACTER_KEYWORDS:
        if kw in lower:
            return "character"
    return skin_type or "weapon"


# ─── Pure-Python Linear Regression ───────────────────────────────────────────

class _LinearRegression:
    """
    Simple ordinary-least-squares linear regression using pure Python math.
    Supports weighted samples (for time-decay weighting).

    Model:  y = beta_0 + beta_1 * x1 + beta_2 * x2 + ...
    """

    def __init__(self) -> None:
        self.coefficients: list[float] = []  # [beta_0, beta_1, beta_2, ...]
        self.n_samples: int = 0
        self.r_squared: float = 0.0

    def fit(self, X: list[list[float]], y: list[float], w: list[float] | None = None) -> None:
        """
        Fit the model using weighted least squares.

        Args:
            X: Feature matrix, shape (n, p) — each row is a sample, each col a feature.
            y: Target vector, shape (n,).
            w: Optional weight vector, shape (n,). Defaults to all 1.0.
        """
        n = len(y)
        if n == 0:
            self.coefficients = [0.0]
            self.n_samples = 0
            self.r_squared = 0.0
            return

        p = len(X[0]) if X else 0
        if p == 0:
            self.coefficients = [sum(y) / n]
            self.n_samples = n
            self.r_squared = 0.0
            return

        # Add intercept column (1.0) as the first feature
        # Augmented X: [1, x1, x2, ...]
        X_aug = [[1.0] + row for row in X]
        k = p + 1  # number of parameters including intercept

        if w is None:
            w = [1.0] * n

        # Build (X^T W X) and (X^T W y) — normal equations for WLS
        # XTWX[i][j] = sum(w[s] * X_aug[s][i] * X_aug[s][j])
        # XTWy[i]   = sum(w[s] * X_aug[s][i] * y[s])

        XTWX: list[list[float]] = [[0.0] * k for _ in range(k)]
        XTWy: list[float] = [0.0] * k

        for s in range(n):
            ws = w[s]
            row = X_aug[s]
            for i in range(k):
                XTWy[i] += ws * row[i] * y[s]
                for j in range(k):
                    XTWX[i][j] += ws * row[i] * row[j]

        # Solve via Gaussian elimination with partial pivoting
        # Augmented matrix [XTWX | XTWy]
        aug: list[list[float]] = [XTWX[i] + [XTWy[i]] for i in range(k)]

        for col in range(k):
            # Partial pivoting
            max_row = col
            max_val = abs(aug[col][col])
            for row in range(col + 1, k):
                if abs(aug[row][col]) > max_val:
                    max_val = abs(aug[row][col])
                    max_row = row
            aug[col], aug[max_row] = aug[max_row], aug[col]

            pivot = aug[col][col]
            if abs(pivot) < 1e-12:
                # Singular — use zero for this coefficient
                aug[col][col] = 1.0
                for jj in range(col + 1, k + 1):
                    aug[col][jj] = 0.0
                continue

            # Eliminate below
            for row in range(col + 1, k):
                factor = aug[row][col] / pivot
                for jj in range(col, k + 1):
                    aug[row][jj] -= factor * aug[col][jj]

        # Back-substitution
        coeffs = [0.0] * k
        for i in range(k - 1, -1, -1):
            s = aug[i][k]
            for j in range(i + 1, k):
                s -= aug[i][j] * coeffs[j]
            if abs(aug[i][i]) < 1e-12:
                coeffs[i] = 0.0
            else:
                coeffs[i] = s / aug[i][i]

        self.coefficients = coeffs
        self.n_samples = n

        # Compute R² (weighted)
        y_pred = self.predict_batch(X)
        y_mean = sum(wi * yi for wi, yi in zip(w, y)) / sum(w)
        ss_tot = sum(wi * (yi - y_mean) ** 2 for wi, yi in zip(w, y))
        ss_res = sum(wi * (yi - yp) ** 2 for wi, yi, yp in zip(w, y, y_pred))
        self.r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 1e-12 else 0.0

    def predict(self, features: list[float]) -> float:
        """Predict y for a single sample (without intercept — it's built in)."""
        aug = [1.0] + list(features)
        return sum(c * f for c, f in zip(self.coefficients, aug))

    def predict_batch(self, X: list[list[float]]) -> list[float]:
        """Predict y for multiple samples."""
        return [self.predict(row) for row in X]


# ─── Main Engine ─────────────────────────────────────────────────────────────

class AIPricingEngine:
    """
    Real ML-based pricing engine for the De-Shop SDK.

    Uses a linear regression model trained on historical sales data
    with time-decay weighting. Falls back to rule-based defaults when
    insufficient data is available.
    """

    def __init__(self) -> None:
        # Trained model state
        self._model: _LinearRegression | None = None
        self._rarity_multipliers: dict[str, float] = {}
        self._last_trained: datetime | None = None
        self._training_samples: int = 0
        self._model_r_squared: float = 0.0

        # Cached market data
        self._demand_ema: dict[str, float] = {}  # key: f"{rarity}" -> EMA value
        self._recent_prices: dict[str, list[tuple[float, float]]] = {}  # rarity -> [(timestamp, price)]

    # ─── Public API ────────────────────────────────────────────────────────────

    def suggest_price(
        self,
        skin_name: str,
        rarity: str,
        skin_type: str = "weapon",
        marketplace_data: dict | None = None,
    ) -> PriceSuggestion:
        """
        Generate an AI-powered price suggestion for a skin.

        Args:
            skin_name: Display name of the skin (e.g. "Neon Phantom AK-47").
            rarity: Rarity tier (common, uncommon, rare, epic, legendary, mythic).
            skin_type: Type of skin — "weapon", "character", or "accessory".
            marketplace_data: Optional dict with live marketplace info:
                - "listed_count": int — number of similar items currently listed
                - "recent_sales": int — number of sales in last 24h
                - "avg_price_24h": float — average sale price in last 24h
                - "volatility": float — price volatility measure

        Returns:
            PriceSuggestion with price, confidence, trend, rarity_score, demand_score.
        """
        rarity_key = rarity.strip().lower() or "common"

        # ── Feature extraction ──────────────────────────────────────────────
        weapon_class = detect_weapon_class(skin_name)
        effects, effect_bonus = detect_effects(skin_name)
        resolved_type = classify_skin_type(skin_name, skin_type)

        # ── Rarity score ────────────────────────────────────────────────────
        rarity_base = RARITY_NUMERIC.get(rarity_key, 2.0)
        rarity_score = int(min(100, rarity_base * 15 + effect_bonus * 10))

        # ── Demand score ────────────────────────────────────────────────────
        demand_score = self._compute_demand_score(
            skin_name, rarity_key, marketplace_data
        )

        # ── ML-based pricing ────────────────────────────────────────────────
        ml_price = self._predict_price(
            skin_name, rarity_key, resolved_type, weapon_class, effect_bonus
        )

        # ── Market-data adjustment ──────────────────────────────────────────
        market_price = self._adjust_for_market(
            ml_price, rarity_key, weapon_class, effect_bonus, marketplace_data
        )

        # ── Final price with bounds ─────────────────────────────────────────
        default_price = RARITY_DEFAULTS.get(rarity_key, 50)
        final_price = max(1, int(market_price)) if self._model and self._training_samples >= MIN_TRAINING_SAMPLES else default_price
        # Blend with default if we have some but limited data
        if self._model and 0 < self._training_samples < MIN_TRAINING_SAMPLES:
            blend = self._training_samples / MIN_TRAINING_SAMPLES
            final_price = max(1, int(default_price * (1 - blend) + market_price * blend))

        # ── Confidence ──────────────────────────────────────────────────────
        confidence = self._compute_confidence(rarity_key, demand_score)

        # ── Trend ───────────────────────────────────────────────────────────
        trend = self._compute_trend(rarity_key, demand_score)

        return PriceSuggestion(
            price=final_price,
            confidence=confidence,
            trend=trend,
            rarity_score=rarity_score,
            demand_score=demand_score,
        )

    def train_model(self) -> dict[str, Any]:
        """
        (Re)train the regression model from database transaction history.

        Returns a metrics dict with training statistics.
        """
        metrics: dict[str, Any] = {
            "status": "failed",
            "samples": 0,
            "r_squared": 0.0,
            "rarity_multipliers": {},
            "error": None,
        }

        try:
            from deshop_backend.models import db, Asset, Transaction  # noqa: F401

            # Fetch all completed buy transactions with their asset info
            buy_txns = (
                db.session.query(Transaction, Asset)
                .join(Asset, Transaction.asset_id == Asset.id)
                .filter(
                    Transaction.txn_type == "buy",
                    Transaction.amount.isnot(None),
                    Transaction.amount > 0,
                )
                .all()
            )

            if not buy_txns:
                metrics["status"] = "no_data"
                return metrics

            now = datetime.now(timezone.utc)

            # Build training dataset
            X: list[list[float]] = []
            y: list[float] = []
            w: list[float] = []

            rarity_sums: dict[str, list[float]] = {}
            overall_prices: list[float] = []

            for txn, asset in buy_txns:
                amount = float(txn.amount)
                rarity_val = RARITY_NUMERIC.get(asset.rarity.strip().lower(), 2.0)
                weapon_cls = detect_weapon_class(asset.name or "")
                weapon_mult = WEAPON_CLASS_MULTIPLIER.get(weapon_cls, 1.0)
                _, effect_bonus = detect_effects(asset.name or "")
                skin_type_flag = 1.0 if (asset.skin_type or "weapon") == "weapon" else 0.0

                # Features: [rarity_numeric, weapon_multiplier, effect_bonus, skin_type_flag]
                features = [rarity_val, weapon_mult, effect_bonus, skin_type_flag]
                X.append(features)
                y.append(amount)
                overall_prices.append(amount)

                # Time-decay weight (7-day half-life)
                txn_time = txn.created_at
                if txn_time and txn_time.tzinfo is None:
                    txn_time = txn_time.replace(tzinfo=timezone.utc)
                age_seconds = (now - txn_time).total_seconds() if txn_time else 0.0
                decay_weight = math.exp(-HALF_LIFE_LN2 * max(0, age_seconds) / HALF_LIFE_SECONDS)
                w.append(decay_weight)

                # Accumulate for rarity multiplier computation
                rk = asset.rarity.strip().lower()
                rarity_sums.setdefault(rk, []).append(amount)

            # Compute rarity multipliers from actual data
            overall_mean = sum(overall_prices) / len(overall_prices) if overall_prices else 1.0
            self._rarity_multipliers = {}
            for rk, prices in rarity_sums.items():
                rarity_mean = sum(prices) / len(prices)
                self._rarity_multipliers[rk] = rarity_mean / overall_mean if overall_mean > 0 else 1.0
            metrics["rarity_multipliers"] = dict(self._rarity_multipliers)

            # Train the regression model
            model = _LinearRegression()
            model.fit(X, y, w)

            self._model = model
            self._training_samples = len(y)
            self._model_r_squared = model.r_squared
            self._last_trained = now

            # Cache recent prices for moving-average computation
            self._cache_recent_prices(buy_txns, now)

            metrics.update({
                "status": "ok",
                "samples": len(y),
                "r_squared": round(model.r_squared, 4),
                "coefficients": [round(c, 4) for c in model.coefficients],
            })

        except Exception as exc:
            metrics["error"] = str(exc)

        return metrics

    def get_market_signals(self, rarity: str) -> dict[str, Any]:
        """
        Return market signal statistics for a given rarity tier.

        Returns:
            Dict with supply, demand, supply_demand_ratio, moving_avg,
            trend_direction, volatility, sample_count.
        """
        rarity_key = rarity.strip().lower()
        signals: dict[str, Any] = {
            "rarity": rarity_key,
            "supply": 0,
            "demand_24h": 0,
            "supply_demand_ratio": 0.0,
            "moving_avg_30": 0.0,
            "trend_direction": "stable",
            "volatility": 0.0,
            "sample_count": 0,
        }

        try:
            from deshop_backend.models import db, Asset, Transaction  # noqa: F401

            now = datetime.now(timezone.utc)
            cutoff_24h = now - timedelta(hours=24)

            # Supply: count of currently listed assets with this rarity
            supply = (
                db.session.query(Asset)
                .filter(Asset.rarity == rarity_key, Asset.listed == True)  # noqa: E712
                .count()
            )
            signals["supply"] = supply

            # Demand: number of buy transactions in last 24h for this rarity
            demand = (
                db.session.query(Transaction)
                .join(Asset, Transaction.asset_id == Asset.id)
                .filter(
                    Transaction.txn_type == "buy",
                    Asset.rarity == rarity_key,
                    Transaction.created_at >= cutoff_24h,
                )
                .count()
            )
            signals["demand_24h"] = demand

            # Supply/demand ratio
            if demand > 0:
                signals["supply_demand_ratio"] = round(supply / demand, 2)
            elif supply > 0:
                signals["supply_demand_ratio"] = float(supply)  # all supply, no demand

            # Moving average of last 30 sale prices for this rarity
            recent_sales = (
                db.session.query(Transaction.amount)
                .join(Asset, Transaction.asset_id == Asset.id)
                .filter(
                    Transaction.txn_type == "buy",
                    Asset.rarity == rarity_key,
                    Transaction.amount.isnot(None),
                    Transaction.amount > 0,
                )
                .order_by(Transaction.created_at.desc())
                .limit(MA_WINDOW)
                .all()
            )
            if recent_sales:
                prices = [float(r[0]) for r in recent_sales]
                signals["moving_avg_30"] = round(sum(prices) / len(prices), 2)

                # Volatility: standard deviation of recent prices
                mean_p = sum(prices) / len(prices)
                variance = sum((p - mean_p) ** 2 for p in prices) / len(prices)
                signals["volatility"] = round(math.sqrt(variance), 2)
                signals["sample_count"] = len(prices)

                # Simple trend: compare latest price to moving average
                if len(prices) >= 3:
                    recent_third = prices[: len(prices) // 3]
                    older_third = prices[-(len(prices) // 3):]
                    avg_recent = sum(recent_third) / len(recent_third)
                    avg_older = sum(older_third) / len(older_third)
                    if avg_recent > avg_older * 1.05:
                        signals["trend_direction"] = "rising"
                    elif avg_recent < avg_older * 0.95:
                        signals["trend_direction"] = "falling"
                    else:
                        signals["trend_direction"] = "stable"

        except Exception:
            # Outside app context or DB unavailable — return defaults
            pass

        return signals

    def forecast_demand(
        self,
        skin_name: str,
        rarity: str,
        horizon_hours: int = 24,
    ) -> dict[str, Any]:
        """
        Forecast demand for a skin over the given time horizon.

        Uses exponential moving average (EMA) of historical buy frequency
        and listing velocity.

        Returns:
            Dict with predicted_demand_score, trend, confidence, method.
        """
        rarity_key = rarity.strip().lower()
        result: dict[str, Any] = {
            "skin_name": skin_name,
            "rarity": rarity_key,
            "horizon_hours": horizon_hours,
            "predicted_demand_score": 50,
            "trend": "stable",
            "confidence": 30,
            "method": "rule_based",
        }

        try:
            from deshop_backend.models import db, Asset, Transaction, Listing  # noqa: F401

            now = datetime.now(timezone.utc)

            # Count buy transactions per day for the last 14 days for this rarity
            days_back = 14
            daily_buys: list[tuple[str, int]] = []
            for day_offset in range(days_back):
                day_start = now - timedelta(days=day_offset + 1)
                day_end = now - timedelta(days=day_offset)
                count = (
                    db.session.query(Transaction)
                    .join(Asset, Transaction.asset_id == Asset.id)
                    .filter(
                        Transaction.txn_type == "buy",
                        Asset.rarity == rarity_key,
                        Transaction.created_at >= day_start,
                        Transaction.created_at < day_end,
                    )
                    .count()
                )
                daily_buys.append((day_start.strftime("%Y-%m-%d"), count))

            if daily_buys:
                # Compute EMA of daily buy counts
                counts = [c for _, c in daily_buys]
                counts.reverse()  # oldest first
                ema = float(counts[0])
                for c in counts[1:]:
                    ema = EMA_ALPHA * c + (1 - EMA_ALPHA) * ema

                # Store for future use
                self._demand_ema[rarity_key] = ema

                # Listing velocity: how quickly do listed items sell?
                # (sold listings / total listings) over last 7 days
                cutoff_7d = now - timedelta(days=7)
                total_listed = (
                    db.session.query(Listing)
                    .join(Asset, Listing.asset_id == Asset.id)
                    .filter(
                        Asset.rarity == rarity_key,
                        Listing.listed_at >= cutoff_7d,
                    )
                    .count()
                )
                sold_listed = (
                    db.session.query(Listing)
                    .join(Asset, Listing.asset_id == Asset.id)
                    .filter(
                        Asset.rarity == rarity_key,
                        Listing.listed_at >= cutoff_7d,
                        Listing.status == "sold",
                    )
                    .count()
                )
                velocity = (sold_listed / total_listed) if total_listed > 0 else 0.5

                # Scale to 0-100 demand score
                # EMA gives avg daily buys; scale relative to a baseline of ~5/day
                raw_score = min(100, ema / 5.0 * 50 * velocity)
                predicted_score = int(max(0, raw_score))

                # Trend from EMA
                if len(counts) >= 3:
                    recent = sum(counts[-3:]) / 3
                    older = sum(counts[:3]) / 3
                    if recent > older * 1.2:
                        trend = "rising"
                    elif recent < older * 0.8:
                        trend = "falling"
                    else:
                        trend = "stable"
                else:
                    trend = "stable"

                # Confidence based on data volume
                total_buys = sum(counts)
                conf = min(95, 40 + total_buys)

                result.update({
                    "predicted_demand_score": predicted_score,
                    "trend": trend,
                    "confidence": conf,
                    "method": "ema",
                    "ema_daily_buys": round(ema, 2),
                    "listing_velocity": round(velocity, 2),
                })

        except Exception:
            # Outside app context — use cached EMA or defaults
            cached = self._demand_ema.get(rarity_key)
            if cached is not None:
                result["predicted_demand_score"] = int(min(100, cached / 5.0 * 50))
                result["method"] = "ema_cached"

        return result

    # ─── Internal helpers ─────────────────────────────────────────────────────

    def _predict_price(
        self,
        skin_name: str,
        rarity_key: str,
        skin_type: str,
        weapon_class: str,
        effect_bonus: float,
    ) -> float:
        """Use the trained regression model to predict a base price."""
        # If no model or insufficient data, use rule-based fallback
        if self._model is None or self._training_samples < MIN_TRAINING_SAMPLES:
            return self._rule_based_price(rarity_key, weapon_class, effect_bonus)

        rarity_val = RARITY_NUMERIC.get(rarity_key, 2.0)
        weapon_mult = WEAPON_CLASS_MULTIPLIER.get(weapon_class, 1.0)
        skin_type_flag = 1.0 if skin_type == "weapon" else 0.0

        features = [rarity_val, weapon_mult, effect_bonus, skin_type_flag]
        predicted = self._model.predict(features)

        # Apply learned rarity multiplier if available
        rarity_mult = self._rarity_multipliers.get(rarity_key, 1.0)
        predicted *= rarity_mult

        # Clamp to reasonable bounds (1 μALGO minimum)
        return max(1.0, predicted)

    def _rule_based_price(
        self,
        rarity_key: str,
        weapon_class: str,
        effect_bonus: float,
    ) -> float:
        """Fallback rule-based pricing when ML model is unavailable."""
        base = RARITY_DEFAULTS.get(rarity_key, 50)
        weapon_mult = WEAPON_CLASS_MULTIPLIER.get(weapon_class, 1.0)
        # Effect bonus is additive on top of base multiplier
        total_mult = weapon_mult + (effect_bonus - 1.0) * 0.5 if effect_bonus > 1.0 else weapon_mult
        return base * total_mult

    def _adjust_for_market(
        self,
        base_price: float,
        rarity_key: str,
        weapon_class: str,
        effect_bonus: float,
        marketplace_data: dict | None,
    ) -> float:
        """Adjust the base price using marketplace data and cached signals."""
        price = base_price

        # Factor in marketplace_data if provided
        if marketplace_data:
            avg_24h = marketplace_data.get("avg_price_24h")
            listed_count = marketplace_data.get("listed_count", 0)
            recent_sales = marketplace_data.get("recent_sales", 0)
            volatility = marketplace_data.get("volatility", 0.0)

            # Blend with 24h average if available
            if avg_24h and avg_24h > 0:
                blend_weight = 0.4  # 40% market, 60% model
                price = price * (1 - blend_weight) + float(avg_24h) * blend_weight

            # Supply-demand adjustment
            if recent_sales > 0 and listed_count > 0:
                sd_ratio = listed_count / recent_sales
                # High demand (low ratio) pushes price up
                if sd_ratio < 1.0:
                    price *= 1.0 + (1.0 - sd_ratio) * 0.15
                # Low demand (high ratio) pushes price down
                elif sd_ratio > 3.0:
                    price *= max(0.7, 1.0 - (sd_ratio - 3.0) * 0.05)

            # Volatility discount — less confidence in volatile markets
            if volatility > 0:
                vol_discount = min(0.2, volatility * 0.01)
                price *= (1.0 - vol_discount)
        else:
            # Use DB-backed market signals as fallback
            try:
                signals = self.get_market_signals(rarity_key)
                ma = signals.get("moving_avg_30", 0)
                if ma and ma > 0 and self._model is not None:
                    price = price * 0.6 + ma * 0.4

                # Supply-demand from signals
                supply = signals.get("supply", 0)
                demand = signals.get("demand_24h", 0)
                if demand > 0 and supply > 0:
                    sd_ratio = supply / demand
                    if sd_ratio < 1.0:
                        price *= 1.0 + (1.0 - sd_ratio) * 0.1
                    elif sd_ratio > 3.0:
                        price *= max(0.8, 1.0 - (sd_ratio - 3.0) * 0.03)
            except Exception:
                pass

        return price

    def _compute_demand_score(
        self,
        skin_name: str,
        rarity_key: str,
        marketplace_data: dict | None,
    ) -> int:
        """Compute demand score (0-100) using EMA and market signals."""
        base_score = 50

        # Factor in marketplace data
        if marketplace_data:
            recent_sales = marketplace_data.get("recent_sales", 0)
            listed_count = marketplace_data.get("listed_count", 0)
            # More recent sales = higher demand
            sales_bonus = min(30, recent_sales * 5)
            # Fewer listings relative to sales = higher demand
            if recent_sales > 0 and listed_count > 0:
                ratio = listed_count / recent_sales
                supply_penalty = max(0, int((ratio - 1) * 5))
                base_score = base_score + sales_bonus - supply_penalty
            else:
                base_score = base_score + sales_bonus
        else:
            # Try to use cached EMA
            ema_val = self._demand_ema.get(rarity_key)
            if ema_val is not None:
                base_score = int(min(100, ema_val / 5.0 * 50))

        return max(0, min(100, base_score))

    def _compute_confidence(self, rarity_key: str, demand_score: int) -> int:
        """Compute confidence score based on model quality and data availability."""
        # Start with model-based confidence
        if self._model is not None and self._training_samples >= MIN_TRAINING_SAMPLES:
            # R² contributes to confidence (higher R² = higher confidence)
            r2_bonus = max(0, self._model_r_squared) * 30
            # More training samples = more confidence (diminishing returns)
            sample_bonus = min(20, math.log1p(self._training_samples) * 5)
            confidence = int(50 + r2_bonus + sample_bonus)
        elif self._model is not None and self._training_samples > 0:
            # Limited data: lower confidence
            confidence = 40 + min(15, self._training_samples * 3)
        else:
            # No model at all
            confidence = 30

        # Well-known rarities get a small boost
        if rarity_key in RARITY_DEFAULTS:
            confidence += 5

        # High demand slightly increases confidence (active market)
        if demand_score >= 70:
            confidence += 5

        return max(10, min(99, confidence))

    def _compute_trend(self, rarity_key: str, demand_score: int) -> str:
        """Determine price trend from market signals."""
        # Try to get trend from cached market signals
        try:
            signals = self.get_market_signals(rarity_key)
            trend_dir = signals.get("trend_direction", "stable")
            if trend_dir in ("rising", "falling"):
                return trend_dir
        except Exception:
            pass

        # Fallback: infer from demand score
        if demand_score >= 75:
            return "rising"
        elif demand_score >= 45:
            return "stable"
        else:
            return "falling"

    def _cache_recent_prices(
        self,
        buy_txns: list,
        now: datetime,
    ) -> None:
        """Cache recent transaction prices for moving-average computation."""
        self._recent_prices.clear()
        for txn, asset in buy_txns:
            rk = asset.rarity.strip().lower()
            txn_time = txn.created_at
            if txn_time and txn_time.tzinfo is None:
                txn_time = txn_time.replace(tzinfo=timezone.utc)
            ts = txn_time.timestamp() if txn_time else 0.0
            self._recent_prices.setdefault(rk, []).append((ts, float(txn.amount)))

        # Sort by timestamp and keep only last MA_WINDOW per rarity
        for rk in self._recent_prices:
            self._recent_prices[rk].sort(key=lambda x: x[0], reverse=True)
            self._recent_prices[rk] = self._recent_prices[rk][:MA_WINDOW]
