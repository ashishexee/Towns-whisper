import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import PhaserGame from './components/phaserGame';
import Hero from './components/landing';
import IntroductionPanel from './components/IntroductionPanel';
import CharacterIntro from './components/CharacterIntro';
import GameplayMechanics from './components/GameplayMechanics';
import Conversation from './components/Conversation';
import GameModeSelection from './components/gameModeSelection'; // UPDATED
import ChallengeScreen from './components/challengeScreen';
import UserRegistration from './components/UserRegistration';
import { UserRegistryService } from './utils/userRegistry';

function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'gameMode', 'challenge', 'game'
  const [gameConfig, setGameConfig] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [hasConversationTriggered, setHasConversationTriggered] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [userRegistryService, setUserRegistryService] = useState(null);
  const [username, setUsername] = useState('');
  const videoRef = useRef(null);

  const dialogues = [
    { speaker: 'You', text: "Ugh... Where am I? My head... what happened?", portrait: '/assets/character_portraits/hemlock.png' },
    { speaker: 'Villager', text: "You were in an accident. I found you unconscious near a broken car.", portrait: '/assets/character_portraits/elara.png' },
    { speaker: 'You', text: "My friends! Did you see them? Were they with me?", portrait: '/assets/character_portraits/hemlock.png' },
    { speaker: 'Villager', text: "I’m sorry… I didn’t see anyone else. But perhaps they are still in the village.", portrait: '/assets/character_portraits/elara.png' },
    { speaker: 'You', text: "Then I have to find them. Please, can you help me?", portrait: '/assets/character_portraits/hemlock.png' },
    { speaker: 'Villager', text: "I will guide you. Search the village — maybe you’ll find answers there.", portrait: '/assets/character_portraits/elara.png' },
  ];

  const handleConnectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert("MetaMask not found. Please install the browser extension.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Initialize user registry service
      const registryService = new UserRegistryService(provider, signer);
      setUserRegistryService(registryService);
      
      // Check if user is already registered
      const isRegistered = await registryService.isUserRegistered(address);
      
      setWalletAddress(address);
      
      if (isRegistered) {
        // Get user info and proceed to game mode
        const userInfo = await registryService.getUserInfo(address);
        setUsername(userInfo.username);
        setCurrentView('gameMode');
        console.log("Returning user:", userInfo.username);
      } else {
        // Show registration screen
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
    // Reset wallet connection
    setWalletAddress(null);
    setUserRegistryService(null);
    setCurrentView('landing');
  };

  const handlePlaySingle = () => {
    setCurrentView('challenge'); // Show challenge screen
  };

  const handleCreateRoom = () => {
    alert("Create Room feature coming soon!");
  };

  const handleJoinRoom = () => {
    alert("Join Room feature coming soon!");
  };

  const handleAcceptChallenge = (challengeConfig) => {
    // In a real scenario, you would trigger a smart contract interaction here
    // if challengeConfig.isStaking is true.
    if (challengeConfig.isStaking) {
      console.log(`Staking ${challengeConfig.stakeAmount} for a ${challengeConfig.difficulty} challenge.`);
      // This is a placeholder. The actual transaction would need to resolve
      // before the game starts.
      alert(`Staking ${challengeConfig.stakeAmount} is a feature in development. Proceeding without an on-chain transaction for now.`);
    }

    setGameConfig({
      difficulty: challengeConfig.difficulty,
      isStaking: challengeConfig.isStaking,
      stakeAmount: challengeConfig.stakeAmount,
      timeLimit: challengeConfig.timeLimit,
      account: walletAddress,
      playerGender: 'Male' // Still a placeholder
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

  // This effect now triggers the conversation on user scroll, but only once.
  useEffect(() => {
    const handleScroll = () => {
      // Check if user has scrolled, and if the conversation has NOT been triggered before.
      if (window.scrollY > 100 && !hasConversationTriggered) {
        setShowConversation(true);
        // Set the triggered flag to true to prevent this from running again.
        setHasConversationTriggered(true);
      }
    };

    // Add the scroll event listener only if the conversation hasn't been triggered yet.
    if (!hasConversationTriggered) {
      window.addEventListener('scroll', handleScroll);
    }

    // Cleanup: remove the event listener when the component unmounts
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasConversationTriggered]); // Dependency array now correctly tracks the trigger state.

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
            />
          )}

          {currentView === 'registration' && (
            <UserRegistration 
              onRegister={handleUserRegistration}
              onCancel={handleRegistrationCancel}
              userRegistryService={userRegistryService}
            />
          )}

          {/* The landing page content is now part of the main view logic */}
          {currentView === 'landing' && (
            <>
              <IntroductionPanel />
              <CharacterIntro />
              <GameplayMechanics onPlayClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
            </>
          )}
            {showConversation && (
              <Conversation
                dialogues={dialogues}
                onComplete={() => {
                  // This will now correctly hide the conversation without it re-triggering.
                  setShowConversation(false);
                }}
              />
            )}
        </main>
      </div>
    </div>
  );
}

export default App;

