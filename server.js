
// BLOKUS SERVER
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Allow React frontend (Vite: http://localhost:5173)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], 
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;
app.get('/', (_, res) => res.send('✅ Blokus server is running!'));
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));



const games = {};
const BOARD_SIZE = 14;

const START_POSITIONS = {
  0: [4, 4], // Player 0 start
  1: [9, 9]  // Player 1 start
};

// All 21 Blokus pieces
const allPieces = [
  [[0,0]],
  [[0,0],[0,1]],
  [[0,0],[0,1],[0,2]],
  [[0,0],[0,1],[0,2],[0,3]],
  [[0,0],[0,1],[0,2],[0,3],[0,4]],
  [[0,0],[0,1],[1,1]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[1,0],[1,1],[1,2]],
  [[0,0],[1,0],[1,1],[2,1]],
  [[0,0],[1,0],[1,1],[2,0]],
  [[0,0],[1,0],[1,1],[1,2],[1,3]],
  [[0,0],[0,1],[0,2],[1,1],[1,2]],
  [[0,0],[0,1],[1,1],[1,2],[2,1]],
  [[0,0],[0,2],[1,0],[1,1],[1,2]],
  [[0,1],[1,0],[1,1],[1,2],[2,1]],
  [[0,0],[0,1],[0,2],[1,1],[2,1]],
  [[0,0],[0,1],[0,2],[1,2],[2,2]],
  [[0,0],[0,1],[0,2],[0,3],[1,1]],
  [[0,0],[1,0],[1,1],[2,1],[2,2]],
  [[0,0],[1,0],[1,1],[1,2],[2,2]],
  [[0,0],[1,0],[1,1],[2,1],[3,1]]
];

// Utiliy functions
function transformPiece(piece, rotation, flipMode) {
  let newPiece = piece.map(([x, y]) => [x, y]);

  // Apply rotation 90° per step (counter-clockwise)
  for (let i = 0; i < rotation; i++) {
    newPiece = newPiece.map(([x, y]) => [-y, x]);
  }

  // Apply flips
  if (flipMode === 'horizontal') {
    newPiece = newPiece.map(([x, y]) => [x, -y]);
  } else if (flipMode === 'vertical') {
    newPiece = newPiece.map(([x, y]) => [-x, y]);
  }
  return newPiece;
}
function playerIndexFor(player, game) {
  return game.players.findIndex(p => p.id === player.id);
}

// Game end logic
function endGame(roomId) {
  const game = games[roomId];
  if (!game) return;

  const scores = game.players.map(player => {
    const unusedSizes = allPieces
      .filter((_, idx) => !player.usedPieces.includes(idx))
      .map(p => p.length);
    const totalPenalty = unusedSizes.reduce((a, b) => a + b, 0);
    return { name: player.name, score: totalPenalty };
  });

  io.to(roomId).emit("gameOver", scores);
}

function isValidPlacement(game, player, piece, baseRow, baseCol) {
  const board = game.board;
  const size = board.length;
  let touchesCorner = false;

  // 1️⃣ Bounds + overlap check
  for (const [dx, dy] of piece) {
    const row = baseRow + dx;
    const col = baseCol + dy;
    if (row < 0 || row >= size || col < 0 || col >= size) {
      return false; // out of bounds
    }
    if (board[row][col] !== null) {
      return false; // overlapping existing cell
    }
  }

  // 2️⃣ Gather all current player's cells
  const playerSquares = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === player.name) {
        playerSquares.push([r, c]);
      }
    }
  }

  const isFirstMove = playerSquares.length === 0;

  // 3️⃣ First move must cover corner
  if (isFirstMove) {
    const [startRow, startCol] = START_POSITIONS[playerIndexFor(player, game)];
    const coversStart = piece.some(([dx, dy]) =>
      baseRow + dx === startRow && baseCol + dy === startCol
    );
    return coversStart;
  }

  // 4️⃣ For later moves, must touch at least one diagonal corner,
  //     and not touch edges directly
  for (const [dx, dy] of piece) {
    const row = baseRow + dx;
    const col = baseCol + dy;

    // Direct edge contact (invalid)
    const edges = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];
    if (edges.some(([r, c]) => board[r]?.[c] === player.name)) {
      return false;
    }

    // Diagonal corner contact (valid)
    const corners = [
      [row - 1, col - 1],
      [row - 1, col + 1],
      [row + 1, col - 1],
      [row + 1, col + 1],
    ];
    if (corners.some(([r, c]) => board[r]?.[c] === player.name)) {
      touchesCorner = true;
    }
  }

  return touchesCorner;
}


function hasValidMove(player, game) {
  const unused = allPieces.filter((_, i) => !player.usedPieces.includes(i));
  for (const piece of unused)
    for (let r = 0; r < 4; r++)
      for (const f of ['none', 'horizontal', 'vertical'])
        for (let row = 0; row < BOARD_SIZE; row++)
          for (let col = 0; col < BOARD_SIZE; col++)
            if (isValidPlacement(game, player, transformPiece(piece, r, f), row, col))
              return true;
  return false;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  socket.on('disconnect', () => console.log(`🔴 Disconnected: ${socket.id}`));
  socket.on('createRoom', (name, ack) => {
    try {
      if (!name) return ack?.({ ok:false, error:'Name required' });

      const roomId = uuidv4().slice(0, 6);
      const board = Array.from({ length: 14 }, () => Array(14).fill(null));

      games[roomId] = {
        board,
        players: [{ id: socket.id, name, color: 'blue', usedPieces: [] }],
        currentTurn: socket.id,
        lastMove: []
      };

      socket.join(roomId);
      console.log(`✅ Room ${roomId} created by ${name}`);
      ack?.({ ok:true, roomId });

      syncGameState(roomId);

      // Send initial state to creator so UI shows immediately
      const room = games[roomId];
      const colorMap = { [name]: 'blue' };

      io.to(roomId).emit('playerColors', colorMap);
      io.to(roomId).emit('playerList', room.players.map(p => ({ name: p.name, color: p.color })));
      io.to(roomId).emit('updateBoard', { board: room.board, lastMove: room.lastMove });

      // Creator starts (joiner will get 'waitTurn' when they join)
      io.to(room.currentTurn).emit('yourTurn');
    } catch (e) {
      console.error(e);
      ack?.({ ok:false, error:'Server error creating room' });
    }
  });

  function syncGameState(roomId) {
    const game = games[roomId];
    if (!game) return;

    // send the full state to both players
    const colorMap = {};
    game.players.forEach(p => (colorMap[p.name] = p.color));

    io.to(roomId).emit("playerColors", colorMap);
    io.to(roomId).emit("playerList", game.players.map(p => ({ name: p.name, color: p.color })));
    io.to(roomId).emit("updateBoard", { board: game.board, lastMove: game.lastMove });
    console.log('📤 Emitting playerList:', game.players.map(p => p.name));
    // turn indicators
    const currentTurnPlayer = game.players.find(p => p.id === game.currentTurn);
    const waitingPlayer = game.players.find(p => p.id !== game.currentTurn);

    if (currentTurnPlayer) io.to(currentTurnPlayer.id).emit("yourTurn");
    if (waitingPlayer) io.to(waitingPlayer.id).emit("waitTurn");
  }

  // Joining or creating a room
  socket.on('joinRoom', ({ roomId, name }, ack) => {
    try {
      const room = games[roomId];
      if (!room) return ack?.({ ok:false, error:'Room not found' });
      if (!name) return ack?.({ ok:false, error:'Name required' });

      // Try to find existing by name OR socket id
      let existing = room.players.find(p => p.name === name) || room.players.find(p => p.id === socket.id);

      if (existing) {
        // Reconnect/update socket id
        existing.id = socket.id;
        console.log(`♻️ ${name} reconnected to ${roomId}`);
      } else {
        if (room.players.length >= 2) return ack?.({ ok:false, error:'Room full' });
        const newColor = room.players.some(p => p.color === 'blue') ? 'orange' : 'blue';
        room.players.push({ id: socket.id, name, color: newColor, usedPieces: [] });
        console.log(`👤 ${name} joined ${roomId}`);
      }

      socket.join(roomId);
      ack?.({ ok:true });

      // keep your syncGameState(roomId) call here
      syncGameState(roomId);
    } catch (e) {
      console.error(e);
      ack?.({ ok:false, error:'Server error joining room' });
    }
  });

  // Placing a move
  socket.on("placeMove", ({ row, col, roomId, pieceIndex, rotation = 0, flipMode = "none" }) => {
    const game = games[roomId];
    if (!game) return;
    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    const rowIndex = row - 1;
    const colIndex = col - 1;
    const selectedPiece = transformPiece(allPieces[pieceIndex], rotation, flipMode);

    // Validate move
    if (!isValidPlacement(game, player, selectedPiece, rowIndex, colIndex)) {
      socket.emit("invalidMove", "❌ Invalid move. Check placement rules.");
      return;
    }

    if (player.usedPieces.includes(pieceIndex)) {
      socket.emit("invalidMove", "❌ You've already used this piece.");
      return;
    }

    // Apply move
    const placedCells = [];
    for (const [dx, dy] of selectedPiece) {
      game.board[rowIndex + dx][colIndex + dy] = player.name;
      placedCells.push({ row: rowIndex + dx, col: colIndex + dy });
    }
    player.usedPieces.push(pieceIndex);
    game.lastMove = placedCells;

    socket.emit("updateUsedPieces", player.usedPieces);
    const opponent = game.players.find(p => p.id !== socket.id);
    if (opponent) io.to(opponent.id).emit("opponentUsedPieces", player.usedPieces);

    // Broadcast updated board
    io.to(roomId).emit("updateBoard", { board: game.board, lastMove: game.lastMove });

    // Turn management
    const otherPlayer = game.players.find(p => p.id !== socket.id);
    if (!otherPlayer) return;

    if (hasValidMove(otherPlayer, game)) {
      game.currentTurn = otherPlayer.id;
      io.to(otherPlayer.id).emit("yourTurn");
      io.to(socket.id).emit("waitTurn");
    } else if (hasValidMove(player, game)) {
      game.currentTurn = socket.id;
      io.to(socket.id).emit("yourTurn");
      io.to(otherPlayer.id).emit("waitTurn");
    } else {
      endGame(roomId);
    }

    console.log(`🧱 ${player.name} placed piece ${pieceIndex} at (${row}, ${col})`);
  });
});
