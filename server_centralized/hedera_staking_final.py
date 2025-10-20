# hedera_staking_final.py
import os
from datetime import datetime, timedelta

class HederaStakingService:
    def _init_(self):
        self.active_stakes = {}
        self.staking_account = os.getenv('HEDERA_ACCOUNT_ID', '0.0.6908040')
        self.demo_mode = True
        print(f'? HederaStakingService initialized: {self.staking_account}')
    
    async def create_stake(self, player_account_id: str, stake_amount: float, duration_minutes: int):
        stake_id = f'stake_{player_account_id}_{int(datetime.now().timestamp())}'
        reward_multiplier = 2.5 if duration_minutes <= 5 else 2.0 if duration_minutes <= 10 else 1.5 if duration_minutes <= 15 else 1.3 if duration_minutes <= 20 else 1.1
        
        stake_data = {
            'stake_id': stake_id,
            'player_account': player_account_id,
            'amount': stake_amount,
            'duration_minutes': duration_minutes,
            'status': 'active',
            'created_at': datetime.now().isoformat(),
            'reward_multiplier': reward_multiplier,
            'potential_reward': stake_amount * reward_multiplier,
            'demo_mode': self.demo_mode
        }
        
        self.active_stakes[player_account_id] = stake_data
        print(f'? Created stake: {stake_id} with {reward_multiplier}x multiplier')
        
        return {
            'status': 'success',
            'stake_id': stake_id,
            'message': 'Pure Hedera stake created successfully!',
            'stake_data': stake_data
        }
    
    async def resolve_stake(self, player_account_id: str, game_won: bool = False):
        if player_account_id not in self.active_stakes:
            return {'status': 'error', 'message': 'No active stake found'}
        
        stake_data = self.active_stakes[player_account_id].copy()
        
        if game_won:
            reward = stake_data['amount'] * stake_data['reward_multiplier']
            total_return = stake_data['amount'] + reward
            message = f'?? Won! Returning {total_return:.4f} Rune (original: {stake_data["amount"]:.4f} + reward: {reward:.4f})'
        else:
            message = f'?? Lost! {stake_data["amount"]:.4f} Rune forfeited'
        
        del self.active_stakes[player_account_id]
        stake_data['status'] = 'resolved'
        stake_data['game_won'] = game_won
        stake_data['resolved_at'] = datetime.now().isoformat()
        
        print(f'? Resolved stake: {message}')
        
        return {
            'status': 'success',
            'message': message,
            'stake_resolved': stake_data
        }
    
    def get_stake_info(self, player_account_id: str):
        if player_account_id in self.active_stakes:
            return {'status': 'active_stake', 'stake_data': self.active_stakes[player_account_id]}
        return {'status': 'no_stake', 'message': 'No active stake found'}

# Create working instance
hedera_staking_service = HederaStakingService()
print(f'?? Service initialized with {len(hedera_staking_service.active_stakes)} active stakes')
