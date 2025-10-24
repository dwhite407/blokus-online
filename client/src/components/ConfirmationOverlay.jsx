export default function ConfirmationOverlay({ left, top, onConfirm, onCancel }) {
  return (
    <div id="confirmationControls" style={{
      position:'absolute', zIndex:100, display:'flex', gap:5,
      left, top
    }}>
      <button className="confirm" style={{ background:'green', color:'#fff' }} onClick={onConfirm}>✅</button>
      <button className="cancel" style={{ background:'red', color:'#fff' }} onClick={onCancel}>❌</button>
    </div>
  )
}