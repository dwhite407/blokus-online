import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './styles.css'
import { socket } from './socket'

export default function Home() {
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [createdRoom, setCreatedRoom] = useState('')
  const navigate = useNavigate()

  // Create a new room
    const handleCreateRoom = () => {
        if (!name.trim()) return alert('Please enter your name!');
        localStorage.setItem('playerName', name);
        if (!socket.connected) socket.connect();

        socket.emit('createRoom', name, (resp) => {
            if (!resp || !resp.ok) return alert(resp?.error || 'Failed to create room');
            const id = resp.roomId;
            sessionStorage.setItem('alreadyJoined', 1);
            navigate(`/game?room=${id}&name=${encodeURIComponent(name)}`);
        });
    };
  // Join an existing room
    const handleJoinRoom = () => {
        if (!name.trim() || !roomCode.trim()) return alert('Enter BOTH your name and a room code!');
        localStorage.setItem('playerName', name);
        if (!socket.connected) socket.connect();

        socket.emit('joinRoom', { roomId: roomCode.trim(), name }, (resp) => {
            if (!resp || !resp.ok) return alert(resp?.error || 'Unable to join room');
            sessionStorage.setItem('alreadyJoined', 1);
            navigate(`/game?room=${roomCode.trim()}&name=${encodeURIComponent(name)}`);
        });
    };

  return (
    <div className="home-container">
      <h1>🧩 Blokus Online</h1>
      <p>Compete in a modern web version of the classic board game!</p>

      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="home-input"
      />

      {/* Create / Join Room */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <button className="home-button" onClick={handleCreateRoom}>Create Room</button>
        {createdRoom && (
          <p className="room-code">
            Room created: <strong>{createdRoom}</strong><br />
            Share this code with a friend!
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="home-input"
            style={{ width: 200 }}
          />
          <button className="home-button" onClick={handleJoinRoom}>Join Room</button>
        </div>
      </div>

      {/* Rules button */}
      <button className="home-button secondary" onClick={() => navigate('/rules')} style={{ marginTop: 20 }}>
        📜 Rules
      </button>

      <p className="home-note">Built by Drew White</p>
    </div>
  )
}
