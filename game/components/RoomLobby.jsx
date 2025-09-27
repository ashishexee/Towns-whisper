import React, { useState, useEffect, useRef } from 'react';

const RoomLobby = ({ roomId, onStart, onClose, playerId }) => {
    const [players, setPlayers] = useState([]);
    const [ws, setWs] = useState(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [error, setError] = useState('');
    const wsRef = useRef(null);
    const reconnectAttempts = useRef(0);

    useEffect(() => {
        // Cleanup any existing connection first
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const connectWebSocket = () => {
            try {
                const websocket = new WebSocket(`ws://localhost:8000/ws/${roomId}/${playerId}`);
                wsRef.current = websocket;
                
                websocket.onopen = () => {
                    console.log('Connected to room lobby');
                    setError('');
                    reconnectAttempts.current = 0;
                };

                websocket.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    console.log('Lobby received message:', data);
                    
                    switch (data.type) {
                        case 'room_joined':
                            setPlayers(data.players || []);
                            break;
                        case 'player_moved':
                            // Handle player updates if needed
                            break;
                        case 'game_started':
                            console.log('Game started in lobby, launching game...');
                            setGameStarted(true);
                            onStart(data.game_data);
                            break;
                        case 'error':
                            setError(data.message);
                            break;
                    }
                };

                websocket.onerror = (error) => {
                    console.error('Lobby WebSocket error:', error);
                    setError('Connection error occurred');
                };

                websocket.onclose = (event) => {
                    console.log('WebSocket closed:', event.code);
                    wsRef.current = null;
                    
                    // Only attempt to reconnect if it wasn't a manual close
                    if (event.code !== 1000 && reconnectAttempts.current < 3) {
                        reconnectAttempts.current++;
                        setTimeout(() => {
                            if (!gameStarted) {
                                connectWebSocket();
                            }
                        }, 2000);
                    }
                };

                setWs(websocket);
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                setError('Failed to connect to room');
            }
        };

        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close(1000); // Normal closure
                wsRef.current = null;
            }
        };
    }, [roomId, playerId, onStart, gameStarted]);

    const startGame = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('Sending start_game message');
            wsRef.current.send(JSON.stringify({ type: 'start_game' }));
        } else {
            setError('Not connected to server');
        }
    };

    const handleClose = () => {
        if (wsRef.current) {
            wsRef.current.close(1000);
            wsRef.current = null;
        }
        onClose();
    };

    if (gameStarted) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4 text-white">Starting Game...</h2>
                        <p className="text-gray-300">Please wait while the game initializes.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4 text-white">Room Lobby</h2>
                <div className="mb-4">
                    <p className="text-gray-300">Room ID: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{roomId}</span></p>
                    <p className="text-gray-300 mt-2">Players ({players.length}/5):</p>
                    <ul className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                        {players.map((player, index) => (
                            <li key={player.id || index} className="text-white bg-gray-700 px-3 py-1 rounded">
                                {player.name || `Player ${player.id?.slice(0, 8)}`}
                                {player.id === playerId && <span className="text-green-400 ml-2">(You)</span>}
                            </li>
                        ))}
                    </ul>
                </div>
                
                {error && (
                    <div className="mb-4 p-2 bg-red-600 text-white rounded">
                        {error}
                    </div>
                )}
                
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Leave Room
                    </button>
                    <button
                        onClick={startGame}
                        disabled={players.length < 2}
                        className={`px-4 py-2 text-white rounded transition-colors ${
                            players.length >= 2 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-gray-600 cursor-not-allowed'
                        }`}
                        title={players.length < 2 ? "Need at least 2 players to start" : "Start the game"}
                    >
                        Start Game {players.length < 2 && `(${players.length}/2)`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoomLobby;