import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Props:
 * - dialogues: Array<{ speaker: string, text: string, portrait?: string }>
 * - onComplete: () => void
 */
export default function Conversation({ dialogues = [], onComplete }) {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isExiting, setIsExiting] = useState(false); // State to control the exit animation
  
  // Refs to hold interval/timeout IDs and the speech utterance instance
  const typingRef = useRef(null);
  const utterRef = useRef(null);
  const advanceTimeoutRef = useRef(null);
  
  // A ref to keep track of the current index to prevent race conditions from delayed TTS events
  const currentIndexRef = useRef(index);
  useEffect(() => {
    currentIndexRef.current = index;
  }, [index]);


  // A centralized cleanup function to stop all ongoing effects (typing, speech, timeouts)
  const cleanup = useCallback(() => {
    clearInterval(typingRef.current);
    clearTimeout(advanceTimeoutRef.current);
    if (utterRef.current) {
      // VERY IMPORTANT: remove the onend listener before cancelling
      // to prevent it from firing when we manually call .cancel()
      utterRef.current.onend = null; 
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 800); 
      return () => clearTimeout(timer);
    }
  }, [isExiting, onComplete]);

  const advance = useCallback(() => {
    cleanup();
    if (index + 1 >= dialogues.length) {
      setIsExiting(true); // Start the exit animation instead of calling onComplete
    } else {
      setIndex((prevIndex) => prevIndex + 1);
    }
  }, [index, dialogues.length, cleanup]);

  // Main effect to handle typing and speech for the current dialogue line
  useEffect(() => {
    if (isExiting) return; // Don't run effects if the component is exiting

    cleanup();

    const line = dialogues[index];
    if (!line) return;

    // --- Typing Effect ---
    let pos = 0;
    setDisplayText(''); // Reset display text for the new line
    typingRef.current = setInterval(() => {
      pos++;
      setDisplayText(line.text.slice(0, pos));
      if (pos >= line.text.length) {
        clearInterval(typingRef.current);
      }
    }, 50);

    // --- Text-to-Speech (TTS) Effect ---
    const handleSpeechEnd = () => {
        if (currentIndexRef.current === index) {
            advance();
        }
    };
    
    if ('speechSynthesis' in window && line.text) {
      const utter = new SpeechSynthesisUtterance(line.text);
      utter.lang = 'en-US';
      utter.volume = 1;
      utter.rate = 1;
      utter.pitch = 1;
      utter.onend = handleSpeechEnd;
      utter.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        handleSpeechEnd(); // Treat error as the end to avoid getting stuck
      };
      
      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    } else {
      // Fallback auto-advance if TTS is not available
      const estimatedTime = Math.max(2000, line.text.length * 50);
      advanceTimeoutRef.current = setTimeout(handleSpeechEnd, estimatedTime);
    }

    // Return the cleanup function to run when the component unmounts or the index changes
    return cleanup;
  }, [index, dialogues, cleanup, advance, isExiting]);

  const skip = () => {
    cleanup();
    setIsExiting(true); // Trigger exit animation on skip
  };

  const currentLine = dialogues[index];
  if (!currentLine) return null;

  // Determine speaker positions. We'll assume a two-person conversation.
  const speakers = [...new Set(dialogues.map(d => d.speaker))];
  const leftSpeakerName = speakers[0];
  const rightSpeakerName = speakers[1] || speakers[0];

  const isLeftSpeakerActive = currentLine.speaker === leftSpeakerName;

  // Find the full dialogue object for each speaker to get their portrait
  const leftSpeakerInfo = dialogues.find(d => d.speaker === leftSpeakerName);
  const rightSpeakerInfo = dialogues.find(d => d.speaker === rightSpeakerName);

  return (
    // The main container will now fade out
    <div className={`w-full h-[70vh] min-h-[400px] bg-black/60 bg-opacity-40 relative flex flex-col justify-end items-center p-4 overflow-hidden transition-opacity duration-700 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Character Portraits */}
      <div className="absolute bottom-0 w-full max-w-7xl mx-auto h-full flex justify-between items-end">
        {/* Left Character */}
        <div 
          className={`transition-all duration-700 ease-in-out ${isLeftSpeakerActive ? 'opacity-100 scale-100' : 'opacity-60 scale-90'} ${isExiting ? 'translate-y-24' : 'translate-y-0'}`}
        >
          <img
            src= '/assets/images/characters/villager03.png'
            alt={leftSpeakerName}
            className="h-[45vh] max-h-[350px] object-contain"
          />
        </div>
        {/* Right Character */}
        <div 
          className={`transition-all duration-700 ease-in-out ${!isLeftSpeakerActive ? 'opacity-100 scale-100' : 'opacity-60 scale-90'} ${isExiting ? 'translate-y-24' : 'translate-y-0'}`}
        >
          <img
            src= '/assets/images/characters/villager04.png'
            alt={rightSpeakerName}
            className="h-[45vh] max-h-[350px] object-contain"
          />
        </div>
      </div>
      
      {/* Dialogue Box and Controls Wrapper */}
      <div className={`relative z-10 w-full max-w-4xl transition-all duration-500 ${isExiting ? 'translate-y-16' : 'translate-y-0'}`}>
        {/* Dialogue Box */}
        <div className="bg-gray-900/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-2xl border border-gray-600">
          <div 
            className={`text-lg font-bold mb-2 ${isLeftSpeakerActive ? 'text-yellow-400' : 'text-sky-400'}`}
          >
            {currentLine.speaker}
          </div>
          <div className="text-xl leading-relaxed min-h-[5rem]">{displayText}</div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={advance}
            className="px-8 py-3 bg-teal-400 text-teal-900 font-bold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-teal-400/50"
          >
            Next
          </button>
          <button
            onClick={skip}
            className="px-8 py-3 bg-gray-700 text-teal-200 font-bold rounded-full transition-all duration-300 hover:scale-105 hover:bg-gray-600 hover:shadow-2xl hover:shadow-black/50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}