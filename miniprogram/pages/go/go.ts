import { GoService, GoGame, BLACK, WHITE, EMPTY } from '../../utils/go-game'

Page({
    data: {
        board: [] as any[], // 2D array for logic
        displayBoard: [] as any[], // Flat array for grid rendering with class info
        size: 19,
        currentPlayer: BLACK,
        gameOver: false,
        winner: null,
        prisoners: { [BLACK]: 0, [WHITE]: 0 },
        statusText: '黑方执黑',
        blackTime: '00:00',
        whiteTime: '00:00',
        gameMode: 'pve', // 'pve' | 'pvp'
        lastMove: null as any,
        containerStyle: '' // dynamic grid style
    },

    game: null as GoGame | null,
    timer: null as number | null,

    onLoad(options: any) {
        let size = 19
        let mode = 'pve'

        if (options.resume) {
            const saved = GoService.getSavedGame()
            if (saved) {
                this.game = saved
                size = saved.size
                mode = saved.gameMode
            } else {
                // Fallback
                this.initGame(19, 'pve')
            }
        } else {
            if (options.size) size = parseInt(options.size)
            if (options.mode) mode = options.mode
            this.initGame(size, mode)
        }

        this.updateUI()
        this.startTimer()
    },

    onUnload() {
        this.stopTimer()
        if (this.game && !this.game.gameOver) {
            GoService.saveGame(this.game)
        }
    },

    initGame(size: number, mode: string) {
        this.game = GoService.createGame(size, mode)
        // No timer logic in service, so we track elapsed in UI or service? Service has secondsElapsed.
    },

    startTimer() {
        this.timer = setInterval(() => {
            if (this.game && !this.game.gameOver) {
                this.game.secondsElapsed++
                // We could track per-player time if we wanted, but simple elapsed is fine for now
                this.setData({
                    // Update visual timer if needed based on game.secondsElapsed
                })
            }
        }, 1000)
    },

    stopTimer() {
        if (this.timer) clearInterval(this.timer)
    },

    // Flatten board and add styling info (edges, stars)
    generateDisplayBoard() {
        if (!this.game) return []
        const flat = []
        const size = this.game.size

        // Star points
        const stars = new Set()
        if (size === 19) {
            [3, 9, 15].forEach(r => [3, 9, 15].forEach(c => stars.add(`${r},${c}`)))
        } else if (size === 13) {
            [3, 6, 9].forEach(r => [3, 6, 9].forEach(c => stars.add(`${r},${c}`)))
            // Usually 13x13 stars are 4,4 (3,3 index) and center (6,6) and 4,10 (3,9)?
            // Standard: 4-4 points (index 3) and center.
        } else if (size === 9) {
            stars.add('4,4')
            [2, 6].forEach(r => [2, 6].forEach(c => stars.add(`${r},${c}`)))
        }

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                let positionClass = ''

                // Lines
                if (i === 0) positionClass += ' top'
                if (i === size - 1) positionClass += ' bottom'
                if (j === 0) positionClass += ' left'
                if (j === size - 1) positionClass += ' right'

                const isStar = stars.has(`${i},${j}`)

                flat.push({
                    row: i,
                    col: j,
                    value: this.game.board[i][j],
                    positionClass,
                    isStar,
                    isLastMove: this.game.lastMove && this.game.lastMove.row === i && this.game.lastMove.col === j
                })
            }
        }
        return flat
    },

    updateUI() {
        if (!this.game) return
        const status = this.game.gameOver
            ? (this.game.winner === BLACK ? '黑方获胜' : '白方获胜')
            : (this.game.currentPlayer === BLACK ? '黑方思考中...' : '白方思考中...')

        this.setData({
            displayBoard: this.generateDisplayBoard(),
            size: this.game.size,
            containerStyle: `grid-template-columns: repeat(${this.game.size}, 1fr);`,
            currentPlayer: this.game.currentPlayer,
            statusText: status,
            prisoners: this.game.prisoners,
            gameOver: this.game.gameOver
        })
    },

    onBoardTap(e: any) {
        if (!this.game || this.game.gameOver) return

        // In PvE, if it's AI turn (White), ignore taps
        if (this.game.gameMode === 'pve' && this.game.currentPlayer === WHITE) return

        const { row, col } = e.currentTarget.dataset

        if (GoService.placeStone(this.game, row, col)) {
            this.updateUI()

            // Check Win? Go usually ends by pass. For simple implementation, we don't auto-end unless manual.
            // Or we can implement simple "Capture King" if we wanted, but Go is territory.
            // For now, let users play until they leave or restart.
            // Update: If PvE, trigger AI
            if (this.game.gameMode === 'pve' && !this.game.gameOver) {
                setTimeout(() => {
                    this.makeAIMove()
                }, 500)
            }
        } else {
            // Invalid move feedback (optional)
            wx.showToast({ title: '无法落子', icon: 'none' })
        }
    },

    makeAIMove() {
        if (!this.game) return
        const move = GoService.getAIMove(this.game)
        if (move) {
            GoService.placeStone(this.game, move.row, move.col)
            this.updateUI()
        } else {
            wx.showToast({ title: 'AI 停着', icon: 'none' })
            // Pass turn logic? For now switch manually or just wait
            // Actually GoService.placeStone handles switch.
            // AI passes if returns null. We should switch player manually.
            this.game.currentPlayer = BLACK
            this.updateUI()
        }
    },

    onRestart() {
        if (!this.game) return
        this.initGame(this.game.size, this.game.gameMode)
        this.updateUI()
    },

    onUndo() {
        // Implementing undo for Go is harder (need full history state).
        // GoGame class needs `restoreState(historyIndex)`.
        // Simple version: Not supported or just reload board?
        // Gomoku had helper. GoService logic is complex to reverse (captures).
        // I'll skip Undo for this iteration or implement naive state save.
        // Actually `saveGame` serializes everything.
        // If I want undo, I should have saved states.
        wx.showToast({ title: '暂不支持悔棋', icon: 'none' })
    }
})
