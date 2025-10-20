# hedera_staking_service.py
"""
Pure Hedera Staking Service
Uses native HTS token operations without smart contracts
"""
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

class HederaStakingService:
    """Manages staking using pure Hedera operations"""
    
    def _init_(self):
        """Initialize the staking service"""
        self.active_stakes = {}  # Format: {player_id: stake_data}
        self.staking_account = os.getenv('HEDERA_ACCOUNT_ID', '0.0.6908040')
        self.demo_mode = True  # Will be set to False when real Hedera SDK is available
        print(f"✅ HederaStakingService initialized")
        print(f"📊 Staking account: {self.staking_account}")
        print(f"🎮 Demo mode: {self.demo_mode}")
    
    async def create_stake(self, player_account_id: str, stake_amount: float, 
                          duration_minutes: int) -> Dict[str, Any]:
        """Create a new stake using pure Hedera operations"""
        try:
            print(f"🚀 Creating stake for {player_account_id}: {stake_amount} Rune for {duration_minutes} minutes")
            
            # Step 1: Transfer tokens from player to staking account
            if self.demo_mode:
                # Demo transfer
                transfer_result = {
                    'status': 'success',
                    'transaction_id': f'demo_transfer_{int(datetime.now().timestamp())}',
                    'message': 'Demo transfer completed'
                }
                print(f"🎮 DEMO: Transfer {stake_amount} Rune tokens")
                print(f"📤 From: {player_account_id} → 📥 To: {self.staking_account}")
            else:
                # Real Hedera transfer would go here
                # result = await hedera_service.transfer_tokens(...)
                transfer_result = {'status': 'success', 'transaction_id': 'real_tx_id'}
            
            if transfer_result['status'] != 'success':
                return {'status': 'error', 'message': 'Token transfer failed'}
            
            # Step 2: Calculate reward multiplier
            reward_multiplier = self._calculate_reward_multiplier(duration_minutes)
            
            # Step 3: Record stake in system
            stake_id = f"stake_{player_account_id}_{int(datetime.now().timestamp())}"
            stake_data = {
                'stake_id': stake_id,
                'player_account': player_account_id,
                'amount': stake_amount,
                'duration_minutes': duration_minutes,
                'start_time': datetime.now().isoformat(),
                'end_time': (datetime.now() + timedelta(minutes=duration_minutes)).isoformat(),
                'status': 'active',
                'transaction_id': transfer_result.get('transaction_id'),
                'reward_multiplier': reward_multiplier,
                'potential_reward': stake_amount * reward_multiplier,
                'created_at': datetime.now().isoformat()
            }
            
            # Store the stake
            self.active_stakes[player_account_id] = stake_data
            
            print(f"✅ Stake created successfully: {stake_id}")
            print(f"💰 Potential reward: {stake_data['potential_reward']:.4f} Rune (multiplier: {reward_multiplier}x)")
            
            return {
                'status': 'success',
                'stake_id': stake_id,
                'message': 'Pure Hedera stake created successfully!',
                'stake_data': stake_data,
                'demo_mode': self.demo_mode
            }
            
        except Exception as e:
            print(f"❌ Error creating stake: {str(e)}")
            return {'status': 'error', 'message': f'Failed to create stake: {str(e)}'}
    
    async def resolve_stake(self, player_account_id: str, 
                          game_won: bool = False) -> Dict[str, Any]:
        """Resolve a stake after game completion"""
        try:
            print(f"🎯 Resolving stake for {player_account_id}, game_won: {game_won}")
            
            if player_account_id not in self.active_stakes:
                return {'status': 'error', 'message': 'No active stake found'}
            
            stake_data = self.active_stakes[player_account_id].copy()
            
            if game_won:
                # Player won - return original + rewards
                reward_amount = stake_data['amount'] * stake_data['reward_multiplier']
                total_return = stake_data['amount'] + reward_amount
                
                if self.demo_mode:
                    print(f"🎮 DEMO: Would transfer {total_return:.4f} Rune back to {player_account_id}")
                    transfer_result = {'status': 'success', 'transaction_id': f'demo_reward_{int(datetime.now().timestamp())}'}
                else:
                    # Real transfer back original + rewards
                    # transfer_result = await hedera_service.transfer_tokens(...)
                    transfer_result = {'status': 'success', 'transaction_id': 'real_reward_tx'}
                
                message = f"🎉 Stake won! Returned {total_return:.4f} Rune tokens (original: {stake_data['amount']:.4f} + reward: {reward_amount:.4f})"
                
            else:
                # Player lost - tokens stay in staking account
                transfer_result = {'status': 'success', 'message': 'Stake forfeited'}
                message = f"💔 Stake lost! {stake_data['amount']:.4f} Rune tokens forfeited"
            
            # Mark stake as resolved
            stake_data['status'] = 'resolved'
            stake_data['resolved_at'] = datetime.now().isoformat()
            stake_data['game_won'] = game_won
            stake_data['resolution_message'] = message
            
            # Remove from active stakes
            del self.active_stakes[player_account_id]
            
            print(f"✅ Stake resolved: {message}")
            
            return {
                'status': 'success',
                'message': message,
                'stake_resolved': stake_data,
                'demo_mode': self.demo_mode
            }
            
        except Exception as e:
            print(f"❌ Error resolving stake: {str(e)}")
            return {'status': 'error', 'message': f'Failed to resolve stake: {str(e)}'}
    
    def _calculate_reward_multiplier(self, duration_minutes: int) -> float:
        """Calculate reward multiplier based on time pressure"""
        if duration_minutes <= 5:
            return 2.5  # High risk, high reward
        elif duration_minutes <= 10:
            return 2.0
        elif duration_minutes <= 15:
            return 1.5
        elif duration_minutes <= 20:
            return 1.3
        else:
            return 1.1  # Low risk, low reward
    
    def get_stake_info(self, player_account_id: str) -> Dict[str, Any]:
        """Get current stake information for a player"""
        try:
            if player_account_id in self.active_stakes:
                stake_data = self.active_stakes[player_account_id]
                
                # Calculate time remaining
                end_time = datetime.fromisoformat(stake_data['end_time'])
                time_remaining = (end_time - datetime.now()).total_seconds() / 60
                
                return {
                    'status': 'active_stake',
                    'stake_data': {
                        **stake_data,
                        'time_remaining_minutes': max(0, int(time_remaining)),
                        'is_expired': time_remaining <= 0
                    }
                }
            else:
                return {
                    'status': 'no_stake', 
                    'message': 'No active stake found for this player'
                }
                
        except Exception as e:
            print(f"❌ Error getting stake info: {str(e)}")
            return {'status': 'error', 'message': f'Failed to get stake info: {str(e)}'}
    
    def get_all_stakes(self) -> Dict[str, Any]:
        """Get information about all active stakes"""
        try:
            return {
                'status': 'success',
                'active_stakes_count': len(self.active_stakes),
                'active_stakes': self.active_stakes,
                'staking_account': self.staking_account,
                'demo_mode': self.demo_mode
            }
        except Exception as e:
            print(f"❌ Error getting all stakes: {str(e)}")
            return {'status': 'error', 'message': f'Failed to get stakes: {str(e)}'}

# Initialize global service instance
print("🚀 Initializing HederaStakingService...")
hedera_staking_service = HederaStakingService()

# Verify initialization
if hasattr(hedera_staking_service, 'active_stakes') and hasattr(hedera_staking_service, 'staking_account'):
    print("✅ HederaStakingService initialization verified!")
    print(f"📊 Active stakes: {len(hedera_staking_service.active_stakes)}")
    print(f"🏦 Staking account: {hedera_staking_service.staking_account}")
else:
    print("❌ HederaStakingService initialization failed!")