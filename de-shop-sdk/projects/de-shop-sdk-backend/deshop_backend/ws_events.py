"""
De-Shop SDK — WebSocket Real-Time Events
==========================================
SocketIO-based real-time event broadcasting for marketplace mutations.

Features:
  - Room-based subscriptions (marketplace, wallet:<address>, rarity:<tier>)
  - Safe broadcast functions (no-op when no clients connected)
  - Connection tracking and room membership introspection
  - On-demand marketplace data via get_marketplace event
"""

from __future__ import annotations

import logging
from typing import Any

from flask import Flask
from flask_socketio import SocketIO, join_room, leave_room, rooms as socketio_rooms

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level SocketIO instance (set by init_socketio)
# ---------------------------------------------------------------------------

socketio: SocketIO | None = None

# ---------------------------------------------------------------------------
# Event type constants
# ---------------------------------------------------------------------------

EVENT_ASSET_MINTED = "asset_minted"
EVENT_ASSET_LISTED = "asset_listed"
EVENT_ASSET_SOLD = "asset_sold"
EVENT_ASSET_CANCELLED = "asset_cancelled"
EVENT_PRICE_UPDATE = "price_update"

# ---------------------------------------------------------------------------
# Connection tracking
# ---------------------------------------------------------------------------

# Set of connected SIDs
_connected_sids: set[str] = set()


def get_connection_count() -> int:
    """Return the number of currently connected WebSocket clients."""
    return len(_connected_sids)


def get_room_memberships() -> dict[str, list[str]]:
    """
    Return a mapping of room name → list of SIDs in that room.

    Only includes rooms that are subscription-based (marketplace, wallet:*, rarity:*).
    """
    if socketio is None:
        return {}

    membership: dict[str, list[str]] = {}
    all_rooms = socketio.server.manager.rooms.get("/", {})
    for room_name, sid_set in all_rooms.items():
        # Skip the default room (same as SID) — only include named rooms
        if room_name.startswith("marketplace") or room_name.startswith("wallet:") or room_name.startswith("rarity:"):
            membership[room_name] = list(sid_set)
    return membership


# ---------------------------------------------------------------------------
# SocketIO initialisation
# ---------------------------------------------------------------------------

def init_socketio(app: Flask) -> SocketIO:
    """
    Create and configure a SocketIO instance bound to *app*.

    Returns:
        The initialised SocketIO instance (also stored as module-level ``socketio``).
    """
    global socketio

    sio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
    socketio = sio

    # ── Connection handlers ────────────────────────────────────────────────

    @sio.on("connect")
    def on_connect() -> None:
        """Handle a new WebSocket connection."""
        from flask import request as _req
        sid = _req.sid
        _connected_sids.add(sid)
        logger.info("WS client connected: %s (total: %d)", sid, len(_connected_sids))

    @sio.on("disconnect")
    def on_disconnect() -> None:
        """Handle a WebSocket disconnection — clean up tracking."""
        from flask import request as _req
        sid = _req.sid
        _connected_sids.discard(sid)
        logger.info("WS client disconnected: %s (total: %d)", sid, len(_connected_sids))

    # ── Room subscription handlers ─────────────────────────────────────────

    @sio.on("subscribe")
    def on_subscribe(data: dict[str, Any] | None = None) -> None:
        """
        Join a room for targeted event delivery.

        Expected payload: { "room": "marketplace" | "wallet:<address>" | "rarity:<tier>" }
        """
        from flask import request as _req
        data = data or {}
        room = str(data.get("room", "")).strip()
        if not room:
            logger.warning("subscribe called without a room by SID %s", _req.sid)
            return
        join_room(room)
        logger.info("SID %s joined room: %s", _req.sid, room)

    @sio.on("unsubscribe")
    def on_unsubscribe(data: dict[str, Any] | None = None) -> None:
        """
        Leave a previously joined room.

        Expected payload: { "room": "marketplace" | "wallet:<address>" | "rarity:<tier>" }
        """
        from flask import request as _req
        data = data or {}
        room = str(data.get("room", "")).strip()
        if not room:
            logger.warning("unsubscribe called without a room by SID %s", _req.sid)
            return
        leave_room(room)
        logger.info("SID %s left room: %s", _req.sid, room)

    # ── On-demand data ────────────────────────────────────────────────────

    @sio.on("get_marketplace")
    def on_get_marketplace() -> dict[str, Any]:
        """
        Return current marketplace data on demand.

        Uses ``app.config["DESHOP_STORE"]`` to fetch live data.
        """
        from flask import request as _req
        store = app.config.get("DESHOP_STORE")
        if store is None:
            return {"marketplace": [], "sales": []}
        try:
            return {"marketplace": store.marketplace(), "sales": store.sales[:20]}
        except Exception as exc:
            logger.error("Error fetching marketplace for WS client %s: %s", _req.sid, exc)
            return {"marketplace": [], "sales": [], "error": str(exc)}

    return sio


# ---------------------------------------------------------------------------
# Broadcast helpers (safe no-ops when no clients connected)
# ---------------------------------------------------------------------------

def broadcast_mint(asset_data: dict[str, Any]) -> None:
    """
    Broadcast an asset_minted event to marketplace, wallet, and rarity rooms.

    Emitting is a no-op when ``socketio`` is not initialised or no clients exist.
    """
    if socketio is None or get_connection_count() == 0:
        return

    wallet = asset_data.get("owner_wallet", asset_data.get("wallet", ""))
    rarity = asset_data.get("rarity", "")

    socketio.emit(EVENT_ASSET_MINTED, asset_data, room="marketplace")
    if wallet:
        socketio.emit(EVENT_ASSET_MINTED, asset_data, room=f"wallet:{wallet}")
    if rarity:
        socketio.emit(EVENT_ASSET_MINTED, asset_data, room=f"rarity:{rarity}")

    logger.info("Broadcast mint: asset_id=%s", asset_data.get("id"))


def broadcast_list(asset_data: dict[str, Any]) -> None:
    """
    Broadcast asset_listed and marketplace_update events.

    Emitting is a no-op when ``socketio`` is not initialised or no clients exist.
    """
    if socketio is None or get_connection_count() == 0:
        return

    wallet = asset_data.get("owner_wallet", asset_data.get("wallet", ""))
    rarity = asset_data.get("rarity", "")

    socketio.emit(EVENT_ASSET_LISTED, asset_data, room="marketplace")
    socketio.emit("marketplace_update", asset_data, room="marketplace")
    if wallet:
        socketio.emit(EVENT_ASSET_LISTED, asset_data, room=f"wallet:{wallet}")
    if rarity:
        socketio.emit(EVENT_ASSET_LISTED, asset_data, room=f"rarity:{rarity}")

    logger.info("Broadcast list: asset_id=%s", asset_data.get("id"))


def broadcast_buy(sale_data: dict[str, Any]) -> None:
    """
    Broadcast asset_sold and marketplace_update events.

    Emitting is a no-op when ``socketio`` is not initialised or no clients exist.
    """
    if socketio is None or get_connection_count() == 0:
        return

    socketio.emit(EVENT_ASSET_SOLD, sale_data, room="marketplace")
    socketio.emit("marketplace_update", sale_data, room="marketplace")

    # Also notify the buyer and seller wallet rooms if present
    sale = sale_data.get("sale", sale_data)
    buyer = sale.get("buyer_wallet", "")
    seller = sale.get("seller_wallet", sale.get("owner_wallet", ""))
    if buyer:
        socketio.emit(EVENT_ASSET_SOLD, sale_data, room=f"wallet:{buyer}")
    if seller:
        socketio.emit(EVENT_ASSET_SOLD, sale_data, room=f"wallet:{seller}")

    logger.info("Broadcast buy: asset_id=%s", sale_data.get("asset_id", sale_data.get("id")))


def broadcast_cancel(asset_data: dict[str, Any]) -> None:
    """
    Broadcast asset_cancelled and marketplace_update events.

    Emitting is a no-op when ``socketio`` is not initialised or no clients exist.
    """
    if socketio is None or get_connection_count() == 0:
        return

    wallet = asset_data.get("owner_wallet", asset_data.get("wallet", ""))
    rarity = asset_data.get("rarity", "")

    socketio.emit(EVENT_ASSET_CANCELLED, asset_data, room="marketplace")
    socketio.emit("marketplace_update", asset_data, room="marketplace")
    if wallet:
        socketio.emit(EVENT_ASSET_CANCELLED, asset_data, room=f"wallet:{wallet}")
    if rarity:
        socketio.emit(EVENT_ASSET_CANCELLED, asset_data, room=f"rarity:{rarity}")

    logger.info("Broadcast cancel: asset_id=%s", asset_data.get("id"))


def broadcast_price_update(price_data: dict[str, Any]) -> None:
    """
    Broadcast a price_update event to the marketplace room.

    Emitting is a no-op when ``socketio`` is not initialised or no clients exist.
    """
    if socketio is None or get_connection_count() == 0:
        return

    socketio.emit(EVENT_PRICE_UPDATE, price_data, room="marketplace")
    logger.info("Broadcast price_update: %s", price_data.get("name", "unknown"))
