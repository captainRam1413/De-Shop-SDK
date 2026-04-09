import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import {
  ArrowRightLeft,
  Box,
  Coins,
  Gamepad2,
  Layers,
  Plus,
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  Store,
  Wallet,
} from 'lucide-react';
import { fetchAssets, mintAsset } from './api';
import './index.css';

const peraWallet = new PeraWalletConnect({
  shouldShowSignTxnToast: true,
});

const demoAssets = [
  {
    id: 'asset-ember-01',
    name: 'Ember Drake Blade',
    image: '⚔️',
    rarity: 'Legendary',
    price: 120,
    currency: 'ALGO',
    owner: 'marketplace',
    listed: true,
    attributes: { element: 'Fire', attack: 150 },
  },
  {
    id: 'asset-veil-02',
    name: 'Spectral Veil',
    image: '🛡️',
    rarity: 'Epic',
    price: 62,
    currency: 'ALGO',
    owner: 'marketplace',
    listed: true,
    attributes: { defense: 90, origin: 'Nightfall' },
  },
  {
    id: 'asset-echo-03',
    name: 'Echostep Boots',
    image: '👢',
    rarity: 'Rare',
    price: 28,
    currency: 'ALGO',
    owner: 'demo-wallet',
    listed: false,
    attributes: { speed: '+18%', class: 'Rogue' },
  },
];

const navItems = [
  { id: 'login', label: 'Login', icon: Wallet },
  { id: 'inventory', label: 'Inventory', icon: Box },
  { id: 'marketplace', label: 'Marketplace', icon: Store },
];

const payments = ['ALGO', 'ETH', 'USDT'];

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [wallet, setWallet] = useState({ address: null, mode: 'none' });
  const [walletError, setWalletError] = useState('');
  const [assets, setAssets] = useState(demoAssets);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [paymentCurrency, setPaymentCurrency] = useState('ALGO');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [apiError, setApiError] = useState('');
  const [minting, setMinting] = useState(false);
  const [equippedAssetId, setEquippedAssetId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  const accountAddress = wallet.address;
  const isConnected = Boolean(accountAddress);

  const handleDisconnectWallet = useCallback(() => {
    peraWallet.disconnect();
    setWallet({ address: null, mode: 'none' });
  }, []);

  useEffect(() => {
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        if (accounts.length) {
          setWallet({ address: accounts[0], mode: 'pera' });
          setWalletError('');
        }
      })
      .catch(() => {});
    peraWallet.connector?.on('disconnect', handleDisconnectWallet);
  }, [handleDisconnectWallet]);

  const loadAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const items = await fetchAssets();
      if (items.length) {
        setAssets(items);
      } else {
        setAssets(demoAssets);
      }
      setApiError('');
    } catch {
      setApiError('Backend unavailable — showing demo assets.');
      setAssets(demoAssets);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleConnectWallet = async () => {
    setWalletError('');
    try {
      const newAccounts = await peraWallet.connect();
      peraWallet.connector?.on('disconnect', handleDisconnectWallet);
      setWallet({ address: newAccounts[0], mode: 'pera' });
    } catch {
      setWalletError('Pera Wallet unavailable. Use the mock wallet to continue.');
    }
  };

  const handleConnectMockWallet = () => {
    const mockAddressSeed = (() => {
      if (typeof crypto !== 'undefined') {
        if (crypto.randomUUID) {
          return crypto.randomUUID();
        }
        if (crypto.getRandomValues) {
          const buffer = new Uint8Array(16);
          crypto.getRandomValues(buffer);
          return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
        }
      }
      return `${Date.now()}`;
    })();
    const mockAddress = `MOCK-${mockAddressSeed.slice(0, 8).toUpperCase()}`;
    setWallet({ address: mockAddress, mode: 'mock' });
    setWalletError('');
  };

  const formatAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const ownedAssets = useMemo(() => {
    if (!isConnected) {
      return [];
    }
    return assets.filter((asset) => {
      if (wallet.mode === 'mock') {
        return asset.owner === 'demo-wallet' || asset.owner === accountAddress;
      }
      return asset.owner === accountAddress;
    });
  }, [accountAddress, assets, isConnected, wallet.mode]);

  const marketplaceAssets = useMemo(
    () => assets.filter((asset) => asset.listed),
    [assets],
  );

  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    setCurrentPage('asset');
    setActionMessage('');
  };

  const handleMintAsset = async () => {
    if (!isConnected) {
      setWalletError('Connect a wallet to mint assets.');
      return;
    }
    setMinting(true);
    setActionMessage('');
    try {
      const minted = await mintAsset({
        name: 'Dragon Slayer Sword',
        image: '⚔️',
        rarity: 'Legendary',
        price: 120,
        currency: paymentCurrency,
        owner: wallet.mode === 'mock' ? 'demo-wallet' : accountAddress,
        listed: false,
        attributes: { attack: 150, element: 'Fire' },
      });
      setAssets((prev) => [...prev, minted]);
      setSelectedAsset(minted);
      setCurrentPage('asset');
      setActionMessage(`Minted on ${minted.mint_mode === 'algorand' ? 'Algorand TestNet' : 'mock mode'}.`);
    } catch {
      setActionMessage('Minting failed — backend unavailable.');
    } finally {
      setMinting(false);
    }
  };

  const handleToggleListing = (asset) => {
    setAssets((prev) =>
      prev.map((item) =>
        item.id === asset.id ? { ...item, listed: !item.listed } : item,
      ),
    );
    setActionMessage(
      asset.listed ? 'Listing removed from marketplace.' : 'Item listed in marketplace.',
    );
  };

  const handleEquipAsset = (asset) => {
    setEquippedAssetId(asset.id);
    setActionMessage(`${asset.name} equipped.`);
  };

  const handleTransferAsset = (asset) => {
    setActionMessage(`${asset.name} transfer request queued.`);
  };

  const handleBuyAsset = (asset) => {
    setActionMessage(`Purchase initiated in ${paymentCurrency}.`);
    setAssets((prev) =>
      prev.map((item) =>
        item.id === asset.id
          ? { ...item, owner: accountAddress || 'demo-wallet', listed: false }
          : item,
      ),
    );
  };

  const renderAssetImage = (asset) => {
    if (!asset.image) {
      return '🎮';
    }
    if (asset.image.startsWith('http')) {
      return <img src={asset.image} alt={asset.name} />;
    }
    return <span>{asset.image}</span>;
  };

  return (
    <div className="app-container">
      <nav className="navbar fade-in">
        <div className="navbar-brand" onClick={() => setCurrentPage('login')}>
          <Gamepad2 className="logo-icon" />
          De-Shop SDK
        </div>
        <div className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => setCurrentPage(item.id)}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="wallet-display">
          {!isConnected ? (
            <button className="btn-secondary" onClick={handleConnectWallet}>
              <Wallet size={18} />
              Connect Pera Wallet
            </button>
          ) : (
            <button className="badge badge-legendary wallet-pill" onClick={handleDisconnectWallet}>
              <span className="wallet-indicator" />
              {formatAddress(accountAddress)}
              <span className="wallet-mode">{wallet.mode.toUpperCase()}</span>
            </button>
          )}
        </div>
      </nav>

      {apiError && <div className="status-banner">{apiError}</div>}

      {currentPage === 'login' && (
        <section className="page-section fade-in">
          <div className="page-header">
            <h1>Connect your wallet</h1>
            <p>Authenticate players, mint NFTs, and trade assets on Algorand TestNet.</p>
          </div>
          <div className="dashboard-grid">
            <div className="glass-panel">
              <div className="card-header">
                <Wallet />
                <h2 className="card-title">Pera Wallet</h2>
              </div>
              <div className="card-body">
                <p className="muted-text">
                  Use Pera Wallet to connect to Algorand TestNet with production-like flows.
                </p>
                <button className="btn-primary full-width" onClick={handleConnectWallet}>
                  <Wallet size={18} /> Connect Pera Wallet
                </button>
                <div className="info-card">
                  <ShieldCheck size={18} />
                  Non-custodial wallet authentication with on-chain signing.
                </div>
              </div>
            </div>
            <div className="glass-panel">
              <div className="card-header">
                <Layers />
                <h2 className="card-title">Mock Wallet</h2>
              </div>
              <div className="card-body">
                <p className="muted-text">
                  Keep the demo running even without a wallet extension or mobile device.
                </p>
                <button className="btn-secondary full-width" onClick={handleConnectMockWallet}>
                  <Sparkles size={18} /> Connect Mock Wallet
                </button>
                {walletError && <p className="error-text">{walletError}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {currentPage === 'inventory' && (
        <section className="page-section fade-in">
          <div className="page-header">
            <h1>Your Inventory</h1>
            <p>Mint, equip, and manage the assets tied to your wallet.</p>
          </div>
          <div className="inventory-actions">
            <button className="btn-primary" onClick={handleMintAsset} disabled={!isConnected || minting}>
              <Plus size={18} />
              {minting ? 'Minting on Algorand...' : 'Mint Asset'}
            </button>
            <div className="inline-note">
              <Coins size={16} />
              Minted items land directly in your wallet.
            </div>
          </div>
          {!isConnected && (
            <div className="info-banner">
              Connect a wallet to view inventory assets.
            </div>
          )}
          <div className="nft-grid">
            {loadingAssets && <div className="glass-panel nft-card">Loading assets...</div>}
            {!loadingAssets && ownedAssets.length === 0 && isConnected && (
              <div className="glass-panel empty-card">
                <p>No items yet. Mint your first NFT to get started.</p>
              </div>
            )}
            {ownedAssets.map((asset) => (
              <div key={asset.id} className="glass-panel nft-card">
                <div className="nft-card-media">{renderAssetImage(asset)}</div>
                <div className="nft-card-body">
                  <h3>{asset.name}</h3>
                  <div className="nft-card-meta">
                    <span className={`badge badge-${asset.rarity.toLowerCase()}`}>{asset.rarity}</span>
                    {equippedAssetId === asset.id && <span className="badge badge-equipped">Equipped</span>}
                  </div>
                  <div className="nft-card-footer">
                    <button className="btn-secondary small" onClick={() => handleEquipAsset(asset)}>
                      Equip
                    </button>
                    <button className="btn-secondary small" onClick={() => handleSelectAsset(asset)}>
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {currentPage === 'marketplace' && (
        <section className="page-section fade-in">
          <div className="page-header">
            <h1>Marketplace</h1>
            <p>Browse and trade rare assets listed by other players.</p>
          </div>
          <div className="payment-selector">
            <span>Pay with</span>
            <div className="pill-group">
              {payments.map((currency) => (
                <button
                  key={currency}
                  className={`pill ${paymentCurrency === currency ? 'active' : ''}`}
                  onClick={() => setPaymentCurrency(currency)}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
          <div className="nft-grid">
            {marketplaceAssets.map((asset) => (
              <div key={asset.id} className="glass-panel nft-card">
                <div className="nft-card-media">{renderAssetImage(asset)}</div>
                <div className="nft-card-body">
                  <h3>{asset.name}</h3>
                  <div className="nft-card-meta">
                    <span className={`badge badge-${asset.rarity.toLowerCase()}`}>{asset.rarity}</span>
                    <span className="price-tag">
                      {asset.price} {asset.currency}
                    </span>
                  </div>
                  <div className="nft-card-footer">
                    <button className="btn-primary small" onClick={() => handleBuyAsset(asset)}>
                      <ShoppingCart size={16} /> Buy
                    </button>
                    <button className="btn-secondary small" onClick={() => handleSelectAsset(asset)}>
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {currentPage === 'asset' && (
        <section className="page-section fade-in">
          <div className="page-header">
            <h1>Asset Detail</h1>
            <p>Preview, equip, or trade this NFT.</p>
          </div>
          {!selectedAsset ? (
            <div className="glass-panel empty-card">
              <p>Select an asset from inventory or marketplace.</p>
            </div>
          ) : (
            <div className="asset-detail">
              <div className="glass-panel asset-preview">
                <div className="asset-preview-media">{renderAssetImage(selectedAsset)}</div>
                <div className="asset-preview-info">
                  <h2>{selectedAsset.name}</h2>
                  <div className="asset-tags">
                    <span className={`badge badge-${selectedAsset.rarity.toLowerCase()}`}>
                      {selectedAsset.rarity}
                    </span>
                    {selectedAsset.listed && <span className="badge badge-listed">Listed</span>}
                  </div>
                  <p className="muted-text">
                    Owned by: {selectedAsset.owner}
                  </p>
                  <div className="attribute-grid">
                    {Object.entries(selectedAsset.attributes || {}).map(([key, value]) => (
                      <div key={key} className="attribute-card">
                        <span>{key}</span>
                        <strong>{String(value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="glass-panel asset-actions">
                <h3>Actions</h3>
                <div className="payment-selector">
                  <span>Payment</span>
                  <div className="pill-group">
                    {payments.map((currency) => (
                      <button
                        key={currency}
                        className={`pill ${paymentCurrency === currency ? 'active' : ''}`}
                        onClick={() => setPaymentCurrency(currency)}
                      >
                        {currency}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="action-grid">
                  <button className="btn-primary" onClick={() => handleBuyAsset(selectedAsset)}>
                    <ShoppingCart size={18} /> Buy
                  </button>
                  <button className="btn-secondary" onClick={() => handleToggleListing(selectedAsset)}>
                    <Store size={18} /> {selectedAsset.listed ? 'Unlist' : 'Sell'}
                  </button>
                  <button className="btn-secondary" onClick={() => handleTransferAsset(selectedAsset)}>
                    <ArrowRightLeft size={18} /> Transfer
                  </button>
                  <button className="btn-secondary" onClick={() => handleEquipAsset(selectedAsset)}>
                    <Box size={18} /> Equip
                  </button>
                </div>
                {actionMessage && <p className="action-message">{actionMessage}</p>}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default App;
