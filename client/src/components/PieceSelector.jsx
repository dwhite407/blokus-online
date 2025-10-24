import React from 'react'
import { transformPiece, normalizePiece, getShapeBox } from '../lib/transform'

export default function PieceSelector({ color, usedPieces, allPieces, onSelect, readOnly=false }) {
  const groups = { 1:[], 2:[], 3:[], 4:[], 5:[] }

  allPieces.forEach((piece, index) => {
    const isUsed = usedPieces.includes(index)
    const norm = normalizePiece(transformPiece(piece, 0, 'none'))
    groups[norm.length].push({ index, norm, isUsed })
  })

  return (
    <>
      {Object.keys(groups).map(size => {
        const items = groups[size]
        return (
          <div key={size} className="piece-group">
            {items.map(({ index, norm, isUsed }) => {
              const { width, height } = getShapeBox(norm)
              return (
                <div
                  key={index}
                  className={`piece-button ${readOnly ? 'opponent-piece' : ''} ${isUsed ? 'used' : ''}`}
                  style={{ width: width*10+4, height: height*10+4, position:'relative', display:'inline-block' }}
                  onClick={() => { if (!readOnly && !isUsed) onSelect(index) }}
                >
                  {norm.map(([x,y]) => (
                    <div
                      key={`${x}-${y}`}
                      className="mini-cell"
                      style={{
                        position:'absolute',
                        left: y*10,
                        top: x*10,
                        width:10,height:10,
                        border:'1px solid #ccc',
                        backgroundColor: color
                      }}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        )
      })}
    </>
  )
}