import React from 'react';

const Hero = ({ onConnectClick }) => {
  return (
    <div 
      className="h-screen flex flex-col justify-center items-center text-center px-4 relative bg-cover bg-center"
    >
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold text-white font-cinzel tracking-wider" style={{ textShadow: '0 0 20px rgba(100, 255, 218, 0.6)' }}>
          "TOWNS WHISPER"
        </h1>
        <p className="mt-4 text-lg md:text-xl text-teal-200 font-merriweather">
          FIND YOUR LOST FRIENDS, UNCOVER THE TRUTH
        </p>
        <button 
          onClick={onConnectClick}
          className="mt-8 px-8 py-3 bg-teal-400 text-teal-900 font-bold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-teal-400/50"
        >
          Connect Wallet to Begin
        </button>
      </div>
      <div className="absolute bottom-10 z-10 animate-bounce">
        <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );
};

export default Hero;