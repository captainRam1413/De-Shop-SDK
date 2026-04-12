from __future__ import annotations

import hashlib
from dataclasses import dataclass


@dataclass(frozen=True)
class PriceSuggestion:
    price: int
    confidence: int
    trend: str
    rarity_score: int
    demand_score: int


class AIPricingEngine:
    """Deterministic mock AI pricing for demo use."""

    def suggest_price(self, skin_name: str, rarity: str) -> PriceSuggestion:
        rarity_table = {
            "common": 1.0,
            "rare": 1.4,
            "epic": 1.9,
            "legendary": 2.5,
        }
        rarity_key = rarity.strip().lower() or "common"
        rarity_weight = rarity_table.get(rarity_key, 1.2)

        seed = int(hashlib.sha256(f"{skin_name}|{rarity_key}".encode()).hexdigest(), 16)
        demand_score = 50 + (seed % 51)
        rarity_score = int(40 + rarity_weight * 20)
        baseline = 55 + (seed % 40)
        suggested_price = int(baseline * rarity_weight + (demand_score * 0.35))
        confidence = min(96, 68 + (seed % 28))

        trend = "rising" if demand_score >= 75 else "stable" if demand_score >= 60 else "falling"
        return PriceSuggestion(
            price=suggested_price,
            confidence=confidence,
            trend=trend,
            rarity_score=rarity_score,
            demand_score=demand_score,
        )
