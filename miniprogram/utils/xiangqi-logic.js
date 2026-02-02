// miniprogram/utils/xiangqi-logic.js

const PIECE_TYPES = {
  KING: 'k',     // 将/帅
  ADVISOR: 'a',  // 士/仕
  ELEPHANT: 'e', // 象/相
  HORSE: 'h',    // 马/傌
  CHARIOT: 'r',  // 车/俥
  CANNON: 'c',   // 炮/砲
  SOLDIER: 's'   // 卒/兵
};

const COLORS = {
  RED: 'r',
  BLACK: 'b'
};

class XiangqiGame {
  constructor() {
    this.board = Array(10).fill(null).map(() => Array(9).fill(null));
    this.turn = COLORS.RED; // Red moves first
    this.gameOver = false;
    this.winner = null;
    this.history = [];
    this.reset();
  }

  reset() {
    this.board = Array(10).fill(null).map(() => Array(9).fill(null));
    this.turn = COLORS.RED;
    this.gameOver = false;
    this.winner = null;
    this.history = [];
    this.setupBoard();
  }

  setupBoard() {
    // Red (Lines 9-6)
    const redPieces = [
      { type: PIECE_TYPES.CHARIOT, row: 9, col: 0 },
      { type: PIECE_TYPES.HORSE, row: 9, col: 1 },
      { type: PIECE_TYPES.ELEPHANT, row: 9, col: 2 },
      { type: PIECE_TYPES.ADVISOR, row: 9, col: 3 },
      { type: PIECE_TYPES.KING, row: 9, col: 4 },
      { type: PIECE_TYPES.ADVISOR, row: 9, col: 5 },
      { type: PIECE_TYPES.ELEPHANT, row: 9, col: 6 },
      { type: PIECE_TYPES.HORSE, row: 9, col: 7 },
      { type: PIECE_TYPES.CHARIOT, row: 9, col: 8 },
      { type: PIECE_TYPES.CANNON, row: 7, col: 1 },
      { type: PIECE_TYPES.CANNON, row: 7, col: 7 },
      { type: PIECE_TYPES.SOLDIER, row: 6, col: 0 },
      { type: PIECE_TYPES.SOLDIER, row: 6, col: 2 },
      { type: PIECE_TYPES.SOLDIER, row: 6, col: 4 },
      { type: PIECE_TYPES.SOLDIER, row: 6, col: 6 },
      { type: PIECE_TYPES.SOLDIER, row: 6, col: 8 },
    ];

    redPieces.forEach(p => {
      this.board[p.row][p.col] = { type: p.type, color: COLORS.RED };
    });

    // Black (Lines 0-3)
    const blackPieces = [
      { type: PIECE_TYPES.CHARIOT, row: 0, col: 0 },
      { type: PIECE_TYPES.HORSE, row: 0, col: 1 },
      { type: PIECE_TYPES.ELEPHANT, row: 0, col: 2 },
      { type: PIECE_TYPES.ADVISOR, row: 0, col: 3 },
      { type: PIECE_TYPES.KING, row: 0, col: 4 },
      { type: PIECE_TYPES.ADVISOR, row: 0, col: 5 },
      { type: PIECE_TYPES.ELEPHANT, row: 0, col: 6 },
      { type: PIECE_TYPES.HORSE, row: 0, col: 7 },
      { type: PIECE_TYPES.CHARIOT, row: 0, col: 8 },
      { type: PIECE_TYPES.CANNON, row: 2, col: 1 },
      { type: PIECE_TYPES.CANNON, row: 2, col: 7 },
      { type: PIECE_TYPES.SOLDIER, row: 3, col: 0 },
      { type: PIECE_TYPES.SOLDIER, row: 3, col: 2 },
      { type: PIECE_TYPES.SOLDIER, row: 3, col: 4 },
      { type: PIECE_TYPES.SOLDIER, row: 3, col: 6 },
      { type: PIECE_TYPES.SOLDIER, row: 3, col: 8 },
    ];

    blackPieces.forEach(p => {
      this.board[p.row][p.col] = { type: p.type, color: COLORS.BLACK };
    });
  }

  // Check if a move is pseudo-legal (geometry only, ignoring checks)
  isValidMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow < 0 || fromRow > 9 || fromCol < 0 || fromCol > 8 ||
        toRow < 0 || toRow > 9 || toCol < 0 || toCol > 8) {
      return false;
    }

    if (fromRow === toRow && fromCol === toCol) return false;

    const piece = this.board[fromRow][fromCol];
    const target = this.board[toRow][toCol];

    if (!piece || piece.color !== this.turn) return false;
    if (target && target.color === piece.color) return false;

    const dRow = toRow - fromRow;
    const dCol = toCol - fromCol;
    const absDRow = Math.abs(dRow);
    const absDCol = Math.abs(dCol);

    switch (piece.type) {
      case PIECE_TYPES.KING:
        // Orthogonal, 1 step, in palace
        if (absDRow + absDCol !== 1) return false;
        if (!this.isInPalace(toRow, toCol, piece.color)) return false;
        return true;

      case PIECE_TYPES.ADVISOR:
        // Diagonal, 1 step, in palace
        if (absDRow !== 1 || absDCol !== 1) return false;
        if (!this.isInPalace(toRow, toCol, piece.color)) return false;
        return true;

      case PIECE_TYPES.ELEPHANT:
        // Diagonal, 2 steps, no river crossing, no blocking eye
        if (absDRow !== 2 || absDCol !== 2) return false;
        if (piece.color === COLORS.RED && toRow < 5) return false;
        if (piece.color === COLORS.BLACK && toRow > 4) return false;
        const eyeRow = fromRow + dRow / 2;
        const eyeCol = fromCol + dCol / 2;
        if (this.board[eyeRow][eyeCol]) return false; // Blocked
        return true;

      case PIECE_TYPES.HORSE:
        // L-shape, check blocking leg
        if (!((absDRow === 2 && absDCol === 1) || (absDRow === 1 && absDCol === 2))) return false;
        if (absDRow === 2) {
          // Vertical move, check row leg
          const legRow = fromRow + (dRow > 0 ? 1 : -1);
          if (this.board[legRow][fromCol]) return false;
        } else {
          // Horizontal move, check col leg
          const legCol = fromCol + (dCol > 0 ? 1 : -1);
          if (this.board[fromRow][legCol]) return false;
        }
        return true;

      case PIECE_TYPES.CHARIOT:
        // Orthogonal, any distance, no jump
        if (fromRow !== toRow && fromCol !== toCol) return false;
        return this.countObstacles(fromRow, fromCol, toRow, toCol) === 0;

      case PIECE_TYPES.CANNON:
        // Move like Rook to empty, jump 1 to capture
        if (fromRow !== toRow && fromCol !== toCol) return false;
        const obstacles = this.countObstacles(fromRow, fromCol, toRow, toCol);
        if (target) {
          // Capture needs 1 screen
          return obstacles === 1;
        } else {
          // Move needs 0 obstacles
          return obstacles === 0;
        }

      case PIECE_TYPES.SOLDIER:
        // Forward 1, after river sideways allowed
        const forward = piece.color === COLORS.RED ? -1 : 1;
        
        // Cannot move back
        if (piece.color === COLORS.RED && dRow > 0) return false;
        if (piece.color === COLORS.BLACK && dRow < 0) return false;

        // Before river (Red row > 4, Black row < 5): Only forward
        const crossedRiver = piece.color === COLORS.RED ? fromRow <= 4 : fromRow >= 5;

        if (!crossedRiver) {
          if (fromCol !== toCol) return false; // Sideways not allowed
          if (dRow !== forward) return false; // Only 1 step forward
        } else {
          // After river: forward or sideways 1 step
          if (absDRow + absDCol !== 1) return false;
          if (dRow !== 0 && dRow !== forward) return false; // Cannot go back
        }
        return true;
    }

    return false;
  }

  // Count pieces between two points (exclusive)
  countObstacles(r1, c1, r2, c2) {
    let count = 0;
    if (r1 === r2) {
      const minC = Math.min(c1, c2);
      const maxC = Math.max(c1, c2);
      for (let c = minC + 1; c < maxC; c++) {
        if (this.board[r1][c]) count++;
      }
    } else if (c1 === c2) {
      const minR = Math.min(r1, r2);
      const maxR = Math.max(r1, r2);
      for (let r = minR + 1; r < maxR; r++) {
        if (this.board[r][c1]) count++;
      }
    }
    return count;
  }

  isInPalace(row, col, color) {
    if (col < 3 || col > 5) return false;
    if (color === COLORS.RED) return row >= 7 && row <= 9;
    return row >= 0 && row <= 2;
  }

  // Make move if legal, including check safety
  makeMove(fromRow, fromCol, toRow, toCol) {
    if (this.gameOver) return false;
    
    // 1. Check geometry logic
    if (!this.isValidMove(fromRow, fromCol, toRow, toCol)) return false;

    // 2. Flying General Check simulation (kings cannot face each other directly without screen)
    // Actually, this should be part of "isKingSafe" check after move.
    
    // Simulate move
    const movingPiece = this.board[fromRow][fromCol];
    const targetPiece = this.board[toRow][toCol];

    this.board[toRow][toCol] = movingPiece;
    this.board[fromRow][fromCol] = null;
    
    // 3. Check if own King is now in check (Illegal move)
    // Find own king
    const kingPos = this.findKing(this.turn);
    if (!kingPos) {
      // Should not happen, but revert
      this.board[fromRow][fromCol] = movingPiece;
      this.board[toRow][toCol] = targetPiece;
      return false;
    }

    if (this.isSpotUnderAttack(kingPos.row, kingPos.col, this.turn)) {
       // Revert
       this.board[fromRow][fromCol] = movingPiece;
       this.board[toRow][toCol] = targetPiece;
       return false;
    }
    
    // 4. Flying General Check: After move, are kings facing each other with no obstacles?
    if (this.areKingsFacing()) {
       // Revert
       this.board[fromRow][fromCol] = movingPiece;
       this.board[toRow][toCol] = targetPiece;
       return false;
    }

    // Move committed
    this.history.push({
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      captured: targetPiece,
      color: this.turn
    });

    this.turn = this.turn === COLORS.RED ? COLORS.BLACK : COLORS.RED;
    
    // Check for checkmate/stalemate
    const nextKingPos = this.findKing(this.turn);
    const isCheck = this.isSpotUnderAttack(nextKingPos.row, nextKingPos.col, this.turn);
    
    if (!this.hasLegalMoves(this.turn)) {
      this.gameOver = true;
      // If checked and no moves -> lost. If not checked and no moves -> lost (Xiangqi rule: stalemate is loss for trapped side usually, but simplifies to "no valid moves = loss")
      this.winner = this.turn === COLORS.RED ? COLORS.BLACK : COLORS.RED; 
    }

    return true;
  }
  
  findKing(color) {
    for(let r=0; r<10; r++) {
      for(let c=0; c<9; c++) {
        const p = this.board[r][c];
        if (p && p.type === PIECE_TYPES.KING && p.color === color) {
           return {row: r, col: c};
        }
      }
    }
    return null;
  }
  
  // Check if kings are facing each other in the same column with no pieces in between
  areKingsFacing() {
    const redKing = this.findKing(COLORS.RED);
    const blackKing = this.findKing(COLORS.BLACK);
    
    if (!redKing || !blackKing) return false; // Should not happen
    if (redKing.col !== blackKing.col) return false;
    
    // Check obstacles
    const obstacles = this.countObstacles(blackKing.row, blackKing.col, redKing.row, redKing.col);
    return obstacles === 0;
  }

  // Is a spot (r, c) attacked by opponent of 'myColor'?
  isSpotUnderAttack(r, c, myColor) {
    const opponentColor = myColor === COLORS.RED ? COLORS.BLACK : COLORS.RED;
    
    // Brute force: check all opponent pieces if they can move to (r, c)
    // Note: This needs to use a "capture" logic validation that doesn't recurse into self-check loops.
    // The `isValidMove` checks basic geometry.
    // DOES NOT CHECK "Flying General" here or "Self Check" here to avoid infinite loops.
    // Just geometry.
    
    for(let i=0; i<10; i++) {
      for(let j=0; j<9; j++) {
        const p = this.board[i][j];
        if (p && p.color === opponentColor) {
           // Can p move to (r, c)?
           // We use a simplified check that doesn't modify board state
           if (this.canAttack(i, j, r, c)) {
             return true;
           }
        }
      }
    }
    return false;
  }

  // Simplified valid move for attack checking (ignoring self-check)
  canAttack(fromRow, fromCol, toRow, toCol) {
    // Reuse isValidMove but carefully.
    // isValidMove calls isInPalace etc. which is fine.
    // It calls countObstacles which is fine.
    // BUT checking PAWN forward logic etc.
    // The only catch is isValidMove might be too heavy? No, it's just geometry.
    // It DOES NOT check if move exposes check.
    
    return this.isValidMove(fromRow, fromCol, toRow, toCol);
  }

  hasLegalMoves(color) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = this.board[r][c];
        if (p && p.color === color) {
          // Try all possible moves
          // Optimization: check common target spots
          // Brute force all board spots? 90 spots.
          for (let tr = 0; tr < 10; tr++) {
            for (let tc = 0; tc < 9; tc++) {
              if (this.isValidMove(r, c, tr, tc)) {
                 // Simulate check safety
                 const targetPiece = this.board[tr][tc];
                 
                 this.board[tr][tc] = p;
                 this.board[r][c] = null;
                 
                 let safe = true;
                 const kingPos = this.findKing(color);
                 if (this.isSpotUnderAttack(kingPos.row, kingPos.col, color) || this.areKingsFacing()) {
                   safe = false;
                 }
                 
                 // Revert
                 this.board[r][c] = p;
                 this.board[tr][tc] = targetPiece;
                 
                 if (safe) return true;
              }
            }
          }
        }
      }
    }
    return false;
  }
  
  getFen() {
    // Simplified FEN-like string if needed, or just return board state
    return JSON.stringify(this.board);
  }
}

module.exports = {
  XiangqiGame,
  PIECE_TYPES,
  COLORS
};
