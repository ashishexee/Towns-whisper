import React from 'react';

const GameModeCard = ({ title, description, buttonText, onButtonClick, imageUrl }) => (
    <div className="bg-gray-900/70 border-2 border-green-400/50 rounded-2xl shadow-lg shadow-green-400/20 p-6 text-center flex flex-col justify-between transform transition-transform hover:scale-105 hover:border-green-300">
        <div>
            <img src={imageUrl} alt={title} className="rounded-lg mb-4 h-40 w-full object-cover" />
            <h3 className="text-2xl font-cinzel text-green-400 mb-2" style={{ textShadow: '0 0 8px rgba(72, 187, 120, 0.7)' }}>
                {title}
            </h3>
            <p className="text-gray-300 font-merriweather mb-6">
                {description}
            </p>
        </div>
        <button
            onClick={onButtonClick}
            className="w-full px-6 py-3 bg-green-400 text-gray-900 font-bold rounded-lg transition-all duration-300 hover:bg-green-300 hover:shadow-2xl hover:shadow-green-300/50"
        >
            {buttonText}
        </button>
    </div>
);

const GameModeSelection = ({ onPlaySingle, onCreateRoom, onJoinRoom }) => {
    return (
        <div className="h-screen flex flex-col justify-center items-center text-center px-4 relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <GameModeCard
                    title="Single Player"
                    description="Uncover the village's secrets on your own and solve the mystery."
                    buttonText="Start Investigation"
                    onButtonClick={onPlaySingle}
                    imageUrl="/assets/images/ui/single_player.png"
                />
                <GameModeCard
                    title="Create Room"
                    description="Create a new multiplayer room and invite your friends to join."
                    buttonText="Create Room"
                    onButtonClick={onCreateRoom}
                    imageUrl="/assets/images/ui/create_room.png"
                />
                <GameModeCard
                    title="Join Room"
                    description="Join an existing room with a room code to play with others."
                    buttonText="Join Room"
                    onButtonClick={onJoinRoom}
                    imageUrl="/assets/images/ui/join_room.png"
                />
            </div>
        </div>
    );
};

export default GameModeSelection;