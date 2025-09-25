const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",           // Allow connections from any frontend (just for testing)
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

app.get('/', (req, res) => {
  res.send('Blokus server is running!');
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

const games = {};

const START_POSITIONS = {
  0: [4, 4],   // Player 0 starts at (4,4)
  1: [9, 9]    // Player 1 starts at (9,9)
};

const allPieces = [
      [[0,0]], //1x1 piece
      [[0,0], [0,1]], //2x1 piece
      [[0,0], [0,1], [0,2]], //3x1 piece
      [[0,0], [0,1], [0,2], [0,3]], //4x1 piece
      [[0,0], [0,1], [0,2], [0,3], [0,4]], //5x1 piece
      [[0,0], [0,1], [1,1]], //3 square L piece
      [[0,0], [0,1], [1,0], [1,1]], //2x2 piece
      [[0,0], [1,0], [1,1], [1,2]], //4 square L piece
      [[0,0], [1,0], [1,1], [2,1]], //4 square zigzag
      [[0,0], [1,0], [1,1], [2,0]], //4 square cross
      [[0,0], [1,0], [1,1], [1,2], [1,3]], //5 square L piece with short length
      [[0,0], [0,1], [0,2], [1,1], [1,2]], //2x2 plus 1 at the top
      [[0,0], [0,1], [1,1], [1,2], [2,1]], //weird piece, looks like a seven while missing a side on the cross
      [[0,0], [0,2], [1,0], [1,1], [1,2]], //half of a square piece
      [[0,1], [1,0], [1,1], [1,2], [2,1]], //5 square cross **might need to double check this one
      [[0,0], [0,1], [0,2], [1,1], [2,1]], //large T
      [[0,0], [0,1], [0,2], [1,2], [2,2]], //big L piece (half of a square)
      [[0,0], [0,1], [0,2], [0,3], [1,1]], //half of a cross
      [[0,0], [1,0], [1,1], [2,1], [2,2]], //large zigazag piece
      [[0,0], [1,0], [1,1], [1,2], [2,2]], //large zigzag, kind of stretched out
      [[0,0], [1,0], [1,1], [2,1], [3,1]] //2 ontop of 3 piece (idk how to explain it)
    ];

function rotatePiece(piece) {
  return piece.map(([x, y]) => [-y, x]);
}

function flipPiece(piece) {
  return piece.map(([x, y]) => [x, -y]);
}

function normalizePiece(piece) {
  const minX = Math.min(...piece.map(([x, _]) => x));
  const minY = Math.min(...piece.map(([_, y]) => y));
  return piece.map(([x, y]) => [x - minX, y - minY]);
}

function rotateAndFlipPiece(piece, rotation, flipMode) {
  let newPiece = piece;
  for (let i = 0; i < rotation; i++) {
    newPiece = rotatePiece(newPiece);
  }
  if (flipMode === 'horizontal') {
    newPiece = newPiece.map(([x, y]) => [x, -y]);
  } else if (flipMode === 'vertical') {
    newPiece = newPiece.map(([x, y]) => [-x, y]);
  }
  return normalizePiece(newPiece);
}

function endGame(roomId) {
  const game = games[roomId];
  if (!game) return;

  const scores = game.players.map(player => {
    const unusedPieceSizes = allPieces
      .filter((_, index) => !player.usedPieces.includes(index))
      .map(p => p.length);

    const totalPenalty = unusedPieceSizes.reduce((a, b) => a + b, 0);

    return {
      name: player.name,
      score: totalPenalty // score = fewer unused squares
    };
  });

  io.to(roomId).emit("gameOver", scores);
}

function isValidPlacement(game, player, piece, baseRow, baseCol) {
  const board = game.board;
  const boardSize = 14;

  for (const [dx, dy] of piece) {
    const row = baseRow + dx;
    const col = baseCol + dy;

    if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) return false;
    if (board[row][col] !== null) return false;
  }

  let touchesCorner = false;

  const playerSquares = [];
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === player.name) {
        playerSquares.push([r, c]);
      }
    }
  }

  const isFirstMove = playerSquares.length === 0;
  if (isFirstMove) {
    const [startRow, startCol] = START_POSITIONS[playerIndexFor(player, game)];
    const coversStart = piece.some(([dx, dy]) => 
      baseRow + dx === startRow && baseCol + dy === startCol
    );
    if (!coversStart) return false;
  } else {
    for (const [dx, dy] of piece) {
      const row = baseRow + dx;
      const col = baseCol + dy;

      const touchesEdge = 
          board[row - 1]?.[col] === player.name ||
          board[row + 1]?.[col] === player.name ||
          board[row]?.[col - 1] === player.name ||
          board[row]?.[col + 1] === player.name;
      if (touchesEdge) return false;

      const corners = [
        [row - 1, col - 1],
        [row - 1, col + 1],
        [row + 1, col - 1],
        [row + 1, col + 1]
      ];

      for (const [cr, cc] of corners) {
        if (board[cr]?.[cc] === player.name) {
          touchesCorner = true;
        }
      }
    }
  
    if (!touchesCorner) return false;
  }

  return true;
}

function playerIndexFor(player, game) {
  return game.players.findIndex(p => p.id === player.id);
}

function hasValidMove(player, game) {
  const unused = allPieces.filter((_, index) => !player.usedPieces.includes(index));

  for (const [index, piece] of unused.entries()) {
    for (let rot = 0; rot < 4; rot++) {
      for (const flip of ['none', 'horizontal', 'vertical']) {
        let transformed = rotateAndFlipPiece(piece, rot, flip);

        for (let row = 0; row < 14; row++) {
          for (let col = 0; col < 14; col++) {
            if (isValidPlacement(game, player, transformed, row, col)) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  socket.on('joinRoom', ({ roomId, name }) => {
    const room = io.sockets.adapter.rooms.get(roomId) || new Set();

    if (room.size >= 2) {
      socket.emit('roomFull', 'This room is already full.');
    }
    socket.join(roomId);
    socket.emit('roomJoined', `You joined room: ${roomId}`);
    console.log(`Socket ${socket.id} (${name}) joined room ${roomId}`);
    // Create a new game board if room is new
    if (!games[roomId]) {
      games[roomId] = {
        board: Array.from({ length: 14 }, () => Array(14).fill(null)),
          players: [{ id: socket.id, name, color: "orange", usedPieces: [] }],
        currentTurn: socket.id
      };
    } else {
      // See if this name is already in the room (reconnect)
        let existingPlayer = games[roomId].players.find(p => p.name === name);

        if (existingPlayer) {
          const oldId = existingPlayer.id;
          existingPlayer.id = socket.id;
        
          console.log(`Player "${name}" reconnected, updating socket ID from ${oldId} to ${socket.id}`);
        
          // If they had the turn, preserve it
          if (games[roomId].currentTurn === oldId) {
            games[roomId].currentTurn = socket.id;
          }
        
          // Sync game state to reconnecting client
          socket.emit("updateBoard", games[roomId].board);
          socket.emit("updateUsedPieces", existingPlayer.usedPieces);

        
          if (games[roomId].currentTurn === socket.id) {
            socket.emit("yourTurn");
          } else {
            socket.emit("waitTurn");
          }  
        } else {
          games[roomId].players.push({ id: socket.id, name, usedPieces: [] });
        }

        if (games[roomId].players.length === 2) {
          const [player1, player2] = games[roomId].players;
        
          // Assign colors
          player1.color = "blue";
          player2.color = "orange";
        
          // Create color map
          const colorMap = {
            [player1.name]: player1.color,
            [player2.name]: player2.color
          };
        
          // Send color map for board rendering
          io.to(roomId).emit("playerColors", colorMap);
        
          // Send full player objects for name display
          io.to(roomId).emit("playerList", [
            { name: player1.name, color: player1.color },
            { name: player2.name, color: player2.color }
          ]);
        
          // Turn management
          io.to(games[roomId].currentTurn).emit("yourTurn");
          const otherPlayer = games[roomId].players.find(p => p.id !== games[roomId].currentTurn);
          io.to(otherPlayer.id).emit("waitTurn");
        
          console.log(`Starting game in room ${roomId}`);
          console.log(`Players: ${player1.name} (blue), ${player2.name} (orange)`);
        }
        
    }
    
    socket.on("placeMove", ({row, col, roomId, pieceIndex: selectedPieceIndex, rotation = 0, flipMode = "none" }) => {
      const game = games[roomId];
      const rowIndex = parseInt(row) - 1;
      const colIndex = parseInt(col) - 1;
      const player = game.players.find(p => p.id === socket.id);
      const playerIndex = playerIndexFor(player, game);
      let hasPlacedFirstPiece = false;
      let cornerTouchValid = false;
      let placedCells = [];
      let corners =[];
      let myCells = [];

      if (!game) return;

      let selectedPiece = allPieces[selectedPieceIndex]; // ✅ FIX: define the piece to transform


      selectedPiece = rotateAndFlipPiece(selectedPiece, rotation, flipMode);

      for ([dx, dy] of selectedPiece){ //cycles through to get all of the squares of multisquare piececs
        targetRow = rowIndex + dx; 
        targetCol = colIndex + dy;

        if (targetRow < 0 || targetRow >= 14 || targetCol < 0 || targetCol >= 14){ //cannot place pieces outside of the board
          socket.emit("invalidMove", "You placed something outside of the boundary");
          return;
        }else if (game.board[targetRow][targetCol] !== null){ //handles case in which places cannot overlap
          socket.emit("invalidMove", "There is already a game piece there!");
          return;
        }  
        
      }
      
      if (game.currentTurn !== socket.id){
        socket.emit("notYourTurn", "Wait your turn");
        return;
      }

      for (let r = 0; r < 14; r++){
        for (let c = 0; c < 14; c++){
          if (game.board[r][c] === player.name){
            myCells.push({ row: r, col: c});
          }
        }
      }

      for ({row, col} of myCells){
        corners.push({ row: row - 1, col: col - 1 });
        corners.push({ row: row - 1, col: col + 1 });
        corners.push({ row: row + 1, col: col - 1 });
        corners.push({ row: row + 1, col: col + 1 });
      }
      for ([dx, dy] of selectedPiece){
        const targetRow = rowIndex + dx;
        const targetCol = colIndex + dy;

        if (game.board[targetRow - 1]?.[targetCol] === player.name 
          || game.board[targetRow + 1]?.[targetCol] === player.name 
          || game.board[targetRow]?.[targetCol - 1] === player.name 
          || game.board[targetRow]?.[targetCol + 1] === player.name)
          {
          socket.emit("invalidMove", "Pieces cannot touch edges of your own color!");
          return;
        }

        for (const corner of corners){
          if (corner.row === targetRow && corner.col === targetCol) {
            cornerTouchValid = true;
          }
        }
      }
      
      hasPlacedFirstPiece = myCells.length > 0;

      if (!hasPlacedFirstPiece) {
        const [startRow, startCol] = START_POSITIONS[playerIndexFor(player, game)];
        const coversStart = selectedPiece.some(([dx, dy]) =>
          rowIndex + dx === startRow && colIndex + dy === startCol
        );
        if (!coversStart) {
          socket.emit("invalidMove", "Your first piece must cover your starting square.");
          return;
        }
      }

      if (!cornerTouchValid && hasPlacedFirstPiece){
        socket.emit("invalidMove", "Piece must touch one of your corners");
        return;
      }

      if (player.usedPieces.includes(selectedPieceIndex)) {
          socket.emit("invalidMove", "You've already used this piece.");
          return;
      }

      //makes current move
      for ([dx, dy] of selectedPiece){
        game.board[rowIndex + dx][colIndex + dy] = player.name;
        placedCells.push({row: rowIndex + dx, col: colIndex + dy});
      }
      game.lastMove = placedCells;
      player.usedPieces.push(selectedPieceIndex);
      socket.emit("updateUsedPieces", player.usedPieces);
      const allUsed = game.players.every(p => p.usedPieces.length === allPieces.length);
      if (allUsed) {
        endGame(roomId);
      }
      const opponent = game.players.find(p => p.id !== socket.id);
      if (opponent) {
        io.to(opponent.id).emit("opponentUsedPieces", player.usedPieces);
      }

      //displays the updated board
      io.to(roomId).emit("updateBoard", { 
        board: game.board, 
        lastMove: game.lastMove 
      });

      //switch player turns
      //game.currentTurn = game.players.find(p => p.id !== socket.id).id;
      //tells both players turn switch
      //io.to(game.currentTurn).emit("yourTurn");
      //socket.emit("waitTurn");

      console.log(`Player ${socket.id} places a tile at (${row}, ${col}) in room ${roomId}`);

      const currentPlayerIndex = game.players.findIndex(p => p.id === socket.id);
      const otherPlayerIndex = 1 - currentPlayerIndex;

      const otherPlayer = game.players[otherPlayerIndex];

      if (hasValidMove(otherPlayer, game)) {
        game.currentTurn = otherPlayer.id;
        io.to(otherPlayer.id).emit("yourTurn");
        io.to(socket.id).emit("waitTurn");
      } else if (hasValidMove(player, game)) {
        // Only current player can still move
        game.currentTurn = socket.id;
        io.to(socket.id).emit("yourTurn");
        io.to(otherPlayer.id).emit("waitTurn");
      } else {
        // Neither can move
        endGame(roomId);
      }
    });

  });

});
