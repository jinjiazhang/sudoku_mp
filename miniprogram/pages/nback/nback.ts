Page({
    data: {
        n: 3, // Default 3-back
        score: 0,
        roundsLeft: 20, // Total rounds per game
        isPlaying: false,
        isGameOver: false,
        currentLetter: '', // Current stimulus
        sequence: [] as string[], // History of stimuli
        currentRound: 0,
        showStimulus: false,

        // Stats
        correctHits: 0,
        mistakes: 0, // False positives
        misses: 0, // False negatives (missed targets)
        accuracy: 0,
        correctRejections: 0,

        // Game loop control
        timer: null as number | null,
        waitTime: 2000, // Interval between stimuli
        hasResponded: false, // Did user press match for current round?
        isTarget: false, // Was current round a target?

        // Debug info
        isPreviousTarget: false
    },

    onLoad() {
        // nothing
    },

    setN(e: any) {
        if (this.data.isPlaying) return
        const n = parseInt(e.currentTarget.dataset.n)
        this.setData({ n })
    },

    resetState() {
        if (this.data.timer) clearTimeout(this.data.timer)

        this.setData({
            score: 0,
            roundsLeft: 20,
            isPlaying: false,
            isGameOver: false,
            currentLetter: '',
            sequence: [],
            currentRound: 0,
            showStimulus: false,
            correctHits: 0,
            mistakes: 0, // False Alarm
            misses: 0, // Miss
            correctRejections: 0,
            accuracy: 0,
            hasResponded: false,
            isTarget: false,
            timer: null
        })
    },

    goHome() {
        wx.navigateBack()
    },

    resetGame() {
        this.resetState()
    },

    startGame() {
        this.resetState()
        this.setData({ isPlaying: true })

        // Start loop
        this.nextRound(0)
    },

    nextRound(roundIndex: number) {
        if (!this.data.isPlaying) return

        // Limit rounds
        if (roundIndex >= 20) {
            this.endGame()
            return
        }

        // 1. Process Previous Round Result (if any)
        // If previous was target and user didn't respond, count as Miss
        // If previous was NOT target and user didn't respond, count as Correct Rejection
        if (roundIndex > 0) {
            // We need to know if previous round was target.
            // We stored it in 'isTarget' before updating for this new round?
            // Wait, 'isTarget' is current state.
            // Let's check 'hasResponded'. If false, and 'isTarget' was true -> Miss.
            // Actually 'isTarget' refers to the stimulus just shown.
            // But we are entering 'nextRound', meaning the wait time for previous round is over.
            // So yes, check 'isTarget' and 'hasResponded'.

            if (this.data.isTarget && !this.data.hasResponded) {
                // Missed target
                // console.log('Miss!')
                this.setData({
                    misses: this.data.misses + 1
                })
            } else if (!this.data.isTarget && !this.data.hasResponded) {
                // Correct Rejection
                // console.log('Correct Rejection')
                this.setData({
                    correctRejections: this.data.correctRejections + 1
                })
            }
        }

        // 2. Generate New Stimulus
        const letters = ['A', 'B', 'C', 'D', 'E', 'H', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T']
        const n = this.data.n
        const history = this.data.sequence
        let nextLetter
        let isTarget = false

        // Probability of target: 30%
        // Only possible if history length >= n
        if (history.length >= n && Math.random() < 0.3) {
            nextLetter = history[history.length - n]
            isTarget = true
        } else {
            // Random letter
            // Ensure we don't accidentally create a target if we didn't intend to?
            // Or just let it be random. True randomness is better.
            // But for 2-back, random collision is low (1/15).
            nextLetter = letters[Math.floor(Math.random() * letters.length)]

            // Double check if it accidentally matches
            if (history.length >= n && nextLetter === history[history.length - n]) {
                isTarget = true
            }
        }

        const newSequence = [...history, nextLetter]

        this.setData({
            sequence: newSequence,
            currentLetter: nextLetter,
            showStimulus: true,
            hasResponded: false,
            isTarget: isTarget,
            currentRound: roundIndex + 1,
            roundsLeft: 20 - (roundIndex + 1)
        })

        // 3. Timers
        // Show stimulus for 1000ms
        setTimeout(() => {
            if (!this.data.isPlaying) return
            this.setData({ showStimulus: false })
        }, 1000)

        // Wait 2500ms total for next round
        const timer = setTimeout(() => {
            if (!this.data.isPlaying) return
            this.nextRound(roundIndex + 1)
        }, 2500)

        this.setData({ timer })
    },

    checkMatch() {
        if (!this.data.isPlaying || this.data.hasResponded) return

        // User claims match
        this.setData({ hasResponded: true })

        if (this.data.isTarget) {
            // Correct Match (Hit)
            this.setData({
                score: this.data.score + 10,
                correctHits: this.data.correctHits + 1
            })
            wx.vibrateShort({ type: 'medium' })
        } else {
            // False Alarm (Mistake)
            this.setData({
                score: Math.max(0, this.data.score - 5),
                mistakes: this.data.mistakes + 1
            })
            wx.vibrateLong()
        }
    },

    endGame() {
        // Process last round miss logic
        if (this.data.isTarget && !this.data.hasResponded) {
            this.setData({ misses: this.data.misses + 1 })
        } else if (!this.data.isTarget && !this.data.hasResponded) {
            this.setData({ correctRejections: this.data.correctRejections + 1 })
        }

        // Calculate accuracy
        // Accuracy = (Hits + CorrectRejections) / TotalRounds
        // Total rounds = 20.
        const total = 20
        const hits = this.data.correctHits
        const rejections = this.data.correctRejections
        const acc = Math.round(((hits + rejections) / total) * 100)

        this.setData({
            isPlaying: false,
            isGameOver: true,
            accuracy: acc,
            timer: null
        })
    },

    onUnload() {
        if (this.data.timer) clearTimeout(this.data.timer)
        this.setData({ isPlaying: false })
    }
})
