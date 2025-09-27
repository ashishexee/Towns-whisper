// src/components/TokenBalance.jsx
import React, { useState, useEffect } from 'react';
import { getTokenBalance, claimWelcomeBonus, claimDailyReward } from '../api';

const TokenBalance = ({ 
  accountId, 
  showChests = false, 
  position = 'top-right',
  onBalanceUpdate 
}) => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDaily, setShowDaily] = useState(false);

  // Fetch balance when accountId changes
  useEffect(() => {
    if (accountId) {
      fetchBalance();
      checkEligibility();
    } else {
      setBalance(0);
      setShowWelcome(false);
      setShowDaily(false);
    }
  }, [accountId]);

  const fetchBalance = async () => {
    if (!accountId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getTokenBalance(accountId);
      if (result && result.status === 'success') {
        setBalance(result.balance);
        if (onBalanceUpdate) onBalanceUpdate(result.balance);
      }
    } catch (err) {
      console.error('Error fetching token balance:', err);
      setError('Failed to load balance');
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = () => {
    // Simple eligibility check - in production, call API to verify
    const lastWelcome = localStorage.getItem(`welcome_${accountId}`);
    const lastDaily = localStorage.getItem(`daily_${accountId}`);
    const now = Date.now();
    
    setShowWelcome(!lastWelcome);
    setShowDaily(!lastDaily || (now - parseInt(lastDaily) > 24 * 60 * 60 * 1000));
  };

  const handleWelcomeChest = async () => {
    try {
      const result = await claimWelcomeBonus(accountId);
      if (result && result.status === 'success') {
        alert(`Welcome bonus scheduled! You'll receive ${result.amount} Rune tokens in 1 minute.`);
        localStorage.setItem(`welcome_${accountId}`, Date.now().toString());
        setShowWelcome(false);
        // Refresh balance after a delay
        setTimeout(fetchBalance, 2000);
      }
    } catch (error) {
      alert('Welcome bonus already claimed or error occurred.');
      console.error('Welcome bonus error:', error);
    }
  };

  const handleDailyChest = async () => {
    try {
      const result = await claimDailyReward(accountId);
      if (result && result.status === 'success') {
        alert(`Daily reward scheduled! You'll receive ${result.amount} Rune tokens in 5 minutes.`);
        localStorage.setItem(`daily_${accountId}`, Date.now().toString());
        setShowDaily(false);
        // Refresh balance after a delay
        setTimeout(fetchBalance, 2000);
      }
    } catch (error) {
      alert('Daily reward already claimed or cooldown active.');
      console.error('Daily reward error:', error);
    }
  };

  // Position styles
  const positionStyles = {
    'top-right': { position: 'fixed', top: '20px', right: '20px' },
    'top-left': { position: 'fixed', top: '20px', left: '20px' },
    'bottom-right': { position: 'fixed', bottom: '20px', right: '20px' },
    'inline': { position: 'relative' }
  };

  if (!accountId) return null;

  return (
    <div style={{
      ...positionStyles[position],
      background: 'rgba(0, 0, 0, 0.9)',
      border: '2px solid #fbbf24',
      borderRadius: '15px',
      padding: '15px',
      color: 'white',
      fontSize: '16px',
      fontWeight: 'bold',
      zIndex: 1000,
      minWidth: '200px',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Token Balance Display */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: showChests ? '15px' : '0' }}>
        <span style={{ marginRight: '10px' }}>💰</span>
        {loading ? (
          <span>Loading...</span>
        ) : error ? (
          <span style={{ color: '#ef4444' }}>{error}</span>
        ) : (
          <span style={{ color: '#fbbf24' }}>{balance.toLocaleString()} RN</span>
        )}
        <button 
          onClick={fetchBalance}
          style={{
            marginLeft: '10px',
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          title="Refresh balance"
        >
          🔄
        </button>
      </div>

      {/* Chest Buttons */}
      {showChests && (
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          {showWelcome && (
            <button
              onClick={handleWelcomeChest}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: 'none',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🎁 Welcome Bonus (250 RN)
            </button>
          )}
          
          {showDaily && (
            <button
              onClick={handleDailyChest}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📅 Daily Reward (50-200 RN)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenBalance;
