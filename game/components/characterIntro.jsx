import React from 'react';

// SVG Icons for visual representation of each mechanic
const ExploreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const TradeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const DecideIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Data for the gameplay mechanics
const gameplayMechanics = [
  { 
    title: 'Explore', 
    description: 'Speak to villagers and search locations for clues.', 
    icon: <ExploreIcon /> 
  },
  { 
    title: 'Trade', 
    description: 'Some villagers are greedy — collect assets to trade for key information.', 
    icon: <TradeIcon /> 
  },
  { 
    title: 'Decide', 
    description: 'Your final guess determines the outcome — think before you choose.', 
    icon: <DecideIcon /> 
  },
];

const GameplayMechanics = () => {
  return (
    <section id="gameplay" className="py-20 sm:py-24 px-4 bg-black/60">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-cinzel text-teal-300 mb-12 text-center">How to Play</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {gameplayMechanics.map((mechanic) => (
            <div key={mechanic.title} className="bg-black/20 p-6 rounded-lg border border-teal-400/20 text-center transform transition-transform duration-300 hover:-translate-y-2 flex flex-col items-center">
              <div className="mb-4">{mechanic.icon}</div>
              <h3 className="text-2xl font-cinzel text-teal-200 mb-2">{mechanic.title}</h3>
              <p className="text-teal-300 font-merriweather text-sm">{mechanic.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GameplayMechanics;
