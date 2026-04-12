# De-Shop SDK Full Demo

## Project Structure

```text
projects/
  de-shop-sdk-contracts/
    smart_contracts/deshopsdk/contract.py
  de-shop-sdk-backend/
    app.py
    requirements.txt
    deshop_backend/
      ai_pricing.py
      blockchain.py
      store.py
  de-shop-sdk-frontend/
    src/
      App.tsx
      sdk/DeShopSDK.ts
      components/
        TerminalConsole.tsx
        GameSimulation.tsx
      styles/App.css
```

## Run Backend

```bash
cd projects/de-shop-sdk-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Optional real Algorand mode (otherwise mock mode is automatic):

```bash
export ALGOD_SERVER="https://testnet-api.algonode.cloud"
export ALGOD_TOKEN=""
export MARKETPLACE_MNEMONIC="your 25-word mnemonic"
python app.py
```

## Run Frontend

```bash
cd projects/de-shop-sdk-frontend
npm install
VITE_BACKEND_URL=http://localhost:5000 npm run dev
```

## Demo Flow

```text
connect-wallet player1
mint-skin NeonVandal legendary
view-inventory
list-item 1 auto
connect-wallet player2
view-market
buy-item 1
view-inventory
apply-skin 1
```
