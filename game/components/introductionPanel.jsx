import React, { useState } from 'react';

const SHORT_TEXT = "You arrive at the edge of a forgotten village, shrouded in an unnatural tranquility. The air is thick with untold stories.";
const FULL_TEXT = "You arrive at the edge of a forgotten village, shrouded in an unnatural tranquility. The air is thick with untold stories. A mysterious ailment grips the community, tied to a lore that has faded from memory. It is up to you to explore, decipher cryptic clues, and speak to the villagers to piece together the fragmented past and find your friends before they are lost to the silence forever.";

const IntroductionPanel = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="story" className="py-10 sm:py-24 px-4 bg-black/60">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-cinzel text-teal-300 mb-6">
          A Forgotten Lore
        </h2>

        <div className="p-6 sm:p-8 bg-black/30 border border-teal-400/10 rounded-xl shadow-2xl backdrop-blur-sm">
          <p className="text-base sm:text-lg text-teal-100 leading-relaxed font-merriweather transition-opacity duration-500">
            {expanded ? FULL_TEXT : SHORT_TEXT}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="px-6 py-2 bg-teal-400 text-teal-900 font-semibold rounded-full hover:scale-105 transition-transform"
            >
              {expanded ? 'Show Less' : 'Read More'}
            </button>

            <button
              onClick={() => document.getElementById('mechanics')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 py-2 border border-teal-300 text-teal-200 rounded-full hover:bg-teal-600/10 transition-colors"
            >
              How Gameplay Works
            </button>
          </div>

          <ul className="mt-6 text-left text-teal-200/90 max-w-2xl mx-auto space-y-2 list-disc list-inside font-merriweather">
            <li><strong>Explore:</strong> Speak to villagers and search locations for clues.</li>
            <li><strong>Trade:</strong> Some villagers are greedy — collect assets to trade for key information.</li>
            <li><strong>Decide:</strong> Your final guess determines the outcome — think before you choose.</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default IntroductionPanel;
