import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Rules() {
  const navigate = useNavigate()
  return (
    <div className="home-container">
      <h1>📜 Blokus Rules</h1>
      <p><strong>Goal:</strong> Place as many pieces as possible while blocking your opponent.</p>
      <p><strong>First Move:</strong> Must cover your starting corner.</p>
      <p><strong>Placement:</strong> Pieces must touch your own only by corners.</p>
      <p><strong>Game End:</strong> When neither can move; lowest unused squares wins.</p>
      <button className="home-button" onClick={() => navigate('/')}>⬅ Back</button>
    </div>
  )
}