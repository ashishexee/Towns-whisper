import React, { useState, useEffect } from 'react';

const RoomLobby = ({ roomId, onStart, onClose }) => {
    const [players, setPlayers] = useState([]);
    const [ws, setWs] = useState(null);

    useEffect(() => {
        const websocket = new WebSocket(`ws://localhost:8000/ws/${roomId}`);
        
        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'players_update') {
                setPlayers(data.players);
            }
        };

        setWs(websocket);

        return () => websocket.close();
    }, [roomId]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4 text-white">Room Lobby</h2>
                <div className="mb-4">
                    <p className="text-gray-300">Room ID: {roomId}</p>
                    <p className="text-gray-300 mt-2">Players ({players.length}/5):</p>
                    <ul className="mt-2 space-y-2">
                        {players.map(player => (
                            <li key={player.id} className="text-white">
                                {player.name}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            ws.send(JSON.stringify({ type: 'start_game' }));
                            onStart();
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Start Game
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoomLobby;