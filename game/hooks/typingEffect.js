import { useState, useEffect } from 'react';

/**
 * A custom hook for creating a typing animation effect.
 * @param {string} text The full text to be typed out.
 * @param {number} speed The typing speed in milliseconds.
 */
export const useTypingEffect = (text, speed = 50) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText(''); // Reset on text change
    if (text) {
      let i = 0;
      const intervalId = setInterval(() => {
        if (i < text.length) {
          setDisplayedText(prev => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(intervalId);
        }
      }, speed);

      return () => clearInterval(intervalId);
    }
  }, [text, speed]);

  return displayedText;
};