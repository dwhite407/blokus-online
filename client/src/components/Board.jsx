import React, { forwardRef } from 'react'

const Board = forwardRef(function Board(
  {
    board, lastMove, playerColors, boardSize,
    shape, myTurn, selectedPieceIndex, usedPieces,
    onCellEnter, onCellClick,
    startCorners = []
  },
  ref
) {
  const cellIsOccupied = (r, c) => board[r]?.[c] != null

  return (
    <div
      id="board"
      ref={ref}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${boardSize}, 30px)`,
        gridTemplateRows: `repeat(${boardSize}, 30px)`,
        gap: '1px',
        marginTop: '20px',
        placeContent: 'center'
      }}
    >
      {Array.from({ length: boardSize }).map((_, r) =>
        Array.from({ length: boardSize }).map((_, c) => {
          const value = board[r][c]
          const classes = ['cell']
          if (value == null) classes.push('empty-cell')

          // last-move highlight
          const isLast = Array.isArray(lastMove) && lastMove.some(m => m.row === r && m.col === c)
          if (isLast) classes.push('highlighted')

          const bg = value == null ? 'lightgrey' : (playerColors[value] || 'grey')

          return (
            <div
              key={`${r}-${c}`}
              id={`cell-${r}-${c}`}
              className={classes.join(' ')}
              data-row={r + 1}
              data-col={c + 1}
              style={{
                width: 30,
                height: 30,
                backgroundColor: bg,
                border: '1px solid black',
                boxSizing: 'border-box',
                transition: 'background-color .15s ease',
                position: 'relative' // enable absolute centering for the corner dot
              }}
              onMouseEnter={(e) => {
                if (!myTurn || usedPieces.includes(selectedPieceIndex)) return
                // clear previews
                document.querySelectorAll('.hover-preview,.invalid-preview')
                  .forEach(el => { el.classList.remove('hover-preview'); el.classList.remove('invalid-preview') })
                onCellEnter(r, c, e.currentTarget)
                // paint preview for the transformed shape
                shape.forEach(([dx, dy]) => {
                  const rr = r + dx, cc = c + dy
                  const previewCell = document.getElementById(`cell-${rr}-${cc}`)
                  if (!previewCell) return
                  if (cellIsOccupied(rr, cc)) previewCell.classList.add('invalid-preview')
                  else previewCell.classList.add('hover-preview')
                })
              }}
              onMouseLeave={() => {
                document.querySelectorAll('.hover-preview,.invalid-preview')
                  .forEach(el => { el.classList.remove('hover-preview'); el.classList.remove('invalid-preview') })
              }}
              onClick={(e) => onCellClick(r, c, e.currentTarget)}
            >
              {/* starting corner dot (only show if empty) */}
              {startCorners.some(([sr, sc]) => sr === r && sc === c) && board[r][c] == null && (
                <div className="corner-circle" />
              )}
            </div>
          )
        })
      )}
    </div>
  )
})

export default Board
