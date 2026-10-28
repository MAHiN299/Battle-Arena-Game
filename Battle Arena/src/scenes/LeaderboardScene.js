import Phaser from 'phaser';
import api from '../api/api';
import net from '../net/NetClient';
import { drawCard, makeButton, toriiGlyph } from '../ui/PhaserUiKit';
import { attachAmbientGlow } from '../ui/AmbientGlow';

// A single row's background — a softly rounded chip rather than a
// sharp-edged rectangle, the same shape language used for the medal
// badges below. Used for every alternating/zebra row and the "this
// is you" highlight on both tables, so scanning a row of data reads
// as one consistent system rather than plain flat strips.
function rowChip(scene, x, y, w, h, color, alpha, strokeColor, strokeAlpha) {
    const g = scene.add.graphics().setPosition(x, y);
    g.fillStyle(color, alpha);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    if (strokeColor !== undefined) {
        g.lineStyle(1, strokeColor, strokeAlpha ?? 0.4);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    }
    return g;
}

export default class LeaderboardScene extends Phaser.Scene
{
    constructor() {
        super('LeaderboardScene');
    }

    init(data)
    {
        this.waveTimes     = data.waveTimes || [];
        // TEMP DEBUG — remove once the empty-Wave-Times report is confirmed fixed.
        console.log('[LeaderboardScene] init() received waveTimes:', JSON.stringify(this.waveTimes));
        this.totalSeconds  = data.totalSeconds || 0;
        this.victory       = data.victory || false;
        this.fromGameOver  = data.fromGameOver || false;
        this.newRecord     = false;

        // ==========================================
        // NEW CODE: Initialize teammates and mvpName from scene data
        // ==========================================
        this.teammates     = data.teammates || [];
        this.mvpName       = data.mvpName || null;
    }

    create()
    {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.buildBackground(w, h);
        this.cameras.main.fadeIn(400, 0, 0, 0);

        // Real blurred, drifting gold/amber color orbs (CSS) plus the
        // same canvas brightness lift the Main Menu uses — gives this
        // screen an actual "lit", alive quality instead of sitting on
        // flat black.
        attachAmbientGlow(this, {
            colors: ['rgba(255,204,0,.5)', 'rgba(255,140,60,.32)', 'rgba(120,170,255,.28)']
        });

        this.impact = { fontFamily: 'Impact, sans-serif' };

        // No backing panels — both halves sit directly on the screen,
        // separated by a single soft divider line instead of a boxed
        // frame around either side.
        this.add.rectangle(w * 0.48, h / 2, 1, h * 0.78, 0xffcc00, 0.14);

        toriiGlyph(this, w * 0.28 - 140, 46);

        this.add.text(w * 0.28, 46, 'WAVE TIMES', {
            ...this.impact, fontSize: '42px', fill: '#ffffff',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        this.buildTable(w, h);
        this.buildButtons(w, h);

        this.checkRecord();

        this.buildGlobalPanel(w, h);
        this.loadGlobalLeaderboard();

        // New: listen for real-time leaderboard updates pushed by the server
        this.onLeaderboardChanged = (msg) => {
            if (msg.type === 'leaderboardChanged' && this.currentTab === 'global') {
                this.loadGlobalLeaderboard();
            }
        };
        net.on('leaderboardChanged', this.onLeaderboardChanged);

        this.events.once('shutdown', () => {
            net.off('leaderboardChanged', this.onLeaderboardChanged);
        });
    }

    // Dark gold-tinted diagonal gradient — a plain-colour base for the
    // CSS orb backdrop (attachAmbientGlow) to sit on top of. Still no
    // panel/box anywhere, just colour, matching the divider-only layout.
    buildBackground(w, h)
    {
        const accent = 0x6a5220;

        const g = this.add.graphics().setPosition(0, 0);
        g.fillGradientStyle(0x14120c, 0x0c0c10, accent, 0x08080a, 1, 1, 0.5, 1);
        g.fillRect(0, 0, w, h);
        g.setDepth(-20);
    }

    // ============================================================
    // TABLE
    // ============================================================
    buildTable(w, h)
    {
        const startY = 120;
        const rowH = 34;
        // Same row baseline as the Leaderboard table on the other half
        // of the screen (its rows start at y=156), so the two grids
        // line up across the divider instead of drifting by a few px.
        const rowStartY = 156;

        // Header
        this.add.text(w * 0.28 - 200, startY, 'WAVE', {
            fontSize: '13px', fill: '#666666', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        this.add.text(w * 0.28, startY, 'TIME', {
            fontSize: '13px', fill: '#666666', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(w * 0.28 + 200, startY, 'PACE', {
            fontSize: '13px', fill: '#666666', fontStyle: 'bold'
        }).setOrigin(1, 0.5);

        this.add.rectangle(w * 0.28, startY + 14, 440, 1, 0xffcc00, 0.2);

        // Fastest and slowest, for the pace column
        const times = this.waveTimes.map(t => t.seconds);
        const best  = times.length ? Math.min(...times) : 0;
        const worst = times.length ? Math.max(...times) : 0;

        this.waveTimes.forEach((entry, i) => {
            const y = rowStartY + i * rowH;

            const isBest  = entry.seconds === best && times.length > 1;
            const isWorst = entry.seconds === worst && times.length > 1;

            const rowColor = isBest ? '#88ff9b' : isWorst ? '#ff9966' : '#dddddd';

            // Alternating background — a soft rounded chip, same shape
            // language as the Leaderboard rows and the rank badges.
            if (i % 2 === 0) {
                rowChip(this, w * 0.28, y, 440, rowH - 4, 0x141418, 0.6);
            }

            const label = this.add.text(w * 0.28 - 200, y, 'WAVE ' + entry.wave, {
                ...this.impact, fontSize: '19px', fill: rowColor
            }).setOrigin(0, 0.5).setAlpha(0);

            const timeTxt = this.add.text(w * 0.28, y, this.fmt(entry.seconds), {
                ...this.impact, fontSize: '21px', fill: rowColor
            }).setOrigin(0.5).setAlpha(0);

            const pace = isBest ? 'FASTEST' : isWorst ? 'SLOWEST' : '';
            const paceTxt = this.add.text(w * 0.28 + 200, y, pace, {
                fontSize: '12px', fill: rowColor, fontStyle: 'bold'
            }).setOrigin(1, 0.5).setAlpha(0);

            // Reveal each row in sequence
            this.tweens.add({
                targets: [label, timeTxt, paceTxt],
                alpha: 1,
                x: '+=6',
                duration: 240,
                delay: 200 + i * 110
            });
        });

        // Total
        const totalY = rowStartY + this.waveTimes.length * rowH + 18;

        this.add.rectangle(w * 0.28, totalY - 14, 440, 2, 0x444444);

        this.add.text(w * 0.28 - 200, totalY, 'TOTAL', {
            ...this.impact, fontSize: '24px', fill: '#ffffff'
        }).setOrigin(0, 0.5);

        this.totalText = this.add.text(w * 0.28 + 200, totalY, '0:00', {
            ...this.impact, fontSize: '30px', fill: '#ffcc00',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0.5);

        // Count up to the total
        const counter = { v: 0 };
        this.tweens.add({
            targets: counter, v: this.totalSeconds,
            duration: 900,
            delay: 300 + this.waveTimes.length * 110,
            onUpdate: () => this.totalText.setText(this.fmt(Math.round(counter.v)))
        });

        this.recordLine = this.add.text(w * 0.28, totalY + 36, '', {
            fontSize: '14px', fill: '#888888', fontStyle: 'bold'
        }).setOrigin(0.5);

        // ==========================================
        // NEW CODE: Render side-by-side teammate comparison if 2 players played
        // ==========================================
        if (this.teammates && this.teammates.length === 2) {
            const teamY = totalY + 70;

            this.add.rectangle(w * 0.28, teamY - 16, 440, 1, 0x333333);

            this.add.text(w * 0.28, teamY, 'MATCH COMPARISON', {
                ...this.impact, fontSize: '20px', fill: '#ffcc00',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5);

            const p1 = this.teammates[0];
            const p2 = this.teammates[1];

            const isP1Mvp = this.mvpName && p1.name && p1.name.toLowerCase() === this.mvpName.toLowerCase();
            const isP2Mvp = this.mvpName && p2.name && p2.name.toLowerCase() === this.mvpName.toLowerCase();

            const c1Color = isP1Mvp ? '#ffcc00' : '#ffffff';
            const c2Color = isP2Mvp ? '#ffcc00' : '#ffffff';

            const cardY = teamY + 54;

            // Player 1 Card (rounded, matching every other card on this screen)
            const card1Bg = this.add.graphics().setPosition(w * 0.28 - 105, cardY);
            card1Bg.fillStyle(0x141418, 1);
            card1Bg.fillRoundedRect(-100, -35, 200, 70, 10);
            const p1Title = (isP1Mvp ? '★ ' : '') + p1.name;
            const card1Name = this.add.text(w * 0.28 - 105, cardY - 18, p1Title, {
                ...this.impact, fontSize: '18px', fill: c1Color
            }).setOrigin(0.5);
            const card1Stats = this.add.text(w * 0.28 - 105, cardY + 12, 'Kills: ' + p1.kills + '  |  Coins: ' + p1.coins, {
                fontSize: '13px', fill: '#aaaaaa', fontStyle: 'bold'
            }).setOrigin(0.5);

            // Player 2 Card
            const card2Bg = this.add.graphics().setPosition(w * 0.28 + 105, cardY);
            card2Bg.fillStyle(0x141418, 1);
            card2Bg.fillRoundedRect(-100, -35, 200, 70, 10);
            const p2Title = (isP2Mvp ? '★ ' : '') + p2.name;
            const card2Name = this.add.text(w * 0.28 + 105, cardY - 18, p2Title, {
                ...this.impact, fontSize: '18px', fill: c2Color
            }).setOrigin(0.5);
            const card2Stats = this.add.text(w * 0.28 + 105, cardY + 12, 'Kills: ' + p2.kills + '  |  Coins: ' + p2.coins, {
                fontSize: '13px', fill: '#aaaaaa', fontStyle: 'bold'
            }).setOrigin(0.5);

            card1Bg.setAlpha(0); card1Name.setAlpha(0); card1Stats.setAlpha(0);
            card2Bg.setAlpha(0); card2Name.setAlpha(0); card2Stats.setAlpha(0);

            this.tweens.add({
                targets: [card1Bg, card1Name, card1Stats, card2Bg, card2Name, card2Stats],
                alpha: 1,
                duration: 300,
                delay: 400 + this.waveTimes.length * 110
            });
        }
    }

    fmt(sec)
    {
        return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    }

    // ============================================================
    // PERSONAL BEST
    // ============================================================
    checkRecord()
    {
        const wavesCleared = this.waveTimes.length;
        const key = 'battleArenaBest_' + wavesCleared;

        let previous = null;
        try {
            const raw = localStorage.getItem(key);
            if (raw) previous = JSON.parse(raw);
        } catch (e) {}

        const beatIt = !previous || this.totalSeconds < previous.totalSeconds;

        const delay = 400 + this.waveTimes.length * 110 + 900;

        if (beatIt && wavesCleared > 0) {
            this.newRecord = true;

            try {
                localStorage.setItem(key, JSON.stringify({
                    totalSeconds: this.totalSeconds,
                    waveTimes: this.waveTimes,
                    setAt: Date.now()
                }));
            } catch (e) {}

            this.time.delayedCall(delay, () => this.showRecordPopup(previous));
        }
        else if (previous) {
            this.time.delayedCall(delay, () => {
                const diff = this.totalSeconds - previous.totalSeconds;
                this.recordLine.setText(
                    'Personal best: ' + this.fmt(previous.totalSeconds) +
                    '   (+' + this.fmt(diff) + ')'
                );
            });
        }
    }

    showRecordPopup(previous)
    {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        const box = drawCard(this, w / 2, h / 2, 520, 200, 0xffcc00, { fillColor: 0x16161a, fillAlpha: 1, strokeAlpha: 1, border: false })
            .setDepth(101).setScale(0.6).setAlpha(0);

        const title = this.add.text(w / 2, h / 2 - 48, 'NEW RECORD', {
            ...this.impact, fontSize: '46px', fill: '#ffcc00',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(102).setScale(0.6).setAlpha(0);

        const detail = this.add.text(w / 2, h / 2 + 4,
            this.waveTimes.length + ' waves in ' + this.fmt(this.totalSeconds), {
                ...this.impact, fontSize: '24px', fill: '#ffffff'
            }).setOrigin(0.5).setDepth(102).setAlpha(0);

        const improve = previous
            ? 'Beat your old time by ' + this.fmt(previous.totalSeconds - this.totalSeconds)
            : 'First recorded run';

        const sub = this.add.text(w / 2, h / 2 + 40, improve, {
            fontSize: '15px', fill: '#88ff9b', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(102).setAlpha(0);

        this.tweens.add({
            targets: [box, title],
            scale: 1, alpha: 1,
            duration: 450, ease: 'Back.Out'
        });

        this.tweens.add({
            targets: [detail, sub],
            alpha: 1, duration: 300, delay: 300
        });

        this.cameras.main.flash(400, 255, 220, 100);

        // Sparkle burst
        for (let i = 0; i < 20; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = Phaser.Math.Between(80, 240);

            const s = this.add.circle(w / 2, h / 2, 3, 0xffcc00)
                .setDepth(103);

            this.tweens.add({
                targets: s,
                x: w / 2 + Math.cos(a) * d,
                y: h / 2 + Math.sin(a) * d,
                alpha: 0,
                duration: Phaser.Math.Between(600, 1100),
                delay: 200
            });
        }

        // Dismiss on click or key
        const dismiss = () => {
            [box, title, detail, sub].forEach(e => {
                this.tweens.add({
                    targets: e, alpha: 0, duration: 250,
                    onComplete: () => e.destroy()
                });
            });
        };

        this.time.delayedCall(600, () => {
            this.input.once('pointerdown', dismiss);
            this.input.keyboard.once('keydown', dismiss);
        });
    }

    // ============================================================
    // GLOBAL LEADERBOARD — right half of the screen
    // ============================================================

    // ==========================================
    // OLD CODE REPLACED BELOW:
    // Header labels were throwaway text objects without instance references or helper method
    // ==========================================
    // buildGlobalPanel(w, h)
    // {
    //     const panelX = w * 0.68;
    //
    //     this.add.text(panelX, 36, 'LEADERBOARD', {
    //         ...this.impact, fontSize: '30px', fill: '#ffcc00',
    //         stroke: '#000000', strokeThickness: 5
    //     }).setOrigin(0.5);
    //
    //     // Tab selection controls
    //     this.tabGlobal = this.add.text(panelX - 120, 68, 'GLOBAL', {
    //         ...this.impact, fontSize: '16px', fill: '#ffcc00'
    //     }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    //
    //     this.tabHistory = this.add.text(panelX, 68, 'MY HISTORY', {
    //         ...this.impact, fontSize: '16px', fill: '#666666'
    //     }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    //
    //     this.tabAchievements = this.add.text(panelX + 120, 68, 'BADGES', {
    //         ...this.impact, fontSize: '16px', fill: '#666666'
    //     }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    //
    //     this.tabGlobal.on('pointerdown', () => this.switchTab('global'));
    //     this.tabHistory.on('pointerdown', () => this.switchTab('history'));
    //     this.tabAchievements.on('pointerdown', () => this.switchTab('achievements'));
    //
    //     this.currentTab = 'global';
    //
    //     this.globalStatus = this.add.text(panelX, 90, 'Loading...', {
    //         fontSize: '14px', fill: '#888888', fontStyle: 'bold'
    //     }).setOrigin(0.5);
    //
    //     this.add.text(panelX - 210, 122, '#', {
    //         fontSize: '12px', fill: '#666666', fontStyle: 'bold'
    //     }).setOrigin(0, 0.5);
    //
    //     this.add.text(panelX - 170, 122, 'PLAYER', {
    //         fontSize: '12px', fill: '#666666', fontStyle: 'bold'
    //     }).setOrigin(0, 0.5);
    //
    //     this.add.text(panelX + 60, 122, 'WAVE', {
    //         fontSize: '12px', fill: '#666666', fontStyle: 'bold'
    //     }).setOrigin(0.5);
    //
    //     this.add.text(panelX + 210, 122, 'TIME', {
    //         fontSize: '12px', fill: '#666666', fontStyle: 'bold'
    //     }).setOrigin(1, 0.5);
    //
    //     this.add.rectangle(panelX, 134, 440, 1, 0x333333);
    //
    //     this.globalPanelX = panelX;
    //     this.globalRows = [];
    // }

    // ==========================================
    // NEW CODE: Instance refs stored for headers and setColumnHeaders helper added
    // ==========================================
    buildGlobalPanel(w, h)
    {
        const panelX = w * 0.68;

        this.add.text(panelX, 36, 'LEADERBOARD', {
            ...this.impact, fontSize: '30px', fill: '#ffcc00',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5);

        // Tab selection controls — a real tab bar, not just a color
        // swap: an underline slides to whichever tab is active, the
        // same "reacts to state" language as the menu buttons.
        this.tabGlobal = this.add.text(panelX - 120, 68, 'GLOBAL', {
            ...this.impact, fontSize: '16px', fill: '#ffcc00'
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

        this.tabHistory = this.add.text(panelX, 68, 'MY HISTORY', {
            ...this.impact, fontSize: '16px', fill: '#666666'
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

        this.tabAchievements = this.add.text(panelX + 120, 68, 'BADGES', {
            ...this.impact, fontSize: '16px', fill: '#666666'
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

        this.tabIndicator = this.add.rectangle(
            this.tabGlobal.x, 80, this.tabGlobal.width + 8, 2, 0xffcc00
        );

        this.tabGlobal.on('pointerdown', () => this.switchTab('global'));
        this.tabHistory.on('pointerdown', () => this.switchTab('history'));
        this.tabAchievements.on('pointerdown', () => this.switchTab('achievements'));

        this.currentTab = 'global';

        this.globalStatus = this.add.text(panelX, 90, 'Loading...', {
            fontSize: '14px', fill: '#888888', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.headerCol1 = this.add.text(panelX - 210, 122, '#', {
            fontSize: '12px', fill: '#666666', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        this.headerCol2 = this.add.text(panelX - 170, 122, 'PLAYER', {
            fontSize: '12px', fill: '#666666', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        this.headerCol3 = this.add.text(panelX + 60, 122, 'WAVE', {
            fontSize: '12px', fill: '#666666', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.headerCol4 = this.add.text(panelX + 210, 122, 'TIME', {
            fontSize: '12px', fill: '#666666', fontStyle: 'bold'
        }).setOrigin(1, 0.5);

        this.headerLine = this.add.rectangle(panelX, 134, 440, 1, 0x333333);

        this.globalPanelX = panelX;
        this.globalRows = [];
    }

    // ==========================================
    // NEW CODE: Helper to update or hide table column headers based on active tab
    // ==========================================
    setColumnHeaders(col1, col2, col3, col4)
    {
        const cols = [
            { ref: this.headerCol1, text: col1 },
            { ref: this.headerCol2, text: col2 },
            { ref: this.headerCol3, text: col3 },
            { ref: this.headerCol4, text: col4 }
        ];

        let anyVisible = false;

        cols.forEach(c => {
            if (c.text !== null) {
                c.ref.setText(c.text).setVisible(true);
                anyVisible = true;
            } else {
                c.ref.setVisible(false);
            }
        });

        if (this.headerLine) this.headerLine.setVisible(anyVisible);
    }

    // ==========================================
    // OLD CODE REPLACED BELOW:
    // switchTab without dynamic column header updates
    // ==========================================
    // switchTab(tab)
    // {
    //     if (this.currentTab === tab) return;
    //     this.currentTab = tab;
    //
    //     this.tabGlobal.setFill(tab === 'global' ? '#ffcc00' : '#666666');
    //     this.tabHistory.setFill(tab === 'history' ? '#ffcc00' : '#666666');
    //     this.tabAchievements.setFill(tab === 'achievements' ? '#ffcc00' : '#666666');
    //
    //     this.globalRows.forEach(o => o.destroy());
    //     this.globalRows = [];
    //
    //     if (tab === 'global') {
    //         this.loadGlobalLeaderboard();
    //     } else if (tab === 'history') {
    //         this.loadMyHistory();
    //     } else if (tab === 'achievements') {
    //         this.loadAchievements();
    //     }
    // }

    // ==========================================
    // NEW CODE: switchTab updated to call setColumnHeaders for each specific tab view
    // ==========================================
    switchTab(tab)
    {
        if (this.currentTab === tab) return;
        this.currentTab = tab;

        this.tabGlobal.setFill(tab === 'global' ? '#ffcc00' : '#666666');
        this.tabHistory.setFill(tab === 'history' ? '#ffcc00' : '#666666');
        this.tabAchievements.setFill(tab === 'achievements' ? '#ffcc00' : '#666666');

        const activeTabText = tab === 'global' ? this.tabGlobal
            : tab === 'history' ? this.tabHistory
            : this.tabAchievements;

        this.tweens.add({
            targets: this.tabIndicator,
            x: activeTabText.x,
            width: activeTabText.width + 8,
            duration: 200, ease: 'Cubic.Out'
        });

        this.globalRows.forEach(o => o.destroy());
        this.globalRows = [];

        if (tab === 'global') {
            this.setColumnHeaders('#', 'PLAYER', 'WAVE', 'TIME');
            this.loadGlobalLeaderboard();
        } else if (tab === 'history') {
            this.setColumnHeaders(null, 'MATCH', 'WAVE', 'DATE');
            this.loadMyHistory();
        } else if (tab === 'achievements') {
            this.setColumnHeaders(null, null, null, null);
            this.loadAchievements();
        }
    }

    async loadGlobalLeaderboard()
    {
        const requestId = (this.globalRequestId || 0) + 1;
        this.globalRequestId = requestId;
        try {
            const entries = await api.getLeaderboard();
            if (requestId !== this.globalRequestId || this.currentTab !== 'global') return;
            this.renderGlobalRows(entries);
        } catch (err) {
            if (requestId !== this.globalRequestId || this.currentTab !== 'global') return;
            this.globalStatus.setText('Could not load — ' + err.message);
            this.globalStatus.setFill('#ff7b7b');
        }
    }

    async loadMyHistory()
    {
        this.globalStatus.setText('Loading...').setVisible(true).setFill('#888888');
        try {
            const entries = await api.getMatchHistory();
            this.renderHistoryRows(entries);
        } catch (err) {
            this.globalStatus.setText('Could not load — ' + err.message).setFill('#ff7b7b');
        }
    }

    async loadAchievements()
    {
        this.globalStatus.setText('Loading...').setVisible(true).setFill('#888888');
        try {
            const list = await api.getAchievements();
            this.renderAchievementRows(list);
        } catch (err) {
            this.globalStatus.setText('Could not load').setFill('#ff7b7b');
        }
    }

    renderGlobalRows(entries)
    {
        this.globalRows.forEach(o => o.destroy());
        this.globalRows = [];
        this.globalStatus.setVisible(false);

        if (!entries || entries.length === 0) {
            this.globalStatus.setText('No runs recorded yet').setVisible(true).setFill('#888888');
            return;
        }

        const panelX = this.globalPanelX;
        const rowH = 30;
        const startY = 156;
        const me = api.getUser() ? api.getUser().username : null;

        entries.slice(0, 10).forEach((entry, i) => {
            const y = startY + i * rowH;
            const isMe = entry.username === me;
            const rowColor = isMe ? '#ffcc00' : (i < 3 ? '#ffffff' : '#aaaaaa');

            // Exactly one background chip per row — the gold "it's you"
            // highlight takes priority over the plain zebra stripe
            // rather than both being drawn stacked on the same row
            // (which is what caused rows to look "overlapping" when the
            // signed-in player's own row also happened to be an even
            // one).
            if (isMe) {
                this.globalRows.push(
                    rowChip(this, panelX, y, 440, rowH - 4, 0xffcc00, 0.1, 0xffcc00, 0.4)
                );
            } else if (i % 2 === 0) {
                this.globalRows.push(
                    rowChip(this, panelX, y, 440, rowH - 4, 0x141418, 0.5)
                );
            }

            // Rank — a medal for the top 3, a small circular badge with
            // the number for everyone else, instead of bare text.
            const rankParts = [];
            if (i < 3) {
                rankParts.push(
                    this.add.text(panelX - 202, y, ['🥇', '🥈', '🥉'][i], {
                        fontSize: '16px'
                    }).setOrigin(0.5).setAlpha(0)
                );
            } else {
                rankParts.push(
                    this.add.circle(panelX - 202, y, 11, 0x1c1c22, 0.9)
                        .setStrokeStyle(1, 0x444444, 0.8).setAlpha(0),
                    this.add.text(panelX - 202, y, String(i + 1), {
                        ...this.impact, fontSize: '13px', fill: rowColor
                    }).setOrigin(0.5).setAlpha(0)
                );
            }

            const label = entry.username + (entry.victory ? '   ✓' : '') + (entry.coOp ? '   👥' : '');

            const el2 = this.add.text(panelX - 170, y, label, {
                fontSize: '15px', fill: rowColor, fontStyle: isMe ? 'bold' : 'normal'
            }).setOrigin(0, 0.5).setAlpha(0);

            const el3 = this.add.text(panelX + 60, y, String(entry.wavesReached), {
                ...this.impact, fontSize: '16px', fill: rowColor
            }).setOrigin(0.5).setAlpha(0);

            const el4 = this.add.text(panelX + 210, y, this.fmt(entry.durationSec), {
                ...this.impact, fontSize: '15px', fill: rowColor
            }).setOrigin(1, 0.5).setAlpha(0);

            const rowTargets = [...rankParts, el2, el3, el4];
            this.globalRows.push(...rowTargets);

            this.tweens.add({
                targets: rowTargets,
                alpha: 1, x: '+=6',
                duration: 220, delay: 150 + i * 70
            });
        });
    }

    renderHistoryRows(entries)
    {
        this.globalStatus.setVisible(false);

        if (!entries || entries.length === 0) {
            this.globalStatus.setText('No matches played yet').setVisible(true).setFill('#888888');
            return;
        }

        const panelX = this.globalPanelX;
        const rowH = 30;
        const startY = 156;

        entries.forEach((entry, i) => {
            const y = startY + i * rowH;
            const rowColor = entry.victory ? '#88ff9b' : '#dddddd';

            // Same rounded chip as the other tables, and — unlike
            // before — actually tracked in globalRows so it gets
            // cleaned up on the next tab switch instead of being left
            // behind to pile up underneath whatever tab loads next.
            if (i % 2 === 0) {
                this.globalRows.push(rowChip(this, panelX, y, 440, rowH - 4, 0x141418, 0.5));
            }

            const label = entry.mapCode + (entry.victory ? '   ✓' : '') + (entry.coOp ? '   👥' : '');

            const el1 = this.add.text(panelX - 210, y, label, {
                fontSize: '14px', fill: rowColor
            }).setOrigin(0, 0.5).setAlpha(0);

            const el2 = this.add.text(panelX + 60, y, 'W' + entry.wavesReached, {
                ...this.impact, fontSize: '15px', fill: rowColor
            }).setOrigin(0.5).setAlpha(0);

            const el3 = this.add.text(panelX + 210, y, entry.playedAt, {
                fontSize: '12px', fill: '#888888'
            }).setOrigin(1, 0.5).setAlpha(0);

            this.globalRows.push(el1, el2, el3);

            this.tweens.add({
                targets: [el1, el2, el3], alpha: 1, x: '+=6',
                duration: 220, delay: 100 + i * 60
            });
        });
    }

    // ==========================================
    // OLD CODE REPLACED BELOW:
    // Simple icon and text rendering for achievements without card layout or status indicators
    // ==========================================
    // renderAchievementRows(list)
    // {
    //     this.globalStatus.setVisible(false);
    //
    //     const panelX = this.globalPanelX;
    //     const rowH = 46;
    //     const startY = 160;
    //
    //     list.forEach((a, i) => {
    //         const y = startY + i * rowH;
    //         const color = a.unlocked ? '#ffcc44' : '#555555';
    //
    //         const icon = this.add.text(panelX - 210, y, a.unlocked ? '\u2605' : '\u2606', {
    //             fontSize: '18px', fill: color
    //         }).setOrigin(0, 0.5).setAlpha(0);
    //
    //         const name = this.add.text(panelX - 175, y - 12, a.name, {
    //             fontFamily: 'Impact, sans-serif', fontSize: '15px', fill: color
    //         }).setOrigin(0, 0.5).setAlpha(0);
    //
    //         const desc = this.add.text(panelX - 175, y + 8, a.description, {
    //             fontSize: '11px', fill: a.unlocked ? '#aaaaaa' : '#444444'
    //         }).setOrigin(0, 0.5).setAlpha(0);
    //
    //         this.globalRows.push(icon, name, desc);
    //
    //         this.tweens.add({
    //             targets: [icon, name, desc], alpha: 1,
    //             duration: 220, delay: 100 + i * 70
    //         });
    //     });
    // }

    // ==========================================
    // NEW CODE: Structured achievement card panels with badges, accent sidebars, checkmarks, and clear spacing
    // ==========================================
    renderAchievementRows(list)
    {
        this.globalStatus.setVisible(false);

        const panelX = this.globalPanelX;
        const rowH = 54;
        const startY = 145;

        list.forEach((a, i) => {
            const y = startY + i * rowH;
            const isUnlocked = !!a.unlocked;

            const cardBgColor = isUnlocked ? 0x181820 : 0x111115;
            const strokeColor = isUnlocked ? 0x3d3d52 : 0x222228;
            const accentColor = isUnlocked ? 0xffcc44 : 0x44444e;
            const titleColor  = isUnlocked ? '#ffcc44' : '#666666';
            const descColor   = isUnlocked ? '#bbbbbb' : '#444444';

            // Card Panel Background
            const card = this.add.rectangle(panelX, y, 440, rowH - 6, cardBgColor)
                .setStrokeStyle(1, strokeColor);

            // Left Accent Bar
            const accentBar = this.add.rectangle(panelX - 218, y, 4, rowH - 6, accentColor);

            // Circular Star Badge
            const circleBadge = this.add.circle(panelX - 188, y, 14, isUnlocked ? 0x2a2a18 : 0x1a1a20)
                .setStrokeStyle(1, isUnlocked ? 0xffcc44 : 0x44444e);

            const starIcon = this.add.text(panelX - 188, y, isUnlocked ? '\u2605' : '\u2606', {
                fontSize: '14px', fill: isUnlocked ? '#ffcc44' : '#55555e'
            }).setOrigin(0.5);

            // Achievement Title & Description with distinct vertical separation
            const title = this.add.text(panelX - 162, y - 9, a.name, {
                fontFamily: 'Impact, sans-serif', fontSize: '15px', fill: titleColor
            }).setOrigin(0, 0.5);

            const desc = this.add.text(panelX - 162, y + 10, a.description, {
                fontSize: '11px', fill: descColor
            }).setOrigin(0, 0.5);

            const rowElements = [card, accentBar, circleBadge, starIcon, title, desc];

            // Right Unlocked Checkmark Indicator
            if (isUnlocked) {
                const checkmark = this.add.text(panelX + 200, y, '✓', {
                    fontSize: '16px', fill: '#88ff9b', fontStyle: 'bold'
                }).setOrigin(0.5);
                rowElements.push(checkmark);
            }

            rowElements.forEach(el => el.setAlpha(0));
            this.globalRows.push(...rowElements);

            this.tweens.add({
                targets: rowElements, alpha: 1,
                duration: 220, delay: 100 + i * 70
            });
        });
    }

    // ============================================================
    // BUTTONS
    // ============================================================
    buildButtons(w, h)
    {
        const y = h - 54;

        // Same 190px button as every other screen — spacing widened
        // from the old ±120/240px gap to ±210 so two full-width
        // buttons don't crowd each other.
        const buttons = [
            { label: 'PLAY AGAIN', color: '#8cff9b', x: -110, action: () => this.scene.start('MapSelect') },
            { label: 'MAIN MENU',  color: '#76d7ff', x: 110,  action: () => this.scene.start('MenuScene') }
        ];

        buttons.forEach(b => {
            makeButton(this, {
                x: w / 2 + b.x, y,
                label: b.label, colorHex: b.color,
                onClick: () => { this.sound.stopAll(); b.action(); }
            });
        });
    }
}