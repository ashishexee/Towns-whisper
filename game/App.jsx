import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import PhaserGame from './components/phaserGame';
import Hero from './components/landing';
import IntroductionPanel from './components/introductionPanel';
import CharacterIntro from './components/characterIntro';
import GameModeSelectionCard from './components/gameplayMechanics';
import Conversation from './components/conversation';
import GameModeSelection from './components/gameModeSelection'; 
import ChallengeScreen from './components/challengeScreen';
import UserRegistration from './components/UserRegistration';
import { UserRegistryService } from './utils/userRegistry';
import RoomLobby from './components/RoomLobby';
import { CONTRACT_ADDRESSES, STAKING_MANAGER_ABI } from '../contracts_eth/config';
function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [gameConfig, setGameConfig] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [hasConversationTriggered, setHasConversationTriggered] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [userRegistryService, setUserRegistryService] = useState(null);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [showLobby, setShowLobby] = useState(false);
  const videoRef = useRef(null);

  // --- 2. ADD NEW STATE FOR THE REWARD CHEST POPUP ---
  const [showRewardChest, setShowRewardChest] = useState(false);
  const [gameWonData, setGameWonData] = useState(null);

  useEffect(() => {
    const checkForAbandonedStake = async () => {
      if (!walletAddress || !userRegistryService) return;

      try {
        const provider = userRegistryService.provider;
        const stakingContract = new ethers.Contract(
          CONTRACT_ADDRESSES.stakingManager,
          STAKING_MANAGER_ABI,
          provider
        );

        const stake = await stakingContract.singlePlayerStakes(walletAddress);

        if (stake.isActive) {
          alert("An active stake from a previous session was detected. Since the game was not completed, the stake will be forfeited.");
          
          const signer = await provider.getSigner();
          const stakingContractWithSigner = stakingContract.connect(signer);
          
          const tx = await stakingContractWithSigner.forfeitStake();
          await tx.wait();
          
          alert("Your previous stake has been forfeited.");
        }
      } catch (error) {
        console.error("Error checking for abandoned stake:", error);
      }
    };

    checkForAbandonedStake();
  }, [walletAddress, userRegistryService]);

  const dialogues = [
    { speaker: 'Elder', text: "Welcome, traveler. A great mystery has befallen our village. Your friends... they've vanished.", portrait: '/assets/character_portraits/elder.png' },
    { speaker: 'Elder', text: "Dark forces are at play. Only someone brave can uncover the truth.", portrait: '/assets/character_portraits/elder.png' },
    { speaker: 'Villager', text: "I will guide you. Search the village — maybe you'll find answers there.", portrait: '/assets/character_portraits/elara.png' },
  ];

  // --- 4. ADD THE HANDLER FUNCTION TO CLAIM THE REWARD ---
  const handleClaimReward = async () => {
    if (!walletAddress) {
      alert("Wallet not connected!");
      return;
    }

    console.log(`Claiming reward for wallet: ${walletAddress}`);
    const isStakingGame = gameConfig && gameConfig.isStaking;
    const actualDuration = isStakingGame ? gameWonData?.elapsedTime : null;

    const result = await openRewardChest(walletAddress, actualDuration);

    if (result && result.status === 'success') {
      alert("Success! Your reward has been scheduled. Check your wallet in about 30 minutes.");
      console.log("Scheduling successful, scheduleId:", result.schedule_id);
    } else {
      alert("There was an error scheduling your reward. Please try again.");
      console.error("Failed to schedule reward:", result);
    }
    setShowRewardChest(false); // Close the popup regardless of outcome
  };

  const handleConnectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert("MetaMask not found. Please install the browser extension.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      const registryService = new UserRegistryService(provider, signer);
      setUserRegistryService(registryService);
      
      const isRegistered = await registryService.isUserRegistered(address);
      
      setWalletAddress(address);
      
      if (isRegistered) {
        const userInfo = await registryService.getUserInfo(address);
        setUsername(userInfo.username);
        setCurrentView('gameMode');
        console.log("Returning user:", userInfo.username);
      } else {
        setCurrentView('registration');
        console.log("New user, showing registration");
      }

    } catch (error) {
      console.error("Wallet connection failed:", error);
      if (error.code === 'ACTION_REJECTED') {
        alert("You rejected the connection request.");
      } else {
        alert("Could not connect to the wallet. Please ensure it's unlocked and try again.");
      }
    }
  };

  const handleUserRegistration = (registeredUsername) => {
    setUsername(registeredUsername);
    setCurrentView('gameMode');
    console.log("User registered successfully:", registeredUsername);
  };

  const handleRegistrationCancel = () => {
    setWalletAddress(null);
    setUserRegistryService(null);
    setCurrentView('landing');
  };

  const handlePlaySingle = () => {
    setCurrentView('challenge');
  };

  const handleCreateRoom = async () => {
    // Close any existing lobby first
    if (showLobby) {
      setShowLobby(false);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure cleanup
    }
    
    try {
      console.log('Creating room...');
      const response = await fetch('http://127.0.0.1:8000/create_room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Room created:', data);
      setRoomId(data.room_id);
      setShowLobby(true);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert(`Failed to create room: ${error.message}. Please ensure the server is running on port 8000.`);
    }
  };

  const handleJoinRoom = async () => {
    // Close any existing lobby first
    if (showLobby) {
      setShowLobby(false);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure cleanup
    }
    
    const roomIdInput = prompt("Enter Room ID:");
    if (roomIdInput && roomIdInput.trim()) {
      setRoomId(roomIdInput.trim());
      setShowLobby(true);
    } else if (roomIdInput !== null) {
      alert("Please enter a valid Room ID.");
    }
  };

  const handleAcceptChallenge = (challengeConfig) => {
    // if (challengeConfig.isStaking) {
    //   console.log(`Staking ${challengeConfig.stakeAmount} for a ${challengeConfig.difficulty} challenge.`);
    //   alert(`Staking ${challengeConfig.stakeAmount} is a feature in development. Proceeding without an on-chain transaction for now.`);
    // }

    setGameConfig({
      difficulty: challengeConfig.difficulty,
      isStaking: challengeConfig.isStaking,
      stakeAmount: challengeConfig.stakeAmount,
      timeLimit: challengeConfig.timeLimit,
      account: walletAddress,
      playerGender: 'Male'
    });
    setCurrentView('game');
    
    console.log("Game config set:", {
      difficulty: challengeConfig.difficulty,
      account: walletAddress
    });
  };

  const handleDeclineChallenge = () => {
    setCurrentView('gameMode');
  };

  const handleStartGame = (gameData) => {
    console.log('Starting multiplayer game with data:', gameData);
    
    setGameConfig({
      difficulty: 'medium',
      isMultiplayer: true,
      roomId: roomId,
      playerId: walletAddress,
      gameData: gameData
    });
    
    setCurrentView('game');
    setShowLobby(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100 && !hasConversationTriggered) {
        setShowConversation(true);
        setHasConversationTriggered(true);
      }
    };

    if (!hasConversationTriggered) {
      window.addEventListener('scroll', handleScroll);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasConversationTriggered]);

  if (currentView === 'game') {
    return <PhaserGame gameConfig={gameConfig} />;
  }

  return (
    <div className="bg-gray-900 text-white">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        style={{ filter: 'blur(3px) brightness(0.6)' }}
      >
        <source src="/assets/cut-scene/landing_bg_video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* --- 5. RENDER THE REWARD CHEST CONDITIONALLY --- */}
      {showRewardChest && (
        <RewardChest
          onClaim={handleClaimReward}
          onClose={() => setShowRewardChest(false)}
        />
      )}

      <div style={{ position: 'relative', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <main>
          {currentView === 'landing' && <Hero onConnectClick={handleConnectWallet} />}
          
          {currentView === 'gameMode' && (
            <GameModeSelection
              onPlaySingle={handlePlaySingle}
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              username={username}
              walletAddress={walletAddress}
              userRegistryService={userRegistryService}
            />
          )}

          {currentView === 'challenge' && (
            <ChallengeScreen
              onAccept={handleAcceptChallenge}
              onDecline={handleDeclineChallenge}
              walletAddress={walletAddress}
            />
          )}

          {currentView === 'registration' && (
            <UserRegistration 
              onRegister={handleUserRegistration}
              onCancel={handleRegistrationCancel}
              userRegistryService={userRegistryService}
            />
          )}

          {currentView === 'landing' && (
            <>
              <IntroductionPanel />
              <CharacterIntro />
              <GameModeSelectionCard 
                onPlayClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                onPlaySingle={handlePlaySingle}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                username={username}
                walletAddress={walletAddress}
                userRegistryService={userRegistryService}
              />
            </>
          )}
          
          {showConversation && (
            <Conversation
              dialogues={dialogues}
              onComplete={() => {
                setShowConversation(false);
              }}
            />
          )}

          {showLobby && (
            <RoomLobby 
              roomId={roomId} 
              onStart={handleStartGame}
              onClose={() => setShowLobby(false)}
              playerId={walletAddress}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
