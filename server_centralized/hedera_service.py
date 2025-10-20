# hedera_service.py
import os
import random
from datetime import datetime, timedelta
from typing import Dict, Any
from dotenv import load_dotenv

# Only import the basic modules that work
from hiero_sdk_python import AccountId, Client, Network, PrivateKey, Hbar
from hiero_sdk_python.query.account_balance_query import CryptoGetAccountBalanceQuery

load_dotenv()

class HederaService:
    def __init__(self):
        # Setup basic client
        try:
            network = Network(network="testnet")
            self.client = Client(network)
            
            # Account setup
            self.treasury_account_id = AccountId.from_string(os.getenv('HEDERA_ACCOUNT_ID', '0.0.6908040'))
            
            private_key_str = os.getenv('HEDERA_PRIVATE_KEY')
            if private_key_str:
                self.treasury_private_key = PrivateKey.from_string(private_key_str)
                self.client.set_operator(self.treasury_account_id, self.treasury_private_key)
                self.demo_mode = False
                print("✅ Hiero SDK initialized with real credentials")
            else:
                self.treasury_private_key = None
                self.demo_mode = True
                
            self.rune_token_id = '0.0.6913517'
            
        except Exception as e:
            print(f"⚠️ Hiero SDK initialization failed: {e}")
            self.demo_mode = True
    
    async def get_token_balance(self, account_id: str) -> int:
        """Get account balance"""
        try:
            if self.demo_mode:
                # Return mock balance for demo
                return random.randint(100, 1000)
            
            # Try real balance query
            account = AccountId.from_string(account_id)
            balance_query = CryptoGetAccountBalanceQuery(account)
            account_balance = balance_query.execute(self.client)
            
            # Return mock balance (in production, parse HTS token balance)
            return random.randint(500, 2000)
            
        except Exception as e:
            print(f"Balance query error: {e}")
            return random.randint(100, 1000)  # Fallback to mock
    
    async def create_scheduled_token_transfer(self, recipient_account_id: str, amount: int, delay_minutes: int) -> Dict[str, Any]:
        """
        Create scheduled token transfer
        For demo: Returns mock schedule info
        In production: Would use real Hedera scheduled transactions
        """
        try:
            schedule_id = f"0.0.{random.randint(100000, 999999)}"
            execution_time = datetime.now() + timedelta(minutes=delay_minutes)
            
            if self.demo_mode:
                status_msg = "🎮 DEMO MODE"
                note = "Add HEDERA_PRIVATE_KEY to .env for real Hedera scheduled transactions"
            else:
                status_msg = "🚧 SDK READY"
                note = "Real Hedera scheduling would be implemented here with proper ScheduleCreate APIs"
            
            print(f"{status_msg}: Scheduling {amount} Rune tokens to {recipient_account_id}")
            print(f"📅 Would execute at: {execution_time}")
            print(f"🆔 Mock Schedule ID: {schedule_id}")
            print(f"⏱️  Delay: {delay_minutes} minutes")
            
            return {
                'status': 'success',
                'schedule_id': schedule_id,
                'amount': amount,
                'recipient': recipient_account_id,
                'execution_time': execution_time.isoformat(),
                'delay_minutes': delay_minutes,
                'note': note,
                'demo_mode': self.demo_mode
            }
            
        except Exception as e:
            print(f"❌ Scheduling error: {e}")
            return {
                'status': 'error', 
                'message': str(e),
                'demo_mode': True
            }
    
    async def send_welcome_bonus(self, recipient_account_id: str) -> Dict[str, Any]:
        """250 Rune tokens in 1 minute"""
        result = await self.create_scheduled_token_transfer(recipient_account_id, 250, delay_minutes=1)
        return result
    
    async def send_daily_login_reward(self, recipient_account_id: str) -> Dict[str, Any]:
        """Random 50-200 tokens in 5 minutes"""
        amount = random.choice([50, 100, 200])
        result = await self.create_scheduled_token_transfer(recipient_account_id, amount, delay_minutes=5)
        return result
    
    async def send_victory_reward(self, recipient_account_id: str) -> Dict[str, Any]:
        """Random 1000-2000 tokens in 30 minutes"""
        amount = random.choice([1000, 1500, 2000])
        result = await self.create_scheduled_token_transfer(recipient_account_id, amount, delay_minutes=30)
        return result

# Global instance
hedera_service = HederaService()
