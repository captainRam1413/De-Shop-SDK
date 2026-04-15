import algokit_utils
from algokit_utils import AlgorandClient, PaymentParams, AlgoAmount
import os
from dotenv import load_dotenv

# Load from contracts dir
load_dotenv(".env.TestNet")

client = AlgorandClient.from_environment()
deployer = client.account.from_environment("DEPLOYER")
contract_addr = "ASXQPD7RIEJJJKQV6G5H2H34AUGV2CAWPKNWUT4ZITHJJMVBMIJYVMIA2E"

print(f"Funding contract {contract_addr} from {deployer.address}...")

res = client.send.payment(
    PaymentParams(
        sender=deployer.address,
        receiver=contract_addr,
        amount=AlgoAmount(algo=0.5) # 0.5 ALGO buffer
    )
)

print(f"Success! Txn ID: {res.transaction.get_txid()}")
