# mirror_node_service.py
import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

class MirrorNodeService:
    def __init__(self):
        self.base_url = "https://testnet.mirrornode.hedera.com/api/v1"
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'User-Agent': 'TownsWhisper-Game/1.0'
        })
    
    async def get_account_info(self, account_id: str) -> Optional[Dict]:
        """Get detailed account information from Mirror Node"""
        try:
            url = f"{self.base_url}/accounts/{account_id}"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Mirror Node error: HTTP {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error fetching account info: {e}")
            return None
    
    async def get_token_transactions(self, account_id: str, token_id: str = "0.0.6913517", limit: int = 25) -> List[Dict]:
        """Get token transaction history for an account"""
        try:
            url = f"{self.base_url}/accounts/{account_id}/transactions"
            params = {
                'transactiontype': 'cryptotransfer',
                'limit': limit,
                'order': 'desc'
            }
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                transactions = data.get('transactions', [])
                
                # Filter for Rune Token transactions
                rune_transactions = []
                for tx in transactions:
                    token_transfers = tx.get('token_transfers', [])
                    for transfer in token_transfers:
                        if transfer.get('token_id') == token_id:
                            rune_transactions.append({
                                'transaction_id': tx.get('transaction_id'),
                                'timestamp': tx.get('consensus_timestamp'),
                                'amount': transfer.get('amount', 0) // 100_000_000,  # Convert from smallest unit
                                'type': 'received' if transfer.get('amount', 0) > 0 else 'sent',
                                'result': tx.get('result')
                            })
                
                return rune_transactions
            else:
                print(f"Transaction query error: HTTP {response.status_code}")
                return []
                
        except Exception as e:
            print(f"Error fetching transactions: {e}")
            return []
    
    async def get_network_stats(self) -> Optional[Dict]:
        """Get network-wide statistics"""
        try:
            url = f"{self.base_url}/network/supply"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            print(f"Error fetching network stats: {e}")
            return None

# Global instance
mirror_service = MirrorNodeService()
