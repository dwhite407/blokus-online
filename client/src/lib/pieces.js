export const allPieces = [
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
]