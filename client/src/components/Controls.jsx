export default function Controls({ onRotateLeft, onRotateRight, onFlipH, onFlipV }) {
  return (
    <div id="pieceControls" className="card">
      <button className="btn" onClick={onRotateLeft}>⟲ Rotate Left (Q)</button>
      <button className="btn" onClick={onRotateRight}>⟳ Rotate Right (E)</button>
      <button className="btn" onClick={onFlipH}>↔ Flip H (Z)</button>
      <button className="btn" onClick={onFlipV}>↕ Flip V (X)</button>
    </div>
  )
}
