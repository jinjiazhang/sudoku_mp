/**
 * 围棋游戏服务
 * 包含游戏逻辑、提子规则、AI对手等功能
 */

const EMPTY = 0
const BLACK = 1
const WHITE = 2

class GoGame {
    constructor(size = 19) {
        this.size = size
        this.board = []
        this.currentPlayer = BLACK
        this.gameOver = false
        this.winner = null
        this.lastMove = null // {row, col}
        this.koPosition = null // {row, col} 劫争位置
        this.moveHistory = []
        this.prisoners = { [BLACK]: 0, [WHITE]: 0 } // 被俘虏的子（BLACK: 黑棋由于提子获得的俘虏? No, usually prisoner count means captured stones of opponent. So prisoners[BLACK] means Black captured how many White stones.
        this.secondsElapsed = 0
        this.gameMode = 'pve' // pve or pvp
        this.initBoard()
    }

    initBoard() {
        this.board = []
        for (let i = 0; i < this.size; i++) {
            this.board[i] = []
            for (let j = 0; j < this.size; j++) {
                this.board[i][j] = EMPTY
            }
        }
    }

    toJson() {
        return JSON.stringify({
            size: this.size,
            board: this.board,
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            winner: this.winner,
            lastMove: this.lastMove,
            koPosition: this.koPosition,
            moveHistory: this.moveHistory,
            prisoners: this.prisoners,
            secondsElapsed: this.secondsElapsed,
            gameMode: this.gameMode
        })
    }

    static fromJson(json) {
        const data = JSON.parse(json)
        constgame = new GoGame(data.size || 19)
        game.board = data.board
        game.currentPlayer = data.currentPlayer
        game.gameOver = data.gameOver
        game.winner = data.winner
        game.lastMove = data.lastMove
        game.koPosition = data.koPosition
        game.moveHistory = data.moveHistory || []
        game.prisoners = data.prisoners || { [BLACK]: 0, [WHITE]: 0 }
        game.secondsElapsed = data.secondsElapsed || 0
        game.gameMode = data.gameMode || 'pve'
        return game
    }
}

class GoService {
    static getOpponent(player) {
        return player === BLACK ? WHITE : BLACK
    }

    static isValidPosition(game, row, col) {
        return row >= 0 && row < game.size && col >= 0 && col < game.size
    }

    // 检查是否可以落子
    static canPlace(game, row, col) {
        if (game.gameOver) return false
        if (!this.isValidPosition(game, row, col)) return false
        if (game.board[row][col] !== EMPTY) return false

        // 检查劫争
        if (game.koPosition && game.koPosition.row === row && game.koPosition.col === col) {
            return false
        }

        // 尝试落子并检查气（是否自杀且无提子）
        // Logic: 
        // 1. Place stone temporarily.
        // 2. Check if it captures opponent stones. If yes, Valid.
        // 3. If no captures, check if the group has liberties. If no liberties, Suicide (Invalid).

        // Check suicide is complex without modifying board.
        // Use deep copy or manual revert.
        const original = game.board[row][col]
        game.board[row][col] = game.currentPlayer

        const opponent = this.getOpponent(game.currentPlayer)
        const deadOpponents = this.findDeadGroups(game, opponent) // Check if any opponent group is dead (captured)

        let isValid = true
        if (deadOpponents.length === 0) {
            // If no captures, check self liberties
            if (this.getLiberties(game, row, col) === 0) {
                isValid = false // Suicide
            }
        }

        // Revert
        game.board[row][col] = original

        return isValid
    }

    // 落子
    static placeStone(game, row, col) {
        if (!this.canPlace(game, row, col)) return false

        // Place stone
        game.board[row][col] = game.currentPlayer
        const opponent = this.getOpponent(game.currentPlayer)

        // Check for captures
        const deadStones = this.findDeadGroups(game, opponent) // Returns array of {row,col}

        if (deadStones.length > 0) {
            // Remove dead stones
            for (const stone of deadStones) {
                game.board[stone.row][stone.col] = EMPTY
            }
            // Add to prisoners count
            game.prisoners[game.currentPlayer] += deadStones.length

            // Update Ko Position
            // Ko rule: if 1 stone captured and it reverts board to state before opponent move.
            // Simple Ko: 1 captured, and the placed stone has 1 liberty?
            // Strict definition involves full board hash, but for simplified Go:
            // If 1 stone captured and the placement was single stone capture.
            if (deadStones.length === 1) {
                const placedStoneLiberties = this.getLiberties(game, row, col)
                if (placedStoneLiberties === 1) {
                    game.koPosition = deadStones[0] // Opponent cannot play here next turn
                } else {
                    game.koPosition = null
                }
            } else {
                game.koPosition = null
            }
        } else {
            game.koPosition = null
        }

        // Update history
        game.lastMove = { row, col }
        game.moveHistory.push({ row, col, player: game.currentPlayer })

        // Switch player
        game.currentPlayer = opponent
        return true
    }

    // 计算某块棋的气
    static getLiberties(game, row, col) {
        const visited = new Set()
        const color = game.board[row][col]
        const queue = [{ r: row, c: col }]
        visited.add(`${row},${col}`)

        let liberties = 0
        const checkedLiberties = new Set() // avoid counting same liberty twice

        let head = 0
        while (head < queue.length) {
            const curr = queue[head++]

            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
            for (const [dr, dc] of dirs) {
                const nr = curr.r + dr
                const nc = curr.c + dc
                if (this.isValidPosition(game, nr, nc)) {
                    const content = game.board[nr][nc]
                    if (content === EMPTY) {
                        const key = `${nr},${nc}`
                        if (!checkedLiberties.has(key)) {
                            liberties++
                            checkedLiberties.add(key)
                        }
                    } else if (content === color) {
                        const key = `${nr},${nc}`
                        if (!visited.has(key)) {
                            visited.add(key)
                            queue.push({ r: nr, c: nc })
                        }
                    }
                }
            }
        }
        return liberties
    }

    // 查找所有无气的对方棋子
    static findDeadGroups(game, targetColor) {
        const deadStones = []
        const visited = new Set()

        for (let i = 0; i < game.size; i++) {
            for (let j = 0; j < game.size; j++) {
                if (game.board[i][j] === targetColor && !visited.has(`${i},${j}`)) {
                    // Check liberties for this group
                    const group = []
                    const groupHasLiberties = this.checkGroupLiberties(game, i, j, targetColor, visited, group)

                    if (!groupHasLiberties) {
                        deadStones.push(...group)
                    }
                }
            }
        }
        return deadStones
    }

    static checkGroupLiberties(game, row, col, color, visited, group) {
        // DFS or BFS to find whole group and check if ANY stone has adjacent Empty
        const stack = [{ r: row, c: col }]
        visited.add(`${row},${col}`)
        group.push({ row, col })

        let hasLiberty = false

        // We traverse the whole group to mark visited, even if we find liberty early (optimization possible but need to mark visited correctly)
        // Actually simpler to just traverse all and check liberties.

        let head = 0
        while (head < group.length) { // Use group array as queue
            const curr = group[head++]
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]

            for (const [dr, dc] of dirs) {
                const nr = curr.row + dr
                const nc = curr.col + dc
                if (this.isValidPosition(game, nr, nc)) {
                    const content = game.board[nr][nc]
                    if (content === EMPTY) {
                        hasLiberty = true
                    } else if (content === color) {
                        const key = `${nr},${nc}`
                        if (!visited.has(key)) {
                            visited.add(key)
                            group.push({ row: nr, col: nc })
                        }
                    }
                }
            }
        }

        return hasLiberty
    }

    // AI Logic (Simple Random/Greedy)
    static getAIMove(game) {
        // Try to capture
        // Try to defend (atari)
        // Else random non-suicide move near other stones if possible

        const candidates = []
        // Collect all valid moves
        for (let i = 0; i < game.size; i++) {
            for (let j = 0; j < game.size; j++) {
                if (this.canPlace(game, i, j)) {
                    candidates.push({ row: i, col: j })
                }
            }
        }

        if (candidates.length === 0) return null // Pass?

        // Simple heuristic: Try to find moves that capture something
        for (const move of candidates) {
            if (this.doesCapture(game, move.row, move.col)) {
                return move
            }
        }

        // Try to play near center or existing stones (gravity)
        // Sort candidates by distance to center or nearby stones
        candidates.sort(() => Math.random() - 0.5)

        // Prefer 3rd/4th line for opening?
        return candidates[0]
    }

    static doesCapture(game, row, col) {
        const opponent = this.getOpponent(game.currentPlayer)

        // Temp place
        game.board[row][col] = game.currentPlayer
        const deads = this.findDeadGroups(game, opponent)
        game.board[row][col] = EMPTY // Revert

        return deads.length > 0
    }

    static createGame(size = 9, mode = 'pve') {
        const game = new GoGame(size)
        game.gameMode = mode
        return game
    }

    static saveGame(game) {
        try {
            wx.setStorageSync('goSavedGame', game.toJson())
            return true
        } catch (e) {
            return false
        }
    }

    static getSavedGame() {
        try {
            const json = wx.getStorageSync('goSavedGame')
            if (json) return GoGame.fromJson(json)
        } catch (e) { }
        return null
    }
}

module.exports = {
    GoGame,
    GoService,
    EMPTY,
    BLACK,
    WHITE
}
