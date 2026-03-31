import React, { useState, useEffect } from 'react';
import { PeraWalletConnect } from "@perawallet/connect";
import { 
  Gamepad2, 
  Wallet, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Store, 
  Zap,
  ChevronRight,
  Code,
  ArrowLeft,
  CheckCircle2,
  Box,
  Fingerprint
} from 'lucide-react';
import './index.css';

// Initialize Pera Wallet Instance
const peraWallet = new PeraWalletConnect({
  shouldShowSignTxnToast: true
});

function App() {
  // Navigation State
  const [currentPage, setCurrentPage] = useState('home');

  // Wallet State
  const [accountAddress, setAccountAddress] = useState(null);
  
  // AI Pricing State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [priceData, setPriceData] = useState(null);
  
  // Demo SDK States
  const [isMinting, setIsMinting] = useState(false);
  const [mintedItem, setMintedItem] = useState(null);

  useEffect(() => {
    // Check if there is a cached Pera Wallet session
    peraWallet.reconnectSession().then((accounts) => {
      peraWallet.connector?.on("disconnect", handleDisconnectWallet);
      if (accounts.length) {
        setAccountAddress(accounts[0]);
      }
    }).catch(e => console.error("Pera Wallet Session Error:", e));
  }, []);

  const handleConnectWallet = async () => {
    try {
      const newAccounts = await peraWallet.connect();
      peraWallet.connector?.on("disconnect", handleDisconnectWallet);
      setAccountAddress(newAccounts[0]);
    } catch (error) {
      if (error?.data?.type !== "SESSION_CONNECT") {
        console.error("Connection Failed:", error);
      }
    }
  };

  const handleDisconnectWallet = () => {
    peraWallet.disconnect();
    setAccountAddress(null);
  };

  const runAIPricing = () => {
    setIsAnalyzing(true);
    setPriceData(null);
    setTimeout(() => {
      setIsAnalyzing(false);
      setPriceData({ price: 120, currency: 'ALGO', confidence: 87, trend: 'Rising ↑' });
    }, 1500);
  };

  const simulateSDKMint = () => {
    setIsMinting(true);
    setTimeout(() => {
      setIsMinting(false);
      setMintedItem({
        id: "nft_" + Math.random().toString(36).substr(2, 9),
        name: "Dragon Slayer Sword",
        rarity: "Legendary"
      });
    }, 2000);
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="app-container">
      {/* Navbar common to both views */}
      <nav className="navbar fade-in">
        <div className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => setCurrentPage('home')}>
          <Gamepad2 className="logo-icon" />
          De-Shop SDK
        </div>
        <div>
          {!accountAddress ? (
            <button className="btn-secondary" onClick={handleConnectWallet}>
              <Wallet size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
              Connect Pera Wallet
            </button>
          ) : (
            <div className="badge badge-legendary tooltip-container" style={{ padding: '8px 16px', fontSize: '0.9rem', cursor: 'pointer' }} onClick={handleDisconnectWallet}>
              <span style={{ marginRight: '8px', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00ffcc', boxShadow: '0 0 8px #00ffcc' }}></span>
              {formatAddress(accountAddress)}
              <span className="tooltip-text" style={{ fontSize: '0.7rem' }}>Click to disconnect</span>
            </div>
          )}
        </div>
      </nav>

      {/* HOME PAGE VIEW */}
      {currentPage === 'home' && (
        <>
          <section className="hero fade-in delay-1">
            <h1>AI + Blockchain Powered<br/>In-Game Marketplace</h1>
            <p>
              De-Shop SDK enables game developers to embed autonomous, truly decentralized, 
              and AI-driven NFT marketplaces directly into their games.
            </p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => setCurrentPage('demo')}>
                Get Started & Demo <ChevronRight size={18} />
              </button>
              <button className="btn-secondary">
                <Code size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                View Documentation
              </button>
            </div>
          </section>

          <div className="dashboard-grid fade-in delay-2">
            
            {/* AI Smart Pricing Demo */}
            <div className="glass-panel">
              <div className="card-header">
                <Sparkles color="#00ffcc" />
                <h2 className="card-title">AI Smart Pricing Engine</h2>
              </div>
              <div className="card-body">
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                  Our AI intelligence layer continuously analyzes marketplace activity, item demand, 
                  and trade history to suggest optimal pricing and maintain economic balance.
                </p>

                <div className="item-preview">
                  <div className="item-image">⚔️</div>
                  <div className="item-info">
                    <h3>Dragon Slayer Sword</h3>
                    <span className="badge badge-legendary">Legendary</span>
                    <div className="item-stats">
                      <div className="stat-box"><TrendingUp size={14} /> <strong>ATK:</strong> 150</div>
                      <div className="stat-box"><Zap size={14} /> <strong>Fire</strong></div>
                    </div>
                  </div>
                </div>

                {priceData ? (
                  <div className="ai-results fade-in">
                    <div className="price-display">
                      <div>
                        <div className="price-label">Recommended Price</div>
                        <div className="price-value">
                          {priceData.price} <span className="price-currency">{priceData.currency}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="price-label">Market Trend</div>
                        <div style={{ color: '#00ffcc', fontWeight: 'bold' }}>{priceData.trend}</div>
                      </div>
                    </div>
                    
                    <div className="confidence-bar-container">
                      <div className="confidence-bar" style={{ width: `${priceData.confidence}%` }}></div>
                    </div>
                    <div className="confidence-text">
                      <span>AI Confidence Score</span>
                      <span>{priceData.confidence}%</span>
                    </div>
                  </div>
                ) : (
                  <button 
                    className={`btn-primary ${isAnalyzing ? 'pulse-anim' : ''}`} 
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={runAIPricing}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? <><Cpu className="pulse-anim" /> Analyzing Market Data...</> : <><Cpu /> Run AI Price Analysis</>}
                  </button>
                )}
              </div>
            </div>

            {/* Features/Marketplace Capabilities */}
            <div className="glass-panel">
              <div className="card-header">
                <Store color="#d18cff" />
                <h2 className="card-title">SDK Capabilities</h2>
              </div>
              <div className="card-body">
                <div className="feature-list">
                  <div className="feature-item">
                    <div className="feature-icon" style={{ color: '#00ffcc', background: 'rgba(0,255,204,0.1)' }}><TrendingUp size={24} /></div>
                    <div className="feature-content">
                      <h4>True Digital Ownership</h4>
                      <p>Players gain permanent, transferable ownership of their in-game items as NFTs with instant Algorand finality.</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon"><ShieldCheck size={24} /></div>
                    <div className="feature-content">
                      <h4>AI Fraud Detection</h4>
                      <p>Real-time monitoring detects wash trading, bot manipulation, and maintains a balanced game economy.</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon" style={{ color: '#ff9900', background: 'rgba(255,153,0,0.1)' }}><Zap size={24} /></div>
                    <div className="feature-content">
                      <h4>Developer Royalties</h4>
                      <p>Automated, seamless distribution of creator royalties on all secondary P2P trading directly through smart contracts.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DEMO PAGE VIEW */}
      {currentPage === 'demo' && (
        <div className="fade-in">
          <button className="btn-secondary" style={{ marginBottom: '32px', border: 'none', background: 'transparent' }} onClick={() => setCurrentPage('home')}>
            <ArrowLeft size={18} style={{ marginRight: '8px' }}/> Back to Home
          </button>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>SDK Interactive Lab</h1>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
              Experience exactly how game developers interact with De-Shop SDK to build robust in-game economies using Algorand.
            </p>
          </div>

          <div className="dashboard-grid">
            
            {/* Step 1: Wallet Connection */}
            <div className="glass-panel">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: accountAddress ? 'rgba(0,255,204,0.2)' : 'rgba(255,255,255,0.1)', color: accountAddress ? '#00ffcc' : 'white', fontWeight: 'bold', marginRight: '16px' }}>1</div>
                <h2 className="card-title">Authenticate Player</h2>
              </div>
              <div className="card-body">
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  The SDK handles seamless connections to the Algorand blockchain. We've integrated the official Pera Wallet here.
                </p>
                
                {accountAddress ? (
                  <div className="feature-item" style={{ borderColor: '#00ffcc', background: 'rgba(0,255,204,0.05)' }}>
                    <div className="feature-icon" style={{ background: 'transparent', color: '#00ffcc' }}><CheckCircle2 size={32} /></div>
                    <div className="feature-content">
                      <h4 style={{ color: '#00ffcc' }}>Pera Wallet Connected</h4>
                      <p>Active Address: <strong style={{color: 'white'}}>{formatAddress(accountAddress)}</strong></p>
                    </div>
                  </div>
                ) : (
                  <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleConnectWallet}>
                    <Fingerprint /> Connect Pera Wallet
                  </button>
                )}

                <div className="code-block" style={{ marginTop: '24px' }}>
                  <span className="code-comment">// Connect to player wallet securely</span><br />
                  <span className="code-keyword">const</span> deShop = <span className="code-keyword">new</span> DeShop({'{'} network: <span className="code-string">"testnet"</span> {'}'});<br/>
                  <span className="code-keyword">await</span> deShop.<span className="code-function">connectWallet</span>();
                </div>
              </div>
            </div>

            {/* Step 2: Minting Engine */}
            <div className="glass-panel" style={{ opacity: accountAddress ? 1 : 0.5, pointerEvents: accountAddress ? 'auto' : 'none' }}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: mintedItem ? 'rgba(138,43,226,0.2)' : 'rgba(255,255,255,0.1)', color: mintedItem ? '#d18cff' : 'white', fontWeight: 'bold', marginRight: '16px' }}>2</div>
                <h2 className="card-title">Mint In-Game Item as NFT</h2>
              </div>
              <div className="card-body">
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Once a player completes a quest or buys an item, game developers can easily mint the item directly to the player's wallet.
                </p>

                {mintedItem ? (
                  <div className="feature-item fade-in" style={{ borderColor: '#d18cff', background: 'rgba(138,43,226,0.05)' }}>
                    <div className="item-image" style={{ width: '60px', height: '60px', fontSize: '1.5rem', margin: '0 16px 0 0' }}>⚔️</div>
                    <div className="feature-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h4 style={{ color: '#d18cff', marginBottom: '4px' }}>Minting Successful!</h4>
                      <p>Asset ID: <span style={{ color: 'white', fontFamily: 'monospace' }}>{mintedItem.id}</span></p>
                      <span className="badge badge-epic" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>{mintedItem.rarity}</span>
                    </div>
                  </div>
                ) : (
                  <button 
                    className={`btn-primary ${isMinting ? 'pulse-anim' : ''}`} 
                    style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #d18cff, #8a2be2)' }} 
                    onClick={simulateSDKMint}
                    disabled={isMinting || !accountAddress}
                  >
                    {isMinting ? <><Box className="pulse-anim" /> Minting Asset on Algorand...</> : <><Box /> Mint "Dragon Slayer Sword"</>}
                  </button>
                )}

                {!accountAddress && <p style={{ color: '#ffb8b8', fontSize: '0.85rem', marginTop: '12px', textAlign: 'center' }}>⚠️ Connect wallet first to mint an item</p>}

                <div className="code-block" style={{ marginTop: '24px' }}>
                  <span className="code-comment">// Mint NFT with zero friction</span><br />
                  <span className="code-keyword">const</span> nft = <span className="code-keyword">await</span> deShop.<span className="code-function">mintNFT</span>({'{'}<br/>
                  &nbsp;&nbsp;assetName: <span className="code-string">"Dragon Slayer Sword"</span>,<br/>
                  &nbsp;&nbsp;metadata: {'{'} rarity: <span className="code-string">"Legendary"</span>, damage: <span className="code-keyword">150</span> {'}'},<br/>
                  &nbsp;&nbsp;royalty: <span className="code-keyword">5.0</span><br/>
                  {'}'});
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
