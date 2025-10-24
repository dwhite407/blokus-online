```
A modernized web version (coming soon)j of **Blokus**, featuring a React + Socket.IO frontent and a Node.js backend.
Built for real-time, two-player gameplay...place, rotate, and flip pieces, competing for space!
```
[GAME RULES](./GAME_RULES.md)
```
QUICK START
git clone https://github.com/dwhite407/blokus-online.git
cd blokus-online
npm install

---OPEN ANOTHER TERMINAL---
cd ../client
npm install

---RUN SERVERS---
cd blokus-online
node server.js

(You should see "Server listening on port 3001")

---RUN THE FRONTEND (VITE DEV SERVER)---
cd ../client
npm run dev

(vite will print a local URL "http://localhost:5173/")

Open the vite URL in two separate windows or tabs
You should be able to see both players and play the game
```
```
TECH STACK
Frontend: React(Vite), Socket.IO, CSS |
Backend: Node.js, Express, Socket.IO |
Language: JavaScript
```
```
CURRENT FEATURES
-Real-time multiplayer
-modern dark UI theme
-Rotate, flip, reset
-Edge-touch prevention, piece placement validation
-used-piece tracker per player
-animations for recent moves
-game over scoring by unused piece squares
```
```
SOCKET EVENTS
Client ---> Server:
joinRoom({ roomID, name })
placeMove({ row, col, roomid, pieceIndex, rotation, flipMode})

Server ---> Client:
yourTurn / waitTurn
updateBoard({ board, lastMove })
updateUsedPieces([indices])
opponentUsedPieces([indices])
playerList([{ name, color }])
playerColors({ name: color })
invalidMove(message)
gameOver(scores)
```
```
FUTURE FEATURES
-Lobby/names/accounts
-Render/vercel deployment
-UI enhancements
-Persistent scores/stats
-Fit on one screen
-Mobile compatibility
-Apple GamePigeon implementation
```
```
AUTHOR
Drew White - Computer Science @ Indiana University Indianapolis |
Built to explore real-time web applications and interactive game design

LICENSE
MIT - Free to use, modify, and learn from
```
```
IMAGES
```
<img width="938" height="739" alt="image" src="https://github.com/user-attachments/assets/f4d21dcd-bd34-46b8-abbe-a0d2109dc856" />
<img width="939" height="902" alt="image" src="https://github.com/user-attachments/assets/7a369306-7077-40e3-a24d-93db765e6f12" />
