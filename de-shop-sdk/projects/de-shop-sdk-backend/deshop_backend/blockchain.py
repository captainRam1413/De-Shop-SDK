from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from algosdk import mnemonic
from algosdk.v2client import algod


@dataclass
class AlgorandAdapter:
    enabled: bool
    algod_client: algod.AlgodClient | None
    sender_address: str | None

    @classmethod
    def from_env(cls) -> "AlgorandAdapter":
        token = os.getenv("ALGOD_TOKEN", "")
        server = os.getenv("ALGOD_SERVER", "")
        sender_mnemonic = os.getenv("MARKETPLACE_MNEMONIC", "")

        if not token or not server or not sender_mnemonic:
            return cls(enabled=False, algod_client=None, sender_address=None)

        try:
            sender_address = mnemonic.to_public_key(sender_mnemonic)
            client = algod.AlgodClient(algod_token=token, algod_address=server)
            return cls(enabled=True, algod_client=client, sender_address=sender_address)
        except Exception:
            return cls(enabled=False, algod_client=None, sender_address=None)

    def health(self) -> dict[str, Any]:
        if not self.enabled or self.algod_client is None:
            return {"mode": "mock", "status": "ready"}
        try:
            status = self.algod_client.status()
            return {
                "mode": "testnet",
                "status": "ready",
                "last_round": status.get("last-round"),
                "sender": self.sender_address,
            }
        except Exception:
            return {"mode": "mock", "status": "fallback"}
