import React, { useEffect, useMemo, useRef, useState } from 'react'
import { socket } from './socket'
import Board from './components/Board'
import Controls from './components/Controls'
import PieceSelector from './components/PieceSelector'
import SelectedPreview from './components/SelectedPreview'
import ConfirmationOverlay from './components/ConfirmationOverlay'
import { allPieces } from './lib/pieces'
import { transformPiece, normalizePiece } from './lib/transform'

const BOARD_SIZE = 14
const DEFAULT_ROOM = 'room123'
const playerCorners = {0: [4,4], 1: [9,9]}

export default function App() {
  const [name, setName] = useState('')
  const [players, setPlayers] = useState([])
  const [playerColors, setPlayerColors] = useState({})
  const [myPlayerIndex, setMyPlayerIndex] = useState(0)

  const [board, setBoard] = useState(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null)))
  const [lastMove, setLastMove] = useState([])
  const [usedPieces, setUsedPieces] = useState([])             // mine
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

  const myColor = playerColors[name] || 'gray'
  const oppColor = playerColors[opponentName] || 'gray'

  // ask name once
  useEffect(() => {
    const n = window.prompt('Enter your name') || `Player-${Math.floor(Math.random()*1000)}`
    setName(n)
  }, [])

  // socket lifecycle
  useEffect(() => {
    if (!name) return
    if (socket.connected) return
    if (!socket.connected) socket.connect()
    let hasJoined = false
    socket.on('connect', () => {
      if (!hasJoined) {
        console.log('✅ Connected, joining room as', name)
        socket.emit('joinRoom', { roomId: DEFAULT_ROOM, name })
        hasJoined = true
      }
    })
    
    socket.io.on('reconnect', () => {
      console.log('🔄 Reconnected! Rejoining room...');
      socket.emit('joinRoom', { roomId: DEFAULT_ROOM, name });
    });

    // BOARD + TURNS
    socket.on('updateBoard', ({ board, lastMove }) => {
      setBoard(board)
      setLastMove(lastMove)
    })
    socket.on('yourTurn', () => setMyTurn(true))
    socket.on('waitTurn', () => setMyTurn(false))

    // PIECES
    socket.on('updateUsedPieces', used => setUsedPieces(used))
    socket.on('opponentUsedPieces', used => setOpponentUsedPieces(used))

    // PLAYERS
    socket.on('playerList', (players) => {
      setPlayers(players)
      const idx = players.findIndex(p => p.name === name)
      setMyPlayerIndex(idx >= 0 ? idx : 0)
      const opp = players.find(p => p.name !== name)
      setOpponentName(opp?.name || null)
    })
    socket.on('playerColors', (colors) => setPlayerColors(colors))

    socket.on('gameOver', (scores) => {
      const msg = scores.map(s => `${s.name}: ${s.score} points`).join('\n')
      alert('Game Over!\n' + msg)
    })

    return () => {
      socket.off('updateBoard')
      socket.off('yourTurn')
      socket.off('waitTurn')
      socket.off('updateUsedPieces')
      socket.off('opponentUsedPieces')
      socket.off('playerList')
      socket.off('playerColors')
      socket.off('gameOver')
    }
  }, [name])

  // keyboard shortcuts (Q/E/Z/X/C) exactly like your HTML
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

    // place overlay above clicked cell (like your absolute confirmationControls)
    const rect = el.getBoundingClientRect()
    setOverlayPos({ left: rect.left + window.scrollX, top: rect.top + window.scrollY - 60 })
  }

  const confirmPlacement = () => {
    if (!pendingPlacement) return
    const { baseRow, baseCol } = pendingPlacement

    // first-move corner check (client-side, same as your HTML)
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
      roomId: DEFAULT_ROOM,
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
    </div>
  )
}