// pages/xiangqi/xiangqi.ts
const { XiangqiGame, COLORS, PIECE_TYPES } = require('../../utils/xiangqi-logic');
const { XiangqiAI } = require('../../utils/xiangqi-ai');

interface Piece {
    type: string;
    color: string;
    text: string;
}

interface BoardCell {
    row: number;
    col: number;
    piece: Piece | null;
}

// Define the custom properties on the Page instance
type XiangqiPageInstance = WechatMiniprogram.Page.Instance<
    {
        boardData: BoardCell[][];
        gameMode: string;
        selectedPos: { row: number; col: number } | null;
        lastMove: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
        validMoves: { row: number; col: number }[];
        turn: string; // 'r' or 'b'
        winner: string | null;
        isAiThinking: boolean;
        aiColor: string;
        myColor: string;
    },
    {
        gameInstance: any; // Type as any since it's a JS class
        ai: any;

        onLoad(options: Record<string, string | undefined>): void;
        initGame(mode: string): void;
        updateBoard(): void;
        getPieceText(type: string, color: string): string;
        onCellTap(e: WechatMiniprogram.TouchEvent): void;
        makeMove(fromR: number, fromC: number, toR: number, toC: number): void;
        triggerAiMove(): void;
        restartGame(): void;
        goBack(): void;
        showGameOver(winner: string): void;
    }
>

Page<any, any>({
    data: {
        boardData: [],
        gameMode: 'pvp',
        selectedPos: null,
        lastMove: null, // {from: {row, col}, to: {row, col}}
        validMoves: [],
        turn: COLORS.RED,
        winner: null,
        isAiThinking: false,
        aiColor: COLORS.BLACK,
        myColor: COLORS.RED
    },

    // Custom properties attached effectively to 'this' at runtime, 
    // but for TS to know them in 'methods' or lifecycle, we rely on implicit 'this'.
    // We can just define them on 'this' in init.
    gameInstance: null,
    ai: null,

    // 分享给好友
    onShareAppMessage() {
        return {
            title: '来和我下一局象棋吧！',
            path: '/pages/xiangqi-menu/xiangqi-menu'
        }
    },

    // 分享到朋友圈
    onShareTimeline() {
        return {
            title: 'ForceZone - 中国象棋',
            query: ''
        }
    },

    onLoad(options: Record<string, string | undefined>) {
        const mode = options.mode || 'pvp';
        this.initGame(mode);
    },

    initGame(mode: string) {
        const game = new XiangqiGame();
        this.gameInstance = game;
        this.ai = mode === 'pve' ? new XiangqiAI(game) : null;

        this.setData({
            gameMode: mode,
            winner: null,
            turn: game.turn,
            selectedPos: null,
            lastMove: null,
            validMoves: [],
            myColor: COLORS.RED,
            aiColor: COLORS.BLACK,
            isAiThinking: false
        });

        this.updateBoard();
    },

    updateBoard() {
        if (!this.gameInstance) return;

        const board = this.gameInstance.board;
        const boardData: BoardCell[][] = board.map((row: any[], r: number) => {
            return row.map((piece: any, c: number) => {
                return {
                    row: r,
                    col: c,
                    piece: piece ? {
                        type: piece.type,
                        color: piece.color,
                        text: this.getPieceText(piece.type, piece.color)
                    } : null
                };
            });
        });

        this.setData({
            boardData,
            turn: this.gameInstance.turn,
            winner: this.gameInstance.winner
        });

        if (this.gameInstance.gameOver) {
            this.showGameOver(this.gameInstance.winner);
        }
    },

    getPieceText(type: string, color: string): string {
        const chars: Record<string, Record<string, string>> = {
            [PIECE_TYPES.KING]: { [COLORS.RED]: '帅', [COLORS.BLACK]: '将' },
            [PIECE_TYPES.ADVISOR]: { [COLORS.RED]: '仕', [COLORS.BLACK]: '士' },
            [PIECE_TYPES.ELEPHANT]: { [COLORS.RED]: '相', [COLORS.BLACK]: '象' },
            [PIECE_TYPES.HORSE]: { [COLORS.RED]: '傌', [COLORS.BLACK]: '马' },
            [PIECE_TYPES.CHARIOT]: { [COLORS.RED]: '俥', [COLORS.BLACK]: '车' },
            [PIECE_TYPES.CANNON]: { [COLORS.RED]: '砲', [COLORS.BLACK]: '炮' },
            [PIECE_TYPES.SOLDIER]: { [COLORS.RED]: '兵', [COLORS.BLACK]: '卒' }
        };
        return chars[type] ? chars[type][color] : '?';
    },

    onCellTap(e: WechatMiniprogram.TouchEvent) {
        if (this.data.winner || this.data.isAiThinking) return;
        if (this.data.gameMode === 'pve' && this.data.turn === this.data.aiColor) return;

        const { row, col } = e.currentTarget.dataset;
        const { selectedPos, validMoves } = this.data;

        if (!this.gameInstance) return;

        const clickedPiece = this.gameInstance.board[row][col];
        const isSelfPiece = clickedPiece && clickedPiece.color === this.data.turn;

        if (selectedPos) {
            const isTarget = validMoves.some((m: { row: number, col: number }) => m.row === row && m.col === col);

            if (isTarget) {
                this.makeMove(selectedPos.row, selectedPos.col, row, col);
                return;
            }
        }

        if (isSelfPiece) {
            const moves: { row: number, col: number }[] = [];
            for (let r = 0; r < 10; r++) {
                for (let c = 0; c < 9; c++) {
                    if (this.gameInstance.isValidMove(row, col, r, c)) {
                        moves.push({ row: r, col: c });
                    }
                }
            }

            this.setData({
                selectedPos: { row, col },
                validMoves: moves
            });
        } else {
            this.setData({
                selectedPos: null,
                validMoves: []
            });
        }
    },

    makeMove(fromR: number, fromC: number, toR: number, toC: number) {
        if (!this.gameInstance) return;

        const success = this.gameInstance.makeMove(fromR, fromC, toR, toC);
        if (success) {
            this.setData({
                selectedPos: null,
                validMoves: [],
                lastMove: { from: { row: fromR, col: fromC }, to: { row: toR, col: toC } }
            });
            this.updateBoard();

            if (this.data.gameMode === 'pve' && !this.data.winner && this.gameInstance.turn === this.data.aiColor) {
                this.triggerAiMove();
            }
        } else {
            wx.showToast({ title: '无效移动', icon: 'none' });
        }
    },

    triggerAiMove() {
        if (!this.gameInstance || !this.ai) return;

        this.setData({ isAiThinking: true });
        setTimeout(() => {
            const move = this.ai.getBestMove(3);
            if (move) {
                this.gameInstance.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
                this.setData({
                    isAiThinking: false,
                    lastMove: move
                });
                this.updateBoard();
            } else {
                this.setData({ isAiThinking: false });
            }
        }, 500);
    },

    restartGame() {
        this.initGame(this.data.gameMode);
    },

    undoMove() {
        if (!this.gameInstance) return;

        // PVE: Undo twice (Undo AI's move, then Player's move)
        if (this.data.gameMode === 'pve') {
            // Check if we can undo twice (AI move + Player move)
            // History length needs to be >= 2 ideally, or if AI just moved, history is even?
            // Actually just check if it's player's turn (AI moved last) => length >= 2?
            // Or if it's AI turn (unlikely as we block input), then we undo once?
            // Usually user taps Undo when it's their turn.

            if (this.gameInstance.history.length >= 2) {
                this.gameInstance.undo(); // Undo AI
                this.gameInstance.undo(); // Undo Player
                this.updateBoard();
            } else {
                wx.showToast({ title: '无法悔棋', icon: 'none' });
            }
        } else {
            // PVP
            if (this.gameInstance.history.length >= 1) {
                this.gameInstance.undo();
                this.updateBoard();
            } else {
                wx.showToast({ title: '无法悔棋', icon: 'none' });
            }
        }
    },

    goBack() {
        wx.navigateBack();
    },

    showGameOver(winner: string) {
        let text = '';
        if (this.data.gameMode === 'pvp') {
            text = winner === COLORS.RED ? '红方胜利！' : '黑方胜利！';
        } else {
            if (winner === this.data.myColor) text = '你赢了！';
            else text = '你输了！';
        }

        wx.showModal({
            title: '游戏结束',
            content: text,
            confirmText: '再来一局',
            cancelText: '返回',
            success: (res) => {
                if (res.confirm) {
                    this.restartGame();
                } else {
                    this.goBack();
                }
            }
        });
    }
})
