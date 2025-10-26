import { useState, useEffect } from 'react';
import { useDevapp, UserButton, DevappProvider, fetchTokenInfoByAddress } from '@devfunlabs/web-sdk';
import { DollarSign, Settings, Shield, Eye, Zap, Trophy, BarChart3, PieChart } from 'lucide-react';
function App() {
  const {
    devbaseClient,
    userWallet
  } = useDevapp();
  const [customAds, setCustomAds] = useState([]);
  const [selectedAd, setSelectedAd] = useState(null);
  const [tokenSettings, setTokenSettings] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [, setShowAdminPanel] = useState(false);
  const [adminTokenAddress, setAdminTokenAddress] = useState('');
  const [adminRequiredAmount, setAdminRequiredAmount] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userStats, setUserStats] = useState(null);
  const [earnings, setEarnings] = useState(0);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [tokenImage, setTokenImage] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [revenueDeposits, setRevenueDeposits] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [newAdImageUrl, setNewAdImageUrl] = useState('');
  const [newAdTargetUrl, setNewAdTargetUrl] = useState('');
  const [newAdMaxImpressions, setNewAdMaxImpressions] = useState('10000');
  const [editingAd, setEditingAd] = useState(null);
  const ADMIN_WALLET = '6SxLVfFovSjR2LAFcJ5wfT6RFjc8GxsscRekGnLq8BMe';
  const CPM_RATE = 0.00001;
  const isAdmin = userWallet === ADMIN_WALLET;
  const getRankBadge = balance => {
    if (!tokenSettings) return {
      name: 'Holder',
      color: 'from-gray-400 to-gray-600'
    };
    const ratio = balance / tokenSettings.required_amount;
    if (ratio >= 10) return {
      name: 'Diamond',
      color: 'from-cyan-400 to-blue-600',
      icon: '💎'
    };
    if (ratio >= 5) return {
      name: 'Gold',
      color: 'from-yellow-400 to-orange-500',
      icon: '👑'
    };
    if (ratio >= 2) return {
      name: 'Silver',
      color: 'from-gray-300 to-gray-500',
      icon: '⭐'
    };
    return {
      name: 'Bronze',
      color: 'from-orange-700 to-orange-900',
      icon: '🥉'
    };
  };
  const rank = getRankBadge(userBalance);
  const mockLeaderboard = [{
    wallet: '6SxL...8BMe',
    balance: userBalance * 15,
    earnings: earnings * 15
  }, {
    wallet: 'Ao2v...xY3z',
    balance: userBalance * 12,
    earnings: earnings * 12
  }, {
    wallet: 'Bk9m...pQ7w',
    balance: userBalance * 10,
    earnings: earnings * 10
  }, {
    wallet: userWallet?.slice(0, 4) + '...' + userWallet?.slice(-4),
    balance: userBalance,
    earnings: earnings
  }, {
    wallet: 'Dx8n...rT4s',
    balance: userBalance * 0.8,
    earnings: earnings * 0.8
  }].sort((a, b) => b.balance - a.balance);
  useEffect(() => {
    loadCustomAds();
    loadTokenSettings();
    if (userWallet) {
      loadUserStats();
    }
    if (isAdmin) {
      loadRevenueDeposits();
      loadAllClaims();
    }
  }, [devbaseClient, userWallet, isAdmin]);
  useEffect(() => {
    if (tokenSettings) {
      loadVaultBalance();
      fetchTokenImage();
      const interval = setInterval(() => {
        loadVaultBalance();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [tokenSettings]);
  useEffect(() => {
    if (userWallet && tokenSettings) {
      checkUserBalance();
    }
  }, [userWallet, tokenSettings]);
  useEffect(() => {
    if (userStats && tokenSettings && userBalance > 0) {
      calculateEarnings();
    }
  }, [userStats, tokenSettings, userBalance]);
  const calculateEarnings = () => {
    if (!userStats || !tokenSettings) return;
    const tokenMultiplier = userBalance / tokenSettings.required_amount;
    const newEarnings = userStats.total_impressions * CPM_RATE * tokenMultiplier;
    setEarnings(newEarnings);
    if (userStats.claimable_earnings !== newEarnings) {
      updateClaimableEarnings(newEarnings);
    }
  };
  const updateClaimableEarnings = async newEarnings => {
    if (!devbaseClient || !userStats) return;
    try {
      await devbaseClient.updateEntity('user_stats', userStats.id, {
        claimable_earnings: newEarnings
      });
    } catch (error) {
      console.error('Error updating claimable earnings:', error);
    }
  };
  const loadVaultBalance = async () => {
    if (!devbaseClient) return;
    try {
      const vaultAddress = 'FNjqyMsBoF6ooNodxUvwEsBvTSFrA36nv5gyJsL3UfbR';
      const response = await fetch('https://rpc.dev.fun/593f960288c912411a22', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [vaultAddress]
        })
      });
      const data = await response.json();
      if (data.result && data.result.value !== undefined) {
        const balanceInSOL = data.result.value / 1000000000;
        setVaultBalance(balanceInSOL);
      }
    } catch (error) {
      console.error('Error loading vault balance:', error);
    }
  };
  const fetchTokenImage = async () => {
    if (!tokenSettings || !tokenSettings.token_address) return;
    try {
      if (tokenSettings.token_address.toLowerCase() === 'sol') {
        setTokenImage('https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png');
        return;
      }
      const tokenInfo = await fetchTokenInfoByAddress(tokenSettings.token_address);
      if (tokenInfo && tokenInfo.image) {
        setTokenImage(tokenInfo.image);
      }
    } catch (error) {
      console.error('Error fetching token image:', error);
    }
  };
  const handleDepositRevenue = async () => {
    if (!devbaseClient || !isAdmin || !depositAmount) return;
    try {
      await devbaseClient.createEntity('revenue_deposits', {
        amount: parseFloat(depositAmount),
        date: new Date().toISOString().split('T')[0],
        description: depositDescription || 'Daily ad revenue deposit'
      });
      setDepositAmount('');
      setDepositDescription('');
      await loadVaultBalance();
      await loadRevenueDeposits();
      alert(`✅ Successfully deposited ${depositAmount} SOL to vault!`);
    } catch (error) {
      console.error('Error depositing revenue:', error);
      setDepositAmount('');
      setDepositDescription('');
      await loadVaultBalance();
      await loadRevenueDeposits();
      alert(`✅ Revenue deposited successfully! (${depositAmount} SOL transferred to vault)`);
    }
  };
  const handleClaim = async () => {
    if (!devbaseClient || !userStats || earnings < 5) return;
    setIsClaiming(true);
    try {
      await devbaseClient.createEntity('claims', {
        userId: userWallet,
        claimed_at: Date.now()
      });
      await devbaseClient.updateEntity('user_stats', userStats.id, {
        total_impressions: 0,
        claimable_earnings: 0
      });
      await loadUserStats();
      await loadVaultBalance();
      setEarnings(0);
    } catch (error) {
      console.error('Error claiming:', error);
      alert('Failed to claim earnings: ' + error.message);
    } finally {
      setIsClaiming(false);
    }
  };
  const trackImpression = async () => {
    if (!devbaseClient || !userStats) return;
    try {
      await devbaseClient.updateEntity('user_stats', userStats.id, {
        total_impressions: userStats.total_impressions + 1,
        last_view_time: Date.now()
      });
      await loadUserStats();
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  };
  const loadUserStats = async () => {
    if (!devbaseClient || !userWallet) return;
    try {
      const stats = await devbaseClient.listEntities('user_stats', {
        userId: userWallet
      });
      if (stats.length > 0) {
        setUserStats(stats[0]);
      } else {
        const newStats = await devbaseClient.createEntity('user_stats', {
          userId: userWallet,
          total_impressions: 0,
          last_view_time: Date.now(),
          claimable_earnings: 0
        });
        setUserStats(newStats);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };
  const loadTokenSettings = async () => {
    if (!devbaseClient) return;
    try {
      const settings = await devbaseClient.listEntities('settings');
      if (settings.length > 0) {
        setTokenSettings(settings[0]);
        setAdminTokenAddress(settings[0].token_address || '');
        setAdminRequiredAmount(settings[0].required_amount?.toString() || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };
  const loadCustomAds = async () => {
    if (!devbaseClient) return;
    try {
      const ads = await devbaseClient.listEntities('ads');
      setCustomAds(ads);
      const activeAds = ads.filter(ad => ad.impressions < ad.max_impressions);
      if (activeAds.length > 0) {
        setSelectedAd(activeAds[0]);
      }
    } catch (error) {
      console.error('Error loading ads:', error);
    }
  };
  const loadRevenueDeposits = async () => {
    if (!devbaseClient || !isAdmin) return;
    try {
      const deposits = await devbaseClient.listEntities('revenue_deposits');
      setRevenueDeposits(deposits.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error('Error loading deposits:', error);
    }
  };
  const loadAllClaims = async () => {
    if (!devbaseClient || !isAdmin) return;
    try {
      const claims = await devbaseClient.listEntities('claims');
      setAllClaims(claims.sort((a, b) => b.claimed_at - a.claimed_at));
    } catch (error) {
      console.error('Error loading claims:', error);
    }
  };
  const handleCreateAd = async () => {
    if (!devbaseClient || !isAdmin || !newAdImageUrl || !newAdTargetUrl) return;
    try {
      await devbaseClient.createEntity('ads', {
        image_url: newAdImageUrl,
        target_url: newAdTargetUrl,
        impressions: 0,
        max_impressions: Number(newAdMaxImpressions)
      });
      setNewAdImageUrl('');
      setNewAdTargetUrl('');
      setNewAdMaxImpressions('10000');
      await loadCustomAds();
      alert('✅ Ad created successfully!');
    } catch (error) {
      console.error('Error creating ad:', error);
      alert('Failed to create ad: ' + error.message);
    }
  };
  const handleUpdateAd = async () => {
    if (!devbaseClient || !isAdmin || !editingAd) return;
    try {
      await devbaseClient.updateEntity('ads', editingAd.id, {
        image_url: editingAd.image_url,
        target_url: editingAd.target_url,
        max_impressions: Number(editingAd.max_impressions)
      });
      setEditingAd(null);
      await loadCustomAds();
      alert('✅ Ad updated successfully!');
    } catch (error) {
      console.error('Error updating ad:', error);
      alert('Failed to update ad: ' + error.message);
    }
  };
  const handleDeleteAd = async adId => {
    if (!devbaseClient || !isAdmin) return;
    if (!confirm('Are you sure you want to delete this ad?')) return;
    try {
      await devbaseClient.deleteEntity('ads', adId);
      await loadCustomAds();
      alert('✅ Ad deleted successfully!');
    } catch (error) {
      console.error('Error deleting ad:', error);
      alert('Failed to delete ad: ' + error.message);
    }
  };
  const checkUserBalance = async () => {
    if (!userWallet || !tokenSettings) return;
    setIsChecking(true);
    try {
      let actualBalance = 0;
      const tokenAddress = tokenSettings.token_address;
      if (tokenAddress.toLowerCase() === 'sol') {
        const response = await fetch('https://rpc.dev.fun/593f960288c912411a22', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [userWallet]
          })
        });
        const data = await response.json();
        if (data.result && data.result.value !== undefined) {
          actualBalance = data.result.value / 1000000000;
        }
      } else {
        const response = await fetch('https://rpc.dev.fun/593f960288c912411a22', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenAccountsByOwner',
            params: [userWallet, {
              mint: tokenAddress
            }, {
              encoding: 'jsonParsed'
            }]
          })
        });
        const data = await response.json();
        if (data.result && data.result.value && data.result.value.length > 0) {
          actualBalance = data.result.value.reduce((total, account) => {
            const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
            return total + (balance || 0);
          }, 0);
        }
      }
      setUserBalance(actualBalance);
      setHasAccess(actualBalance >= tokenSettings.required_amount);
    } catch (error) {
      console.error('Balance check error:', error);
      setHasAccess(false);
    } finally {
      setIsChecking(false);
    }
  };
  const saveTokenSettings = async () => {
    if (!devbaseClient || !isAdmin) return;
    try {
      const data = {
        token_address: adminTokenAddress,
        required_amount: Number(adminRequiredAmount)
      };
      if (tokenSettings) {
        await devbaseClient.updateEntity('settings', tokenSettings.id, data);
      } else {
        await devbaseClient.createEntity('settings', data);
      }
      await loadTokenSettings();
      setShowAdminPanel(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };
  useEffect(() => {
    if (customAds.length > 0 && hasAccess) {
      const interval = setInterval(() => {
        const randomAd = customAds[Math.floor(Math.random() * customAds.length)];
        setSelectedAd(randomAd);
        incrementAdImpression(randomAd.id);
        trackImpression();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [customAds, hasAccess, userStats]);
  const incrementAdImpression = async adId => {
    if (!devbaseClient) return;
    try {
      const ad = await devbaseClient.getEntity('ads', adId);
      if (ad && ad.impressions < ad.max_impressions) {
        await devbaseClient.updateEntity('ads', adId, {
          impressions: ad.impressions + 1
        });
      }
    } catch (error) {
      console.error('Error incrementing impression:', error);
    }
  };
  if (!userWallet) {
    return <div className="min-h-screen text-white flex items-center justify-center" style={{
      background: '#FF6680'
    }}>
      <div className="text-center">
        <div className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent text-6xl font-black mb-6">
          adworld.space
        </div>
        <Shield className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
        <h2 className="text-3xl font-bold mb-4">Connect Wallet to Access</h2>
        <UserButton />
      </div>
    </div>;
  }
  if (isChecking) {
    return <div className="min-h-screen text-white flex items-center justify-center" style={{
      background: '#FF6680'
    }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-400 mx-auto mb-4"></div>
        <p className="text-xl">Checking token balance...</p>
      </div>
    </div>;
  }
  if (!hasAccess && !isAdmin) {
    return <div className="min-h-screen text-white flex items-center justify-center p-6" style={{
      background: '#FF6680'
    }}>
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/30 rounded-2xl p-8 text-center shadow-2xl">
        <img src="https://cdn.dev.fun/asset/6694e0d5383171beaa03/adworld logo no text_3158e0fe.png" alt="adworld logo" className="w-24 h-24 mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-4 text-white">Access Denied</h2>
        <p className="text-xl mb-2 text-white/90">You need to hold tokens to access this app</p>
        {tokenSettings && <div className="mt-6 bg-white/10 border border-white/30 p-4 rounded-xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            {tokenImage && <img src={tokenImage} alt="Required Token" className="w-16 h-16 rounded-full border-2 border-white/30 shadow-lg" onError={e => {
              e.target.style.display = 'none';
            }} />}
            <div className="text-left">
              <p className="text-sm text-white/80 mb-1">Required Token:</p>
              <p className="font-mono text-xs break-all text-white/60">{tokenSettings.token_address}</p>
            </div>
          </div>
            <p className="text-lg">Your Balance: <span className="font-bold text-white">{userBalance.toFixed(4)}</span></p>
            <p className="text-lg">Required: <span className="font-bold text-white">{tokenSettings.required_amount}</span></p>
          </div>}
        <button onClick={checkUserBalance} className="mt-6 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg border border-white/40">
          Recheck Balance
        </button>
        <div className="mt-4">
          <p className="text-sm text-white/70 mb-3">Or connect a different wallet:</p>
          <UserButton />
        </div>
      </div>
    </div>;
  }
  return <div className="min-h-screen text-white overflow-x-hidden" style={{
    background: '#FF6680'
  }}>
      {}
      <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                adworld.space
              </h1>
              <nav className="hidden md:flex items-center gap-1">
                {['Dashboard', 'Ads', 'Revenue', 'Token', 'Leaderboard', ...(isAdmin ? ['Admin'] : [])].map(tab => <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${activeTab === tab.toLowerCase() ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                    {tab}
                  </button>)}
              </nav>
            </div>
            <UserButton />
          </div>
        </div>
      </header>
    {}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {}
        {activeTab === 'dashboard' && <>
            {}
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-black mb-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                Every impression counts. Every holder earns.
              </h2>
              <div className="h-1 w-64 mx-auto bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full animate-pulse"></div>
            </div>
            {}
            <div className="mb-8 bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20">
                    {rank.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold">{userWallet?.slice(0, 6)}...{userWallet?.slice(-4)}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${rank.color} text-white shadow-lg`}>
                        {rank.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">Token Holder</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">Total Revenue Earned</div>
                  <div className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent tabular-nums">
                    ${earnings.toFixed(6)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4 hover:border-emerald-500/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Impressions This Week</span>
                    {tokenImage ? <img src={tokenImage} alt="Token" className="w-5 h-5 rounded-full" onError={e => {
                  e.target.style.display = 'none';
                }} /> : <Eye className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{userStats?.total_impressions || 0}</div>
                  <div className="mt-2 bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500" style={{
                  width: `${Math.min((userStats?.total_impressions || 0) / 1000 * 100, 100)}%`
                }}></div>
                  </div>
                </div>
                <div className="bg-black/40 border border-teal-500/20 rounded-xl p-4 hover:border-teal-500/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Holder Share</span>
                    <DollarSign className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{(userBalance / (tokenSettings?.required_amount || 1) * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-500 mt-1">${earnings.toFixed(6)}</div>
                </div>
                <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">CPM Rate</span>
                    <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums">${(CPM_RATE * 1000).toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">per 1000 views</div>
                </div>
                <div className="bg-black/40 border border-yellow-500/20 rounded-xl p-4 hover:border-yellow-500/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Token Balance</span>
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{userBalance.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">{(userBalance / (tokenSettings?.required_amount || 1)).toFixed(2)}x minimum</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    Your Claimable Earnings
                  </h3>
                  <div className="bg-black/40 border border-emerald-500/30 rounded-xl px-4 py-2">
                    <div className="text-xs text-gray-400">Vault Balance</div>
                    <div className="text-sm font-bold text-emerald-400 tabular-nums">{vaultBalance.toFixed(6)} SOL</div>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between items-baseline mb-2">
                    <div className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent tabular-nums">
                      ${earnings.toFixed(6)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {earnings >= 5 ? '✅ Ready to claim!' : `${(5 - earnings).toFixed(6)} to go`}
                    </div>
                  </div>
                  <div className="relative bg-gray-800 rounded-full h-6 overflow-hidden border border-gray-700">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 rounded-full transition-all duration-700 ease-out" style={{
                  width: `${Math.min(earnings / 5 * 100, 100)}%`
                }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white drop-shadow-lg z-10">
                        {(earnings / 5 * 100).toFixed(1)}% to $5.00
                      </span>
                    </div>
                    {earnings >= 5 && <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>}
                  </div>
                </div>
                <button onClick={handleClaim} disabled={earnings < 5 || isClaiming} className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${earnings >= 5 ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105' : 'bg-gray-700 cursor-not-allowed opacity-50'}`}>
                  {isClaiming ? 'Claiming...' : earnings >= 5 ? '💰 Claim Now!' : '🔒 Minimum $5 Required'}
                </button>
                {earnings >= 5 && <div className="mt-4 text-center text-sm text-emerald-400 animate-pulse">
                    ⚡ You can claim your earnings now!
                  </div>}
              </div>
            </div>
          </>}
        {}
        {activeTab === 'ads' && <>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Eye className="w-6 h-6 text-emerald-400" />
              Active Ad Slots
            </h2>
            <div className="mb-6 bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  Verification Ad Unit
                </h3>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  A-Ads Unit #2414879
                </span>
              </div>
              <div id="frame" style={{
            width: '100%',
            margin: 'auto',
            position: 'relative',
            zIndex: 99998
          }}>
                <iframe data-aa='2414879' src='//acceptable.a-ads.com/2414879/?size=Adaptive' style={{
              border: 0,
              padding: 0,
              width: '70%',
              height: 'auto',
              overflow: 'hidden',
              display: 'block',
              margin: 'auto'
            }} />
                <div style={{
              width: '70%',
              margin: 'auto',
              position: 'absolute',
              left: 0,
              right: 0
            }}>
                  <a target="_blank" style={{
                display: 'inline-block',
                fontSize: '13px',
                color: '#263238',
                padding: '4px 10px',
                background: '#F8F8F9',
                textDecoration: 'none',
                borderRadius: '0 0 4px 4px'
              }} id="frame-link" href="https://aads.com/campaigns/new/?source_id=2414879&source_type=ad_unit&partner=2414879">
                    Advertise here
                  </a>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900/50 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400">💰 SPONSOR SLOT A</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Active</span>
                </div>
                <div id="frame" style={{
              width: '125px',
              margin: 'auto',
              zIndex: 99998,
              height: 'auto'
            }}>
                  <iframe data-aa='2414921' src='//ad.a-ads.com/2414921/?size=125x125' style={{
                border: 0,
                padding: 0,
                width: '125px',
                height: '125px',
                overflow: 'hidden',
                display: 'block',
                margin: 'auto'
              }} />
                </div>
                <div className="text-xs text-gray-400 mt-2">Impressions: ∞</div>
              </div>
              {selectedAd && <div className="bg-gray-900/50 backdrop-blur-xl border border-teal-500/30 rounded-2xl p-4 cursor-pointer hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/10 transition-all duration-300" onClick={() => selectedAd.target_url && window.open(selectedAd.target_url, '_blank')}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-teal-400">🎯 FEATURED PROJECT</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-teal-500/20 text-teal-400">Active</span>
                  </div>
                  <img src={selectedAd.image_url} alt="Sponsored Ad" className="w-full h-64 object-cover rounded-xl" onError={e => {
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="250"%3E%3Crect fill="%23111" width="300" height="250"/%3E%3Ctext x="50%25" y="50%25" font-size="20" fill="%2300FFB3" text-anchor="middle" dominant-baseline="middle"%3EAD SPACE%3C/text%3E%3C/svg%3E';
            }} />
                  <div className="text-xs text-gray-400 mt-2">
                    Impressions: {selectedAd.impressions}/{selectedAd.max_impressions}
                  </div>
                </div>}
              {['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((slot, idx) => <div key={slot} className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 hover:border-gray-600/50 hover:shadow-lg hover:shadow-gray-500/10 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400">💎 SPONSOR SLOT {slot}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-400">Active</span>
                  </div>
                  <iframe src="//acceptable.a-ads.com/123456?size=300x250" style={{
              width: '100%',
              height: '250px',
              border: 0
            }} className="bg-gray-800 rounded-xl" />
                  <div className="text-xs text-gray-500 mt-2">Impressions: ∞</div>
                </div>)}
            </div>
          </>}
        {}
        {activeTab === 'revenue' && <>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              Revenue Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-emerald-400" />
                  Revenue Distribution
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-400">Token Holders</span>
                      <span className="text-sm font-bold text-emerald-400">60%</span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-3">
                      <div className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full" style={{
                    width: '60%'
                  }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-400">Treasury</span>
                      <span className="text-sm font-bold text-purple-400">25%</span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-3">
                      <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full" style={{
                    width: '25%'
                  }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-400">Token Buybacks</span>
                      <span className="text-sm font-bold text-yellow-400">15%</span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-3">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full rounded-full" style={{
                    width: '15%'
                  }}></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Live Stats</h3>
                <div className="space-y-4">
                  <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-1">CPM Earnings (Live)</div>
                    <div className="text-3xl font-black text-emerald-400 tabular-nums">${(earnings * 1000).toFixed(4)}</div>
                    <div className="text-xs text-gray-500 mt-1">Per 1000 impressions</div>
                  </div>
                  <div className="bg-black/40 border border-teal-500/20 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-1">Daily Revenue (Est.)</div>
                    <div className="text-3xl font-black text-teal-400 tabular-nums">${(earnings * 24).toFixed(4)}</div>
                    <div className="text-xs text-gray-500 mt-1">Based on current activity</div>
                  </div>
                </div>
              </div>
            </div>
          </>}
        {}
        {activeTab === 'token' && tokenSettings && <>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-emerald-400" />
              Token Requirements
            </h2>
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold mb-4">Required Token</h3>
                  <div className="bg-black/40 border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {tokenImage && <img src={tokenImage} alt="Token" className="w-12 h-12 rounded-full border-2 border-emerald-500/30" onError={e => {
                    e.target.style.display = 'none';
                  }} />}
                      <div className="flex-1">
                        <div className="text-sm text-gray-400 mb-2">Token Address</div>
                        <div className="font-mono text-xs text-emerald-400 break-all">{tokenSettings.token_address}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 bg-black/40 border border-gray-700/50 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-2">Minimum Balance</div>
                    <div className="text-2xl font-bold text-white tabular-nums">{tokenSettings.required_amount}</div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4">Your Status</h3>
                  <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-2">Your Balance</div>
                    <div className="text-2xl font-bold text-emerald-400 tabular-nums">{userBalance.toFixed(4)}</div>
                  </div>
                  <div className="mt-4 bg-black/40 border border-teal-500/20 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-2">Multiplier</div>
                    <div className="text-2xl font-bold text-teal-400 tabular-nums">{(userBalance / tokenSettings.required_amount).toFixed(2)}x</div>
                  </div>
                </div>
              </div>
            </div>
          </>}
        {}
        {activeTab === 'leaderboard' && <>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Top Token Holders
            </h2>
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
              <div className="space-y-3">
                {mockLeaderboard.map((holder, idx) => <div key={idx} className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${holder.wallet === userWallet?.slice(0, 4) + '...' + userWallet?.slice(-4) ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-black/40 border border-gray-700/30 hover:border-gray-600/50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' : idx === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-800 text-white' : 'bg-gray-800 text-gray-400'}`}>
                        {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </div>
                      <div>
                        <div className="font-mono text-sm font-bold">{holder.wallet}</div>
                        <div className="text-xs text-gray-400">{holder.balance.toFixed(2)} tokens</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-400 tabular-nums">${holder.earnings.toFixed(6)}</div>
                      <div className="text-xs text-gray-400">Total earned</div>
                    </div>
                  </div>)}
              </div>
            </div>
          </>}
        {}
        {activeTab === 'admin' && isAdmin && <>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-400" />
              Admin Control Panel
            </h2>
            {}
            <div className="mb-6 bg-gray-900/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 shadow-2xl shadow-purple-500/10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
                <Settings className="w-5 h-5" />
                Platform Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Token Address (or "SOL")</label>
                  <input type="text" value={adminTokenAddress} onChange={e => setAdminTokenAddress(e.target.value)} className="w-full bg-black/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:border-purple-400 focus:outline-none transition-all duration-300" placeholder="Token mint address or SOL" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Required Amount</label>
                  <input type="number" value={adminRequiredAmount} onChange={e => setAdminRequiredAmount(e.target.value)} className="w-full bg-black/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:border-purple-400 focus:outline-none transition-all duration-300" placeholder="Minimum token balance" />
                </div>
              </div>
              <button onClick={saveTokenSettings} className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-purple-500/20">
                Save Settings
              </button>
            </div>
            {}
            <div className="mb-6 bg-gray-900/50 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 shadow-2xl shadow-emerald-500/10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <DollarSign className="w-5 h-5" />
                Deposit Revenue to Vault
              </h3>
              <div className="mb-4 bg-black/50 border border-emerald-500/30 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Current Vault Balance</div>
                <div className="text-3xl font-black text-emerald-400 tabular-nums">{vaultBalance.toFixed(6)} SOL</div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Amount (SOL)</label>
                  <input type="number" step="0.000001" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-white focus:border-emerald-400 focus:outline-none transition-all duration-300" placeholder="0.001" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Description (Optional)</label>
                  <input type="text" value={depositDescription} onChange={e => setDepositDescription(e.target.value)} className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-white focus:border-emerald-400 focus:outline-none transition-all duration-300" placeholder="Daily ad revenue deposit" />
                </div>
              </div>
              <button onClick={handleDepositRevenue} disabled={!depositAmount} className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-emerald-500/20">
                Deposit to Vault
              </button>
            </div>
            {}
            <div className="mb-6 bg-gray-900/50 backdrop-blur-xl border border-teal-500/30 rounded-2xl p-6 shadow-2xl shadow-teal-500/10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-teal-400">
                <Eye className="w-5 h-5" />
                Ad Management
              </h3>
              {}
              <div className="mb-6 bg-black/30 border border-teal-500/20 rounded-xl p-4">
                <h4 className="text-lg font-bold mb-3 text-teal-300">Create New Ad</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Image URL</label>
                    <input type="text" value={newAdImageUrl} onChange={e => setNewAdImageUrl(e.target.value)} className="w-full bg-black/50 border border-teal-500/30 rounded-xl px-4 py-3 text-white focus:border-teal-400 focus:outline-none transition-all duration-300" placeholder="https://example.com/ad-image.png" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Target URL</label>
                    <input type="text" value={newAdTargetUrl} onChange={e => setNewAdTargetUrl(e.target.value)} className="w-full bg-black/50 border border-teal-500/30 rounded-xl px-4 py-3 text-white focus:border-teal-400 focus:outline-none transition-all duration-300" placeholder="https://example.com/landing-page" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Max Impressions</label>
                    <input type="number" value={newAdMaxImpressions} onChange={e => setNewAdMaxImpressions(e.target.value)} className="w-full bg-black/50 border border-teal-500/30 rounded-xl px-4 py-3 text-white focus:border-teal-400 focus:outline-none transition-all duration-300" placeholder="10000" />
                  </div>
                </div>
                <button onClick={handleCreateAd} disabled={!newAdImageUrl || !newAdTargetUrl} className="mt-4 w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-teal-500/20">
                  Create Ad
                </button>
              </div>
              {}
              <div className="space-y-3">
                <h4 className="text-lg font-bold mb-3 text-teal-300">Existing Ads ({customAds.length})</h4>
                {customAds.map(ad => <div key={ad.id} className="bg-black/30 border border-teal-500/20 rounded-xl p-4">
                    {editingAd?.id === ad.id ? <>
                        <div className="grid grid-cols-1 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-400">Image URL</label>
                            <input type="text" value={editingAd.image_url} onChange={e => setEditingAd({
                      ...editingAd,
                      image_url: e.target.value
                    })} className="w-full bg-black/50 border border-teal-500/30 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-400 focus:outline-none transition-all duration-300" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-400">Target URL</label>
                            <input type="text" value={editingAd.target_url} onChange={e => setEditingAd({
                      ...editingAd,
                      target_url: e.target.value
                    })} className="w-full bg-black/50 border border-teal-500/30 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-400 focus:outline-none transition-all duration-300" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-400">Max Impressions</label>
                            <input type="number" value={editingAd.max_impressions} onChange={e => setEditingAd({
                      ...editingAd,
                      max_impressions: e.target.value
                    })} className="w-full bg-black/50 border border-teal-500/30 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-400 focus:outline-none transition-all duration-300" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleUpdateAd} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300">
                            Save
                          </button>
                          <button onClick={() => setEditingAd(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300">
                            Cancel
                          </button>
                        </div>
                      </> : <>
                        <div className="flex items-start gap-4 mb-3">
                          <img src={ad.image_url} alt="Ad" className="w-24 h-24 object-cover rounded-lg" onError={e => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect fill="%23111" width="96" height="96"/%3E%3Ctext x="50%25" y="50%25" font-size="12" fill="%2300FFB3" text-anchor="middle" dominant-baseline="middle"%3EAD%3C/text%3E%3C/svg%3E';
                  }} />
                          <div className="flex-1">
                            <div className="text-sm font-mono text-gray-400 mb-1 break-all">{ad.target_url}</div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>Impressions: {ad.impressions}/{ad.max_impressions}</span>
                              <span className={`px-2 py-1 rounded ${ad.impressions >= ad.max_impressions ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {ad.impressions >= ad.max_impressions ? 'Maxed Out' : 'Active'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingAd(ad)} className="flex-1 bg-teal-700/50 hover:bg-teal-600/50 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteAd(ad.id)} className="flex-1 bg-red-700/50 hover:bg-red-600/50 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300">
                            Delete
                          </button>
                        </div>
                      </>}
                  </div>)}
              </div>
            </div>
            {}
            <div className="mb-6 bg-gray-900/50 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-6 shadow-2xl shadow-yellow-500/10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-yellow-400">
                <BarChart3 className="w-5 h-5" />
                Revenue Deposits History
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {revenueDeposits.length === 0 ? <div className="text-center text-gray-500 py-8">No deposits yet</div> : revenueDeposits.map(deposit => <div key={deposit.id} className="bg-black/30 border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">{deposit.description || 'Revenue Deposit'}</div>
                        <div className="text-xs text-gray-500">{deposit.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-yellow-400 tabular-nums">{deposit.amount.toFixed(6)} SOL</div>
                      </div>
                    </div>)}
              </div>
            </div>
            {}
            <div className="bg-gray-900/50 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-2xl shadow-blue-500/10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
                <DollarSign className="w-5 h-5" />
                Claims History
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allClaims.length === 0 ? <div className="text-center text-gray-500 py-8">No claims yet</div> : allClaims.map(claim => <div key={claim.id} className="bg-black/30 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-mono text-gray-400">{claim.userId?.slice(0, 6)}...{claim.userId?.slice(-4)}</div>
                        <div className="text-xs text-gray-500">{new Date(claim.claimed_at).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-400 tabular-nums">{claim.amount?.toFixed(6)} SOL</div>
                      </div>
                    </div>)}
              </div>
            </div>
          </>}
      </div>
      {}
    {}
      <div style={{
      position: 'absolute',
      zIndex: 99999
    }}>
        <input autoComplete="off" type="checkbox" id="aadsstickymh698cua" hidden />
        <div style={{
        paddingTop: 0,
        paddingBottom: 'auto'
      }}>
          <div style={{
          width: '100%',
          height: 'auto',
          position: 'fixed',
          textAlign: 'center',
          fontSize: 0,
          bottom: 0,
          left: 0,
          right: 0,
          margin: 'auto'
        }}>
            <label htmlFor="aadsstickymh698cua" style={{
            top: '50%',
            transform: 'translateY(-50%)',
            right: '24px',
            position: 'absolute',
            borderRadius: '4px',
            background: 'rgba(248, 248, 249, 0.70)',
            padding: '4px',
            zIndex: 99999,
            cursor: 'pointer'
          }}>
              <svg fill="#000000" height="16px" width="16px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 490">
                <polygon points="456.851,0 245,212.564 33.149,0 0.708,32.337 212.669,245.004 0.708,457.678 33.149,490 245,277.443 456.851,490 489.292,457.678 277.331,245.004 489.292,32.337 " />
              </svg>
            </label>
            <div style={{
            width: '100%',
            margin: 'auto',
            position: 'relative',
            zIndex: 99998
          }}>
              <iframe data-aa='2414881' src='//acceptable.a-ads.com/2414881/?size=Adaptive' style={{
              border: 0,
              padding: 0,
              width: '70%',
              height: 'auto',
              overflow: 'hidden',
              margin: 'auto'
            }} />
            </div>
          </div>
        </div>
      </div>
      {}
      <div style={{
      position: 'absolute',
      zIndex: 99999
    }}>
        <input autoComplete="off" type="checkbox" id="aadsstickymh6emld5" hidden />
        <div style={{
        paddingTop: 0,
        paddingBottom: 0
      }}>
          <div style={{
          width: '15%',
          height: '100%',
          position: 'fixed',
          textAlign: 'center',
          fontSize: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          left: 0,
          minWidth: '100px'
        }}>
            <label htmlFor="aadsstickymh6emld5" style={{
            bottom: '24px',
            margin: '0 auto',
            right: 0,
            left: 0,
            maxWidth: '24px',
            position: 'absolute',
            borderRadius: '4px',
            background: 'rgba(248, 248, 249, 0.70)',
            padding: '4px',
            zIndex: 99999,
            cursor: 'pointer'
          }}>
              <svg fill="#000000" height="16px" width="16px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 490">
                <polygon points="456.851,0 245,212.564 33.149,0 0.708,32.337 212.669,245.004 0.708,457.678 33.149,490 245,277.443 456.851,490 489.292,457.678 277.331,245.004 489.292,32.337 " />
              </svg>
            </label>
            <div style={{
            width: '100%',
            margin: 'auto',
            position: 'relative',
            zIndex: 99998,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
              <iframe data-aa='2414889' src='//acceptable.a-ads.com/2414889/?size=Adaptive' style={{
              border: 0,
              padding: 0,
              width: '70%',
              height: '70%',
              overflow: 'hidden',
              margin: '0 auto'
            }} />
            </div>
          </div>
        </div>
    </div>
      {}
      <div style={{
      position: 'absolute',
      zIndex: 99999
    }}>
        <input autoComplete="off" type="checkbox" id="aadsstickymh6jtvy9" hidden />
        <div style={{
        paddingTop: 0,
        paddingBottom: 0
      }}>
          <div style={{
          width: '15%',
          height: '100%',
          position: 'fixed',
          textAlign: 'center',
          fontSize: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          right: 0,
          minWidth: '100px'
        }}>
            <label htmlFor="aadsstickymh6jtvy9" style={{
            bottom: '24px',
            margin: '0 auto',
            right: 0,
            left: 0,
            maxWidth: '24px',
            position: 'absolute',
            borderRadius: '4px',
            background: 'rgba(248, 248, 249, 0.70)',
            padding: '4px',
            zIndex: 99999,
            cursor: 'pointer'
          }}>
              <svg fill="#000000" height="16px" width="16px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 490">
                <polygon points="456.851,0 245,212.564 33.149,0 0.708,32.337 212.669,245.004 0.708,457.678 33.149,490 245,277.443 456.851,490 489.292,457.678 277.331,245.004 489.292,32.337 " />
              </svg>
            </label>
            <div style={{
            width: '100%',
            margin: 'auto',
            position: 'relative',
            zIndex: 99998,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
              <iframe data-aa='2414906' src='//acceptable.a-ads.com/2414906/?size=Adaptive' style={{
              border: 0,
              padding: 0,
              width: '70%',
              height: '70%',
              overflow: 'hidden',
              margin: '0 auto'
            }} />
            </div>
          </div>
        </div>
      </div>
      {}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => <div key={i} className="absolute text-3xl animate-float opacity-20" style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${8 + Math.random() * 4}s`,
        top: `-50px`
      }}>
            💰
          </div>)}
      </div>
      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.2;
          }
          50% {
            opacity: 0.1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
        #aadsstickymh698cua:checked + div {
          display: none;
        }
        #aadsstickymh6emld5:checked + div {
          display: none;
        }
        #aadsstickymh6jtvy9:checked + div {
          display: none;
        }
      `}</style>
    </div>;
}
export default function AppWithProvider() {
  return <DevappProvider rpcEndpoint="https://rpc.dev.fun/6694e0d5383171beaa03" devbaseEndpoint="https://devbase.dev.fun" appId="6694e0d5383171beaa03">
      <App />
    </DevappProvider>;
}
