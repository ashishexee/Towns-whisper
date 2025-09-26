import React from 'react';

const GameplayMechanics = ({ onPlayClick }) => {
  return (
    <section id="mechanics" className="py-20 sm:py-24 px-4 bg-black/60">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-cinzel text-teal-300 mb-6">
          Trade to Uncover Truth
        </h2>
        <p className="text-base sm:text-lg text-teal-200 leading-relaxed font-merriweather mb-8">
          Not everyone will help you for free. Some villagers are greedy and will demand valuable assets—unique NFTs you can find or mint—in exchange for crucial information. Manage your inventory, decide who to trust, and trade wisely to find your friends.
        </p>
        <button 
          onClick={onPlayClick}
          className="mt-12 px-8 py-3 bg-teal-400 text-teal-900 font-bold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-teal-400/50"
        >
          Begin Your Investigation
        </button>
      </div>
    </section>
  );
};

export default GameplayMechanics;