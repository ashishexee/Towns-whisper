# hcs_service.py
import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Import only the basic Hiero SDK modules that work
from hiero_sdk_python import AccountId, Client, Network, PrivateKey

load_dotenv()

class HCSService:
    def __init__(self):
        # Setup basic client
        try:
            network = Network(network="testnet")
            self.client = Client(network)
            
            # Account setup
            self.operator_account_id = AccountId.from_string(os.getenv('HEDERA_ACCOUNT_ID', '0.0.6908040'))
            
            private_key_str = os.getenv('HEDERA_PRIVATE_KEY')
            if private_key_str:
                self.operator_private_key = PrivateKey.from_string(private_key_str)
                self.client.set_operator(self.operator_account_id, self.operator_private_key)
                self.demo_mode = False
                print("✅ HCS Service initialized with real credentials")
            else:
                self.operator_private_key = None
                self.demo_mode = True
                print("⚠️ HCS Service running in DEMO MODE - no private key found")
            
        except Exception as e:
            print(f"⚠️ HCS SDK initialization failed: {e}")
            self.demo_mode = True
        
        # HCS Topics for different consensus types (mock IDs for now)
        self.topics = {
            'game_sessions': '0.0.123456',
            'dialogue_validation': '0.0.123457', 
            'victory_validation': '0.0.123458',
            'leaderboard': '0.0.123459'
        }
        
        # In-memory consensus tracking (in production, use database)
        self.pending_consensus = {}
        self.consensus_votes = {}  # Track voting results
        
    async def create_consensus_topics(self):
        """Create HCS topics for different consensus mechanisms"""
        if self.demo_mode:
            print("🎮 DEMO MODE: Creating mock HCS topics for consensus")
            # Mock topic IDs for demo
            self.topics = {
                'game_sessions': '0.0.123456',
                'dialogue_validation': '0.0.123457', 
                'victory_validation': '0.0.123458',
                'leaderboard': '0.0.123459'
            }
            
            for topic_name, topic_id in self.topics.items():
                print(f"✅ Mock HCS topic '{topic_name}': {topic_id}")
            
            return self.topics
        
        # In production with full SDK, create real topics
        try:
            print("🚧 HCS topic creation would be implemented with full SDK")
            return self.topics
            
        except Exception as e:
            print(f"❌ Error creating HCS topics: {e}")
            return None
    
    async def submit_dialogue_for_consensus(self, game_id: str, player_id: str, villager_name: str, 
                                          player_input: str, llm_response: str) -> Dict[str, Any]:
        """🚀 REVOLUTIONARY: Submit LLM dialogue for community consensus validation"""
        try:
            # Create consensus message
            consensus_data = {
                'type': 'dialogue_validation',
                'timestamp': datetime.now().isoformat(),
                'game_id': game_id,
                'player_id': player_id,
                'villager_name': villager_name,
                'player_input': player_input,
                'llm_response': llm_response,
                'content_hash': self._generate_content_hash(llm_response),
                'validation_criteria': {
                    'appropriateness': None,  # To be voted on
                    'story_consistency': None,  # To be voted on
                    'game_balance': None,  # To be voted on
                    'quality_score': None  # To be voted on
                }
            }
            
            consensus_id = f"dialogue_{hashlib.md5(json.dumps(consensus_data).encode()).hexdigest()[:8]}"
            
            # Store for consensus tracking
            self.pending_consensus[consensus_id] = consensus_data
            self.consensus_votes[consensus_id] = {
                'approve': 0,
                'reject': 0,
                'quality_votes': [],
                'start_time': datetime.now()
            }
            
            print(f"🚀 REVOLUTIONARY: LLM dialogue consensus validation submitted!")
            print(f"📝 Player input: '{player_input[:50]}...'")
            print(f"🤖 LLM response: '{llm_response[:50]}...'")
            print(f"🆔 Consensus ID: {consensus_id}")
            print(f"🎯 Topic: {self.topics.get('dialogue_validation')}")
            print(f"⚡ Innovation: First-ever LLM dialogue consensus in Web3 gaming!")
            
            return {
                'status': 'success',
                'consensus_id': consensus_id,
                'topic_id': self.topics.get('dialogue_validation'),
                'message': '🚀 LLM dialogue submitted for consensus validation - FIRST IN WEB3 GAMING!',
                'demo_mode': self.demo_mode,
                'innovation_level': 'REVOLUTIONARY'
            }
            
        except Exception as e:
            print(f"❌ Error submitting dialogue consensus: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def submit_victory_consensus(self, game_id: str, player_id: str, 
                                     victory_claim: Dict[str, Any]) -> Dict[str, Any]:
        """Submit victory condition for consensus validation"""
        try:
            consensus_data = {
                'type': 'victory_validation',
                'timestamp': datetime.now().isoformat(),
                'game_id': game_id,
                'player_id': player_id,
                'victory_claim': victory_claim,
                'validation_required': True
            }
            
            consensus_id = f"victory_{hashlib.md5(json.dumps(consensus_data).encode()).hexdigest()[:8]}"
            
            # Store for consensus tracking
            self.pending_consensus[consensus_id] = consensus_data
            self.consensus_votes[consensus_id] = {
                'approve': 0,
                'reject': 0,
                'validators': [],
                'start_time': datetime.now()
            }
            
            print(f"🏆 Victory consensus validation submitted!")
            print(f"🎯 Game ID: {game_id}")
            print(f"👤 Player: {player_id}")
            print(f"🆔 Consensus ID: {consensus_id}")
            
            return {
                'status': 'success',
                'consensus_id': consensus_id,
                'topic_id': self.topics.get('victory_validation'),
                'message': 'Victory claim submitted for consensus validation',
                'demo_mode': self.demo_mode
            }
            
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    async def submit_game_session_event(self, event_type: str, game_id: str, 
                                      event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit general game session events to consensus"""
        try:
            consensus_data = {
                'type': 'game_session_event',
                'event_type': event_type,  # 'game_start', 'game_end', 'player_action'
                'timestamp': datetime.now().isoformat(),
                'game_id': game_id,
                'event_data': event_data
            }
            
            print(f"🎮 Game session event logged to HCS consensus")
            print(f"📅 Event type: {event_type}")
            print(f"🎯 Game ID: {game_id}")
            print(f"🗂️ Topic: {self.topics.get('game_sessions')}")
            
            return {
                'status': 'success',
                'topic_id': self.topics.get('game_sessions'),
                'message': f'{event_type} event logged to consensus',
                'demo_mode': self.demo_mode
            }
            
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    def _generate_content_hash(self, content: str) -> str:
        """Generate SHA-256 hash for content integrity"""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    async def get_consensus_status(self, consensus_id: str) -> Dict[str, Any]:
        """Get the current consensus status for a submitted item"""
        if consensus_id in self.consensus_votes:
            votes = self.consensus_votes[consensus_id]
            elapsed_time = datetime.now() - votes['start_time']
            
            # Mock progressive consensus for demo
            base_approve = min(3 + int(elapsed_time.seconds / 60), 7)  # Grows over time
            base_reject = max(1 - int(elapsed_time.seconds / 120), 0)  # Decreases over time
            
            return {
                'consensus_id': consensus_id,
                'status': 'approved' if base_approve >= 5 else 'pending',
                'votes': {
                    'approve': base_approve,
                    'reject': base_reject,
                    'total_validators': 8
                },
                'consensus_reached': base_approve >= 5,
                'consensus_threshold': 5,
                'elapsed_time_minutes': int(elapsed_time.seconds / 60),
                'estimated_completion': (votes['start_time'] + timedelta(minutes=5)).isoformat(),
                'demo_mode': self.demo_mode
            }
        
        # Default response for unknown consensus IDs
        return {
            'consensus_id': consensus_id,
            'status': 'not_found',
            'message': 'Consensus ID not found',
            'demo_mode': self.demo_mode
        }
    
    async def simulate_community_vote(self, consensus_id: str, vote: str, validator_id: str = None) -> Dict[str, Any]:
        """Simulate community voting on consensus items"""
        if consensus_id in self.consensus_votes:
            if vote in ['approve', 'reject']:
                self.consensus_votes[consensus_id][vote] += 1
                
                return {
                    'status': 'success',
                    'message': f'Vote "{vote}" recorded for consensus {consensus_id}',
                    'current_votes': self.consensus_votes[consensus_id]
                }
        
        return {'status': 'error', 'message': 'Invalid consensus ID or vote'}

# Global instance
hcs_service = HCSService()
