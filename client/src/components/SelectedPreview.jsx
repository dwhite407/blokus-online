import React from 'react'
import { normalizePiece } from '../lib/transform'

export default function SelectedPreview({ color, shape }) {
  const norm = normalizePiece(shape)
  return (
    <div id="selectedPiecePreview" style={{
      display:'flex', alignItems:'center', margin:'10px 0', height:40,
      padding:10, paddingTop:20, borderRadius:8, justifyContent:'center', position:'relative', minHeight:60
    }}>
      <div className="preview-piece" style={{ position:'relative', height:60 }}>
        {norm.map(([x,y]) => (
          <div
            key={`${x}-${y}`}
            className="preview-cell"
            style={{
              position:'absolute',
              left: y*20, top: x*20,
              width:20, height:20,
              border:'1px solid #ccc',
              backgroundColor: color
            }}
          />
        ))}
      </div>
    </div>
  )
}