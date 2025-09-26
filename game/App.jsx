import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import PhaserGame from './components/PhaserGame';
import Hero from './components/landing';
import IntroductionPanel from './components/IntroductionPanel';
import CharacterIntro from './components/CharacterIntro';
import GameplayMechanics from './components/GameplayMechanics';
import Conversation from './components/Conversation';
import GameModeSelection from './components/gameModeSelection';

function App() {
  const [isGameVisible, setGameVisible] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [hasConversationTriggered, setHasConversationTriggered] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
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
      // Using ethers.js is a robust way to connect.
      // It handles many wallet-specific quirks automatically.
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // This single call will prompt the user to connect if they aren't already
      const signer = await provider.getSigner();
      
      const address = await signer.getAddress();
      
      setWalletAddress(address);
      console.log("Connected wallet:", address);

    } catch (error) {
      console.error("Wallet connection failed:", error);
      if (error.code === 'ACTION_REJECTED') {
        alert("You rejected the connection request.");
      } else {
        alert("Could not connect to the wallet. Please ensure it's unlocked and try again.");
      }
    }
  };

  const handlePlaySingle = () => {
    setGameVisible(true);
  };

  const handleCreateRoom = () => {
    alert("Create Room feature coming soon!");
  };

  const handleJoinRoom = () => {
    alert("Join Room feature coming soon!");
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

  if (isGameVisible) {
    return <PhaserGame />;
  }

  return (
    <div className="bg-gray-900">
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
          {!walletAddress ? (
            <Hero onConnectClick={handleConnectWallet} />
          ) : (
            <GameModeSelection
              onPlaySingle={handlePlaySingle}
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
            />
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
          <IntroductionPanel />
          <CharacterIntro />
          <GameplayMechanics onPlayClick={() => setGameVisible(true)} />
        </main>
      </div>
    </div>
  );
}

export default App;

