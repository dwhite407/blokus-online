import React, { useEffect, useMemo, useRef, useState } from 'react'
import { socket } from './socket'
import Board from './components/Board'
import Controls from './components/Controls'
import PieceSelector from './components/PieceSelector'
import SelectedPreview from './components/SelectedPreview'
import ConfirmationOverlay from './components/ConfirmationOverlay'
import { allPieces } from './lib/pieces'
import { transformPiece, normalizePiece } from './lib/transform'
import { useSearchParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom' 

const BOARD_SIZE = 14
const playerCorners = { 0: [4, 4], 1: [9, 9] }

export default function App() {
  const [params] = useSearchParams()
  const roomFromUrl = params.get('room')
  const nameFromUrl = params.get('name')
  const roomId = roomFromUrl || null // fallback keeps quick-play working

  const alreadyJoined = sessionStorage.getItem('alreadyJoined') === '1'
  const [name, setName] = useState('')
  const [players, setPlayers] = useState([])
  const [playerColors, setPlayerColors] = useState({})
  const [myPlayerIndex, setMyPlayerIndex] = useState(0)

  const [board, setBoard] = useState(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null)))
  const [lastMove, setLastMove] = useState([])
  const [usedPieces, setUsedPieces] = useState([]) // mine
  const [opponentUsedPieces, setOpponentUsedPieces] = useState([])

  const [myTurn, setMyTurn] = useState(false)
  const [opponentName, setOpponentName] = useState(null)

  const [selectedPieceIndex, setSelectedPieceIndex] = useState(0)
  const [rotation, setRotation] = useState(0) // 0..3
  const [flipMode, setFlipMode] = useState('none') // 'none' | 'horizontal' | 'vertical'

  // hover/confirm
  const [pendingPlacement, setPendingPlacement] = useState(null) // { baseRow, baseCol } or null
  const [overlayPos, setOverlayPos] = useState(null) // {left, top} for ✅❌
  const boardRef = useRef(null)
  const lastHoveredCellRef = useRef(null)
  const joinedRef = useRef(false) // ensure we only join once per socket connection

  const myColor = playerColors[name] || 'gray'
  const oppColor = playerColors[opponentName] || 'gray'

  const [showRules, setShowRules] = useState(false)

  const  navigate = useNavigate()

  if (!roomId) {
    return (
      <div className="card" style={{ margin:'40px auto', padding:16, maxWidth:420, textAlign:'center' }}>
        <h3>No room selected</h3>
        <p>Go back to the home page to create or join a room.</p>
        <button className="btn" onClick={() => navigate('/')}>← Home</button>
      </div>
    )
  }
  // ask name once (prefer URL -> localStorage -> random)
  useEffect(() => {
    const saved = nameFromUrl || localStorage.getItem('playerName') || `Player-${Math.floor(Math.random() * 1000)}`
    setName(saved)
  }, [nameFromUrl])

  // socket lifecycle
  useEffect(() => {
    if (!name || !roomId) return

    // always attach listeners; connect if not connected
    if (!socket.connected) socket.connect()

    const onConnect = () => {
      if (!joinedRef.current && !alreadyJoined) {
        console.log('✅ Connected, joining room as', name, '->', roomId)
        socket.emit('joinRoom', { roomId, name })
        joinedRef.current = true
      }
    }

    // First connect + reconnections both re-emit join
    socket.on('connect', onConnect)
    socket.io.on('reconnect', onConnect)

    // BOARD + TURNS
    const onUpdateBoard = ({ board, lastMove }) => {
      setBoard(board)
      setLastMove(lastMove)
    }
    socket.on('updateBoard', onUpdateBoard)
    socket.on('yourTurn', () => setMyTurn(true))
    socket.on('waitTurn', () => setMyTurn(false))

    // PIECES
    socket.on('updateUsedPieces', used => setUsedPieces(used))
    socket.on('opponentUsedPieces', used => setOpponentUsedPieces(used))

    // PLAYERS
    socket.on('playerColors', (colors) => setPlayerColors(colors))
    socket.on('playerList', (players) => {
      console.log('Player list update:', players)
      setPlayers(players)
      const idx = players.findIndex(p => p.name === name)
      setMyPlayerIndex(idx >= 0 ? idx : 0)
      const opp = players.find(p => p.name !== name)
      setOpponentName(opp?.name || null)
    })

    socket.on('gameOver', (scores) => {
      const msg = scores.map(s => `${s.name}: ${s.score} points`).join('\n')
      alert('Game Over!\n' + msg)
    })

    // cleanup
    return () => {
      socket.off('connect', onConnect)
      socket.io.off('reconnect', onConnect)
      socket.off('updateBoard', onUpdateBoard)
      socket.off('yourTurn')
      socket.off('waitTurn')
      socket.off('updateUsedPieces')
      socket.off('opponentUsedPieces')
      socket.off('playerList')
      socket.off('playerColors')
      socket.off('gameOver')
    }
  }, [name, roomId, alreadyJoined])
  useEffect(() => {
    if (alreadyJoined) sessionStorage.removeItem('alreadyJoined')
  }, [alreadyJoined])
  // keyboard shortcuts (Q/E/Z/X/C)
  useEffect(() => {
    const onKey = (e) => {
      if (!myTurn || usedPieces.includes(selectedPieceIndex)) return
      const k = e.key.toLowerCase()
      if (k === 'e') setRotation(r => (r + 3) % 4)           // rotate right
      else if (k === 'q') setRotation(r => (r + 1) % 4)      // rotate left
      else if (k === 'z') setFlipMode(m => (m === 'horizontal' ? 'none' : 'horizontal'))
      else if (k === 'x') setFlipMode(m => (m === 'vertical' ? 'none' : 'vertical'))
      else if (k === 'c') setFlipMode('none')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [myTurn, usedPieces, selectedPieceIndex])

  const transformedShape = useMemo(() => {
    const s = transformPiece(allPieces[selectedPieceIndex], rotation, flipMode)
    return normalizePiece(s)
  }, [selectedPieceIndex, rotation, flipMode])

  const onCellEnter = (r, c, el) => {
    if (!myTurn || usedPieces.includes(selectedPieceIndex)) return
    lastHoveredCellRef.current = el
  }

  const onCellClick = (r, c, el) => {
    if (!myTurn || usedPieces.includes(selectedPieceIndex)) return
    setPendingPlacement({ baseRow: r, baseCol: c })
    const rect = el.getBoundingClientRect()
    setOverlayPos({ left: rect.left + window.scrollX, top: rect.top + window.scrollY - 60 })
  }

  const confirmPlacement = () => {
    if (!pendingPlacement) return
    const { baseRow, baseCol } = pendingPlacement

    // first-move corner check (client-side convenience; server still enforces)
    if (usedPieces.length === 0) {
      const [cornerRow, cornerCol] = playerCorners[myPlayerIndex]
      const touchesCorner = transformPiece(allPieces[selectedPieceIndex], rotation, flipMode)
        .some(([dx, dy]) => (baseRow + dx) === cornerRow && (baseCol + dy) === cornerCol)
      if (!touchesCorner) {
        alert('Your first piece must cover your starting corner!')
        return
      }
    }

    socket.emit('placeMove', {
      row: baseRow + 1,
      col: baseCol + 1,
      roomId, // ✅ use the actual roomId
      pieceIndex: selectedPieceIndex,
      rotation,
      flipMode
    })

    setPendingPlacement(null)
    setOverlayPos(null)
  }

  const cancelPlacement = () => {
    setPendingPlacement(null)
    setOverlayPos(null)
  }

  return (
    <div id="gameLayout">
      <div id="gameInfo" className="card">
        <h2 id="turnStatus">{myTurn ? 'Your Turn!' : opponentName ? `Waiting for ${opponentName}` : 'Connecting...'}</h2>
        <p><strong>Players:</strong></p>
        <ul id="playerList">
          {players.map(p => (
            <li key={p.name} className={`player ${p.name === name ? 'me' : 'opponent'}`} style={{ backgroundColor: p.color }}>
              {p.name}
            </li>
          ))}
        </ul>
      </div>

      <button className="rules-btn" onClick={() => setShowRules(true)}>📜 Rules</button>

      <Controls
        onRotateLeft={() => setRotation(r => (r + 1) % 4)}
        onRotateRight={() => setRotation(r => (r + 3) % 4)}
        onFlipH={() => setFlipMode(m => m === 'horizontal' ? 'none' : 'horizontal')}
        onFlipV={() => setFlipMode(m => m === 'vertical' ? 'none' : 'vertical')}
      />

      <SelectedPreview color={myColor} shape={transformPiece(allPieces[selectedPieceIndex], rotation, flipMode)} />

      <div id="pieceContainer">
        <div id="myPieces">
          <h3>Your Pieces</h3>
          <PieceSelector
            color={myColor}
            usedPieces={usedPieces}
            allPieces={allPieces}
            onSelect={setSelectedPieceIndex}
          />
        </div>
        <div id="opponentPieces">
          <h3>Opponent’s Pieces</h3>
          <PieceSelector
            color={oppColor}
            usedPieces={opponentUsedPieces}
            allPieces={allPieces}
            onSelect={() => {}}
            readOnly
          />
        </div>
      </div>

      {overlayPos && (
        <ConfirmationOverlay
          left={overlayPos.left}
          top={overlayPos.top}
          onConfirm={confirmPlacement}
          onCancel={cancelPlacement}
        />
      )}

      <Board
        ref={boardRef}
        board={board}
        lastMove={lastMove}
        playerColors={playerColors}
        boardSize={BOARD_SIZE}
        shape={transformPiece(allPieces[selectedPieceIndex], rotation, flipMode)} // non-normalized for absolute coords
        myTurn={myTurn}
        selectedPieceIndex={selectedPieceIndex}
        usedPieces={usedPieces}
        onCellEnter={onCellEnter}
        onCellClick={onCellClick}
        startCorners={Object.values(playerCorners)}
      />

      {showRules && (
        <div className="rules-modal-overlay" onClick={() => setShowRules(false)}>
          <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
            <h2>📜 Blokus Rules</h2>
            <ul>
              <li>Each player places one piece per turn.</li>
              <li>Pieces of the same color must touch only at the corners, never edges.</li>
              <li>Your first piece must cover your starting square.</li>
              <li>You cannot overlap or go outside the board.</li>
              <li>The game ends when no player can move; lowest unused squares win.</li>
            </ul>
            <button onClick={() => setShowRules(false)} className="close-rules">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
