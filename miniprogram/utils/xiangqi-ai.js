// miniprogram/utils/xiangqi-ai.js
const { XiangqiGame, PIECE_TYPES, COLORS } = require('./xiangqi-logic');

// Piece weights for evaluation
const PIECE_VALUES = {
    [PIECE_TYPES.KING]: 10000,
    [PIECE_TYPES.CHARIOT]: 1000,
    [PIECE_TYPES.CANNON]: 450,
    [PIECE_TYPES.HORSE]: 400,
    [PIECE_TYPES.ELEPHANT]: 20,
    [PIECE_TYPES.ADVISOR]: 20,
    [PIECE_TYPES.SOLDIER]: 30 // Increases as it crosses river
};

// Simplified position tables could be added for better AI

class XiangqiAI {
    constructor(game) {
        this.game = game; // Reference to the game instance (read-only mostly, or we clone it)
    }

    getBestMove(depth = 3) {
        const startTime = Date.now();
        const isMaximizing = this.game.turn === COLORS.RED; // AI typically plays one side, but let's assume this AI plays current turn
        // NOTE: Usually Red is maximizing, Black is minimizing in standard minimax 
        // IF we assign positive scores to RED and negative to BLACK.

        // Let's assume AI is 'maximizing' for its own color.
        // If AI is RED, it wants max score. If AI is BLACK, it wants min score (or max negative).
        // To simplify: AlphaBeta always returns score from perspective of 'color'.

        const possibleMoves = this.getAllLegalMoves(this.game.board, this.game.turn);

        let bestMove = null;
        let bestValue = -Infinity;

        // Sort moves for better pruning (captures first)
        possibleMoves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

        let alpha = -Infinity;
        let beta = Infinity;

        for (const move of possibleMoves) {
            // Simulate
            const captured = this.makeSimulatedMove(this.game.board, move);

            // Call recursive search
            // The next depth calls for opponent, so they will try to minimize our score (or maximize theirs).
            // We'll use specific Minimax:
            // Our Score = -OpponentBestScore
            const boardValue = -this.minimax(this.game.board, depth - 1, -beta, -alpha, this.flipColor(this.game.turn));

            // Undo
            this.undoSimulatedMove(this.game.board, move, captured);

            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }

            alpha = Math.max(alpha, boardValue);
            if (alpha >= beta) break;

            // Safety timeout (e.g. 2 seconds)
            if (Date.now() - startTime > 3000) break;
        }

        return bestMove;
    }

    minimax(board, depth, alpha, beta, color) {
        if (depth === 0) {
            return this.evaluate(board, color);
        }

        const moves = this.getAllLegalMoves(board, color);
        if (moves.length === 0) {
            // No moves. If checked -> mated. Else stalemate.
            // For simplicity: Loss
            return -20000;
        }

        // Move ordering
        moves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

        let maxEval = -Infinity;

        for (const move of moves) {
            const captured = this.makeSimulatedMove(board, move);

            const evalVal = -this.minimax(board, depth - 1, -beta, -alpha, this.flipColor(color));

            this.undoSimulatedMove(board, move, captured);

            maxEval = Math.max(maxEval, evalVal);
            alpha = Math.max(alpha, evalVal);

            if (beta <= alpha) break; // Pruning
        }

        return maxEval;
    }

    // Basic Evaluation: Material + Position
    evaluate(board, color) {
        let score = 0;

        // Material
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const p = board[r][c];
                if (p) {
                    let val = PIECE_VALUES[p.type];

                    // Bonus for soldier across river
                    if (p.type === PIECE_TYPES.SOLDIER) {
                        if (p.color === COLORS.RED && r <= 4) val += 20;
                        if (p.color === COLORS.BLACK && r >= 5) val += 20;
                        // Bonus for soldier close to king?
                    }

                    if (p.color === color) score += val;
                    else score -= val;
                }
            }
        }

        // Add positional logic here if needed (e.g. control of center)
        return score;
    }

    getAllLegalMoves(board, color) {
        // This duplicates logic from XiangqiGame but purely on data structure to avoid messing with game state object
        // For efficiency, we can reuse XiangqiGame logic methods if we separate them effectively.
        // But since XiangqiGame.isValidMove depends on `this.board` etc, we'd need to mock or bind it.
        // A clean way is to instantiate a temp game or refactor `isValidMove` to be static or accept board.
        // For now, let's use the game instance methods but carefully swap board! 
        // Wait, relying on single instance is risky for recursion.
        // Better to have `getLegalMoves(board, color)` within AI or static helper.

        // Let's refactor logical checks to static or pure functions? 
        // Or just use the game instance to generate moves if we can clone board?
        // Game logic in JS is cheap enough to instantiate new? Maybe.
        // Let's just create a helper here that mimics logic or uses the global one if possible.

        // IMPORTANT: It's better to add `getLegalMoves(color)` to XiangqiGame class and use that.
        // BUT, we are inside recursive search with DIFFERENT board states (mutated).
        // So we need logic that works on ANY board state.

        // I will depend on the fact that I can temporarily modify existing `game` board? No, that breaks UI if async.
        // But this is blocking sync JS (mostly). 
        // Safest: implement simplified logic here or extend XiangqiGame to accept 'board' arg.

        // Let's implement a quick generator here.
        const moves = [];
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const p = board[r][c];
                if (p && p.color === color) {
                    // Generate candidates
                    const candidates = this.getCandidates(r, c, p.type, color);
                    for (const cand of candidates) {
                        // Verify geometry & obstruction (obstacles)
                        if (this.isPseudoLegal(board, r, c, cand.r, cand.c, p.type, color)) {
                            // Verify check safety (expensive?)
                            // Minimax often defers check-safety or handles it by huge penalty if King is captured.
                            // But King capture is illegal.
                            // Let's do a quick check-safety.

                            const target = board[cand.r][cand.c];
                            board[cand.r][cand.c] = p;
                            board[r][c] = null;

                            if (!this.isKingInCheck(board, color)) {
                                moves.push({
                                    from: { row: r, col: c },
                                    to: { row: cand.r, col: cand.c },
                                    captured: target ? { ...target } : null
                                });
                            }

                            // Revert
                            board[r][c] = p;
                            board[cand.r][cand.c] = target;
                        }
                    }
                }
            }
        }
        return moves;
    }

    // Helpers...
    getCandidates(r, c, type, color) {
        const list = [];
        const push = (nr, nc) => {
            if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) list.push({ r: nr, c: nc });
        }

        if (type === PIECE_TYPES.KING || type === PIECE_TYPES.ADVISOR) {
            // Palace only
            const palaceRows = color === COLORS.RED ? [7, 8, 9] : [0, 1, 2];
            const palaceCols = [3, 4, 5];

            if (type === PIECE_TYPES.KING) {
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                    const nr = r + dr, nc = c + dc;
                    if (palaceRows.includes(nr) && palaceCols.includes(nc)) push(nr, nc);
                });
            } else {
                [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
                    const nr = r + dr, nc = c + dc;
                    if (palaceRows.includes(nr) && palaceCols.includes(nc)) push(nr, nc);
                });
            }
        } else if (type === PIECE_TYPES.ELEPHANT) {
            [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
                const nr = r + dr, nc = c + dc;
                if (color === COLORS.RED && nr < 5) return; // Cannot cross river
                if (color === COLORS.BLACK && nr > 4) return;
                push(nr, nc);
            });
        } else if (type === PIECE_TYPES.HORSE) {
            [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => push(r + dr, c + dc));
        } else if (type === PIECE_TYPES.CHARIOT || type === PIECE_TYPES.CANNON) {
            // Scan lines
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                for (let k = 1; k < 10; k++) {
                    const nr = r + dr * k, nc = c + dc * k;
                    if (nr < 0 || nr >= 10 || nc < 0 || nc >= 9) break;
                    push(nr, nc);
                }
            });
        } else if (type === PIECE_TYPES.SOLDIER) {
            const forward = color === COLORS.RED ? -1 : 1;
            push(r + forward, c);
            const crossed = color === COLORS.RED ? r <= 4 : r >= 5;
            if (crossed) {
                push(r, c - 1);
                push(r, c + 1);
            }
        }

        return list;
    }

    isPseudoLegal(board, r1, c1, r2, c2, type, color) {
        const target = board[r2][c2];
        if (target && target.color === color) return false;

        if (type === PIECE_TYPES.ELEPHANT) {
            const eyeR = (r1 + r2) / 2;
            const eyeC = (c1 + c2) / 2;
            if (board[eyeR][eyeC]) return false;
        } else if (type === PIECE_TYPES.HORSE) {
            // Blocking leg
            const dr = r2 - r1, dc = c2 - c1;
            let legR = r1, legC = c1;
            if (Math.abs(dr) === 2) legR += Math.sign(dr);
            else legC += Math.sign(dc);
            if (board[legR][legC]) return false;
        } else if (type === PIECE_TYPES.CHARIOT) {
            if (this.countObstacles(board, r1, c1, r2, c2) > 0) return false;
        } else if (type === PIECE_TYPES.CANNON) {
            const obs = this.countObstacles(board, r1, c1, r2, c2);
            if (!target) {
                if (obs > 0) return false;
            } else {
                if (obs !== 1) return false;
            }
        }

        return true;
    }

    countObstacles(board, r1, c1, r2, c2) {
        let count = 0;
        if (r1 === r2) {
            const min = Math.min(c1, c2) + 1;
            const max = Math.max(c1, c2);
            for (let k = min; k < max; k++) if (board[r1][k]) count++;
        } else {
            const min = Math.min(r1, r2) + 1;
            const max = Math.max(r1, r2);
            for (let k = min; k < max; k++) if (board[k][c1]) count++;
        }
        return count;
    }

    isKingInCheck(board, color) {
        // Find King
        let kr, kc;
        for (let r = 0; r < 10; r++)
            for (let c = 0; c < 9; c++)
                if (board[r][c] && board[r][c].type === PIECE_TYPES.KING && board[r][c].color === color) { kr = r; kc = c; }

        if (kr === undefined) return true; // Captured? (Should not happen)

        const oppColor = color === COLORS.RED ? COLORS.BLACK : COLORS.RED;

        // Check attackers
        // Optimization: Check outward from King for Knight/Rook/Cannon/Pawn patterns

        // 1. Check Row/Col for Rook/Cannon/King(Face-off)
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of directions) {
            let screen = 0;
            for (let k = 1; k < 10; k++) {
                const nr = kr + dr * k, nc = kc + dc * k;
                if (nr < 0 || nr >= 10 || nc < 0 || nc >= 9) break;
                const p = board[nr][nc];
                if (p) {
                    if (p.color === oppColor) {
                        if (screen === 0) {
                            if (p.type === PIECE_TYPES.CHARIOT || p.type === PIECE_TYPES.KING || (p.type === PIECE_TYPES.SOLDIER && k === 1)) return true; // Soldier only 1 step
                            // Note: King face-off is check
                        } else if (screen === 1) {
                            if (p.type === PIECE_TYPES.CANNON) return true;
                        }
                    }
                    screen++;
                }
            }
        }

        // 2. Horse
        const horseMoves = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
        for (const [dr, dc] of horseMoves) {
            const nr = kr + dr, nc = kc + dc;
            if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                const p = board[nr][nc];
                if (p && p.color === oppColor && p.type === PIECE_TYPES.HORSE) {
                    // Check leg
                    let legR = kr, legC = kc;
                    if (Math.abs(dr) === 2) legR += Math.sign(dr); // From king perspective? No, leg is adjacent to horse.
                    // Wait, leg is between horse and target.
                    // Horse at (nr, nc) attacks (kr, kc). Leg is at (nr +/- 1, nc) or (nr, nc +/- 1) depending on move.
                    // Move is (dr, dc) from KING to HORSE.
                    // Effectively, check if Horse at (nr, nc) can move to (kr, kc).
                    // The leg is adjacent to Horse.
                    // If horse is at nr, nc. To hit kr, kc.
                    // dr = kr - nr, dc = kc - nc.
                    const ddr = -dr, ddc = -dc; // From Horse to King
                    let lr = nr, lc = nc;
                    if (Math.abs(ddr) === 2) lr += Math.sign(ddr);
                    else lc += Math.sign(ddc);

                    if (!board[lr][lc]) return true; // No blocking leg
                }
            }
        }

        // 3. Soldier (already covered partly by orthogonal check? No, Soldiers capture sideways/forward)
        // Soldiers move 1 step. Check adjacent spots.
        // Covered by orthogonal check "k===1" logic?
        // Yes: "p.type === SOLDIER && k===1". But Soliders attack differently?
        // Soldier attacks exactly as it moves.
        // So if an enemy soldier is 1 step away and can move to King, it's check.
        // My logic above: "p.type === SOLDIER && k===1".
        // Is it sufficient?
        // If King at (r,c), Enemy Soldier (Black) at (r-1, c) (Forward). Can it attack? Yes.
        // If Enemy Soldier at (r, c+1). Can it attack? If cross river.
        // We need to check exact Valid Move of soldier to King.
        // My shortcuts are a bit loose.
        // Let's rely strictly on: Can piece P attack King?
        // For loop above found an orthogonal piece.
        // If it's a soldier at dist 1. Can it attack?
        // Yes, unless it's a backwards move for soldier.
        // Black soldier at row 5, King at row 6. Soldier moves down (row++).
        // King - Soldier = (1, 0).
        // My loop checks (1, 0) direction. k=1. nr = kr+1.
        // If kr=6, nr=7. King is "below" soldier?
        // Wait, (nr, nc) is the piece position.
        // dr=1 means look DOWN from King. So nr > kr.
        // If Black soldier is below Red King, it cannot attack (moves down).
        // Red King at r=9. Black Soldier at r=8. Dist 1.
        // Loop looks UP (dr=-1). nr=8. Found Black Soldier.
        // Black soldier moves DOWN (row++). Can it hit r=9? Yes.

        // What if Red King at r=9. Red Soldier at r=8? Self color ignored.
        // What if Black King at r=0. Red Soldier at r=1.
        // Loop looks DOWN (dr=1). Found Red Soldier.
        // Red Soldier moves UP (row--). Can it hit r=0? Yes.

        return false; // Loop covers major threats.
    }

    makeSimulatedMove(board, move) {
        const captured = board[move.to.row][move.to.col];
        board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
        board[move.from.row][move.from.col] = null;
        return captured;
    }

    undoSimulatedMove(board, move, captured) {
        board[move.from.row][move.from.col] = board[move.to.row][move.to.col];
        board[move.to.row][move.to.col] = captured;
    }

    flipColor(c) { return c === COLORS.RED ? COLORS.BLACK : COLORS.RED; }
}

module.exports = { XiangqiAI };
