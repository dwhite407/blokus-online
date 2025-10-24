export function transformPiece(piece, rotation, flip) {
  let p = piece
  for (let i=0;i<rotation;i++) p = p.map(([x,y]) => [-y, x])
  if (flip === 'horizontal') p = p.map(([x,y]) => [x, -y])
  else if (flip === 'vertical') p = p.map(([x,y]) => [-x, y])
  return p
}

export function normalizePiece(piece) {
  const minX = Math.min(...piece.map(([x]) => x))
  const minY = Math.min(...piece.map(([_,y]) => y))
  return piece.map(([x,y]) => [x - minX, y - minY])
}

export function getShapeBox(shape) {
  const maxX = Math.max(...shape.map(([x]) => x))
  const maxY = Math.max(...shape.map(([_,y]) => y))
  return { width: maxY + 1, height: maxX + 1 }
}