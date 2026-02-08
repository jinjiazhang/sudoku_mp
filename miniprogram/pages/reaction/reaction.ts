// reaction.ts
Page({
    data: {
        // waiting state now includes color info, e.g. 'waiting-red'
        state: 'idle',
        reactionTime: 0,
        startTime: 0,
        timer: 0 as any,

        // New game logic
        targetColor: 'green', // Default target
        currentColor: '',
        bgClass: '',

        // Config
        colors: [
            { name: 'red', label: '红色', hex: '#ce2636' },
            { name: 'orange', label: '橙色', hex: '#ff9500' },
            { name: 'yellow', label: '黄色', hex: '#ffcc00' },
            { name: 'green', label: '绿色', hex: '#4cd964' },
            { name: 'blue', label: '蓝色', hex: '#5ac8fa' },
            { name: 'purple', label: '紫色', hex: '#5856d6' }
        ],

        messageText: ''
    },

    onLoad() {
        this.setData({ state: 'idle' })
    },

    onUnload() {
        this.clearTimer()
    },

    clearTimer() {
        if (this.data.timer) {
            clearTimeout(this.data.timer)
            this.setData({ timer: 0 })
        }
    },

    handleTap() {
        const { state, currentColor, targetColor } = this.data

        // IDLE -> START GAME
        if (state === 'idle') {
            this.initRound()
        }

        // WAITING -> CHECK CLICK
        else if (state === 'waiting') {
            if (currentColor === targetColor) {
                // SUCCESS CASE (Should be handled by auto-trigger usually? No, user clicks when they see it)
                // Wait, standard reaction test: 
                // 1. Wait for GREEN. 
                // 2. Screen turns GREEN.
                // 3. User clicks.
                // Here: Screen turns random colors. User clicks ONLY when target matches.

                // Actually, the request is: "Wait for Green" text color matches target.
                // And "Wait for other colors".
                // Let's interpret: 
                // Screen shows a color. If it's the TARGET color, click.
                // It might cycle colors? Or just wait for the single change?

                // "I want to add difficulty... wait for other colors... e.g. red orange yellow green blue purple... and the 'Wait for Green' text color matches target"

                // Let's model it like this:
                // 1. Game says: "Wait for [COLOR]" (e.g. Blue). Text is Blue.
                // 2. Screen is Red... then Yellow... then Blue (CLICK!).

                // OR simpler:
                // 1. Screen is Red. Msg: "Wait for Green".
                // 2. Screen turns Green. Click.

                // The user said: "wait for other colors, e.g. red orange...". 
                // This implies the TARGET signal can be something other than Green.
                // And "Wait for Green" text color should match target.

                // So:
                // Round 1: Target = Blue. Screen stops at Red. Waits... Turns Blue. Click!

                if (currentColor === targetColor) {
                    const endTime = Date.now()
                    const reactionTime = endTime - this.data.startTime
                    this.setData({
                        state: 'result',
                        reactionTime
                    })
                    this.saveBestScore(reactionTime)
                } else {
                    // Clicked wrong color or too early
                    this.clearTimer()
                    this.setData({ state: 'too-early' })
                }
            } else {
                // Too early (clicking while waiting for target)
                this.clearTimer()
                this.setData({ state: 'too-early' })
            }
        }

        // READY -> RESULT (Legacy state, merged into 'waiting' with matching color effectively)
        // We can keep 'ready' as the state where target IS showing.

        else if (state === 'ready') {
            const endTime = Date.now()
            const reactionTime = endTime - this.data.startTime
            this.setData({
                state: 'result',
                reactionTime
            })
            this.saveBestScore(reactionTime)
        }

        // RESULT / TOO-EARLY -> RETRY
        else if (state === 'result' || state === 'too-early') {
            this.initRound()
        }
    },

    initRound() {
        // 1. Pick a random target color
        const colors = this.data.colors
        const targetIndex = Math.floor(Math.random() * colors.length)
        const targetColorObj = colors[targetIndex]

        this.setData({
            state: 'waiting',
            targetColor: targetColorObj.name,
            currentColor: 'white',
            bgClass: 'waiting',
            messageText: `等待变${targetColorObj.label}...`
        })

        // 3. Start the random color cycle
        // Wait 2-5s total until target. During that time, change color 0-2 times?
        // OR: Just schedule the target change.
        // User request: "可能还会变成其他颜色" (It might also turn into other colors).
        // This implies false positives! The screen changes color, but NOT to the target.
        // If user clicks, they fail.

        // Strategy:
        // Schedule the *Critical Event* (Target appearance) at randomly 2s-6s.
        // Schedule 0 or more *Distractor Events* before that time.

        const totalDelay = Math.floor(Math.random() * 4000) + 2000 // 2s - 6s

        // Let's use recursive timeout for better control

        // Initial wait time before ANY color changes (to read the instruction)
        // const initialWait = 1500 

        // Wait for initialWait, THEN start scheduling changes
        // But wait, the totalDelay is the TOTAL time until target.
        // If we want the instructions to show for longer, we should just ensure the first color change (or target) doesn't happen too soon.

        // Strategy: scheduleNextColorChange logic is: "Wait 'nextGap' then do something".
        // If we want the FIRST gap to be longer, we can just pass a longer gap effectively?
        // No, 'elapsed' is used to check against 'totalWait'. 
        // If we start 'elapsed' at 0, and the first text timeout is X.

        // Let's just enforce that the FIRST nextGap is at least 1500ms?
        // Ah, current logic:
        // scheduleNextColorChange(0, totalDelay, target)
        // -> nextGap = random(600-1400)
        // -> setTimeout(..., nextGap)
        // So the first change happens in 600-1400ms.

        // We want that first change to happen AFTER ~1500ms+

        this.scheduleNextColorChange(0, Math.max(totalDelay, 2500), targetColorObj, true)
    },

    scheduleNextColorChange(elapsed: number, totalWait: number, targetColorObj: any, isFirst: boolean = false) {
        // Next change in... 2000ms to 4000ms
        const nextGap = Math.floor(Math.random() * 2000) + 2000

        if (!isFirst && elapsed + nextGap >= totalWait) {
            // Time is up (or close enough), show TARGET!
            const finalDelay = totalWait - elapsed
            const timer = setTimeout(() => {
                this.setData({
                    state: 'ready',
                    currentColor: targetColorObj.name,
                    bgClass: `waiting-${targetColorObj.name}`,
                    startTime: Date.now(),
                    messageText: ''
                })
            }, finalDelay)
            this.setData({ timer })
        } else {
            // Show a DISTRACTOR color
            const timer = setTimeout(() => {
                // Pick random color that is NOT target and NOT current
                const colors = this.data.colors
                let nextColor
                do {
                    nextColor = colors[Math.floor(Math.random() * colors.length)]
                } while (nextColor.name === targetColorObj.name || nextColor.name === this.data.currentColor)

                this.setData({
                    currentColor: nextColor.name,
                    bgClass: `waiting-${nextColor.name}`,
                    messageText: '' // Clear message when distractor appears
                })

                // Continue chain
                this.scheduleNextColorChange(elapsed + nextGap, totalWait, targetColorObj, false)

            }, nextGap)
            this.setData({ timer })
        }
    },

    saveBestScore(time: number) {
        const bestScore = wx.getStorageSync('reaction_best_score')
        if (!bestScore || time < bestScore) {
            wx.setStorageSync('reaction_best_score', time)
            wx.showToast({
                title: '新纪录!',
                icon: 'success'
            })
        }
    }
})
