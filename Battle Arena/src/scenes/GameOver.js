import Phaser from 'phaser';
import { playSfx } from '../managers/Sfx';
import { makeButton, toriiGlyph, RADIUS } from '../ui/PhaserUiKit';
import { attachAmbientGlow } from '../ui/AmbientGlow';

export default class GameOver extends Phaser.Scene
{
    constructor() {
        super('GameOver');
    }

    init(data)
    {
        this.victory       = data.victory || false;
        this.wavesReached  = data.wavesReached || 1;
        this.enemiesKilled = data.enemiesKilled || 0;
        this.coinsEarned   = data.coinsEarned || 0;
        this.durationSec   = data.durationSec || 0;
        this.mapCode       = data.mapCode || 'arena1';
        this.coOp          = data.coOp || false;
        this.waveTimes     = data.waveTimes || [];
        // TEMP DEBUG — remove once the empty-Wave-Times report is confirmed fixed.
        console.log('[GameOver] init() received waveTimes:', JSON.stringify(this.waveTimes));
        this.mvpName       = data.mvpName || null;
        this.mvpReason     = data.mvpReason || null;

        // ==========================================
        // NEW CODE: Store teammates array received from Game scene
        // ==========================================
        this.teammates     = data.teammates || [];

        // New: the "final moments" replay buffer captured in Game.js,
        // forwarded to the backend with this match's result
        this.replaySnapshot = data.replaySnapshot || null;

        this.banked = null;
    }

    create()
    {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.buildBackground(w, h);
        this.cameras.main.fadeIn(600, 0, 0, 0);

        // Real blurred, drifting color orbs (CSS) tinted to this
        // result, plus the same canvas brightness lift the Main Menu
        // uses — gives this screen an actual "lit", alive quality
        // instead of sitting on flat black.
        attachAmbientGlow(this, {
            colors: this.victory
                ? ['rgba(120,255,150,.5)', 'rgba(255,196,84,.35)', 'rgba(90,200,255,.3)']
                : ['rgba(255,80,80,.55)', 'rgba(255,150,60,.3)', 'rgba(160,60,90,.35)']
        });

        this.impact = { fontFamily: 'Impact, sans-serif' };

        this.buildHeading(w, h);
        this.buildStats(w, h);
        this.buildButtons(w, h);

        // Kept so goTimes() can wait for the save to actually land
        // before opening the Leaderboard — see note there.
        this.submitPromise = this.submitResult();
    }

    // Dark diagonal gradient tinted toward the result's own accent
    // colour (green for a win, red for a defeat) — a plain-colour base
    // for the CSS orb backdrop (attachAmbientGlow) to sit on top of.
    // No panel/box anywhere in this — just colour.
    buildBackground(w, h)
    {
        const accent = this.victory ? 0x2f7a4a : 0x7a2f2f;

        const g = this.add.graphics().setPosition(0, 0);
        g.fillGradientStyle(0x141018, 0x0c0c10, accent, 0x08080a, 1, 1, 0.55, 1);
        g.fillRect(0, 0, w, h);
        g.setDepth(-20);
    }

    buildHeading(w, h)
    {
        this.time.delayedCall(50, () => {
            playSfx(this, this.victory ? 'victory' : 'defeat');
        });

        const title = this.victory ? 'ARENA CLEARED' : 'YOU FELL';
        const color = this.victory ? '#8cff9b' : '#ff5555';

        toriiGlyph(this, w / 2, h * 0.16 - 46).setAlpha(0.85);

        const t = this.add.text(w / 2, h * 0.16, title, {
            ...this.impact, fontSize: '62px', fill: color,
            stroke: '#000000', strokeThickness: 7
        }).setOrigin(0.5).setScale(0.7).setAlpha(0);

        this.tweens.add({
            targets: t, scale: 1, alpha: 1,
            duration: 550, ease: 'Back.Out'
        });

        if (this.mvpName) {
            const badge = this.add.text(w / 2, h * 0.16 + 56, '\u2605 MVP: ' + this.mvpName + '  \u2014  ' + this.mvpReason, {
                ...this.impact, fontSize: '20px', fill: '#ffcc44',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: badge, alpha: 1, y: badge.y - 6,
                duration: 500, delay: 700, ease: 'Back.Out'
            });

            this.time.delayedCall(700, () => playSfx(this, 'mvp'));
        }

        const sub = this.victory
            ? 'All ten waves survived'
            : 'Reached wave ' + this.wavesReached;

        this.add.text(w / 2, h * 0.25, sub, {
            ...this.impact, fontSize: '24px', fill: '#999999'
        }).setOrigin(0.5);

        if (this.victory) this.cameras.main.flash(600, 140, 255, 155);
    }

    buildStats(w, h)
    {
        if (this.teammates.length >= 2) {
            this.buildCoOpStats(w, h);
            return;
        }

        const rows = [
            ['Waves survived', this.wavesReached + ' / 10'],
            ['Enemies killed', this.enemiesKilled],
            ['Time survived',  this.formatTime(this.durationSec)],
            ['Mode',          this.coOp ? 'Local co-op' : 'Solo']
        ];

        const startY = h * 0.36;

        // No backing card — stat rows sit directly on the screen.

        rows.forEach(([label, value], i) => {
            const y = startY + i * 38;

            const l = this.add.text(w / 2 - 200, y, label, {
                fontSize: '18px', fill: '#888888', fontStyle: 'bold'
            }).setOrigin(0, 0.5).setAlpha(0);

            const v = this.add.text(w / 2 + 200, y, String(value), {
                ...this.impact, fontSize: '22px', fill: '#ffffff'
            }).setOrigin(1, 0.5).setAlpha(0);

            this.tweens.add({
                targets: [l, v], alpha: 1,
                duration: 260, delay: 400 + i * 150
            });
        });

        // Divider
        this.add.rectangle(w / 2, startY + rows.length * 38 + 4, 420, 2, 0x333333);

        // Coins
        const coinY = startY + rows.length * 38 + 44;

        this.add.text(w / 2 - 200, coinY, 'COINS EARNED', {
            ...this.impact, fontSize: '24px', fill: '#ffffff'
        }).setOrigin(0, 0.5);

        this.coinText = this.add.text(w / 2 + 200, coinY, '0', {
            ...this.impact, fontSize: '36px', fill: '#ffcc00',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(1, 0.5);

        // Count the total up
        const counter = { v: 0 };
        this.tweens.add({
            targets: counter, v: this.coinsEarned,
            duration: 1100, delay: 1000, ease: 'Cubic.Out',
            onUpdate: () => this.coinText.setText(String(Math.round(counter.v)))
        });

        // Banking status
        this.bankText = this.add.text(w / 2, coinY + 38, '', {
            fontSize: '15px', fill: '#888888', fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    buildCoOpStats(w, h)
    {
        const rows = [
            ['Waves survived', this.wavesReached + ' / 10'],
            ['Enemies killed', this.enemiesKilled],
            ['Time survived', this.formatTime(this.durationSec)]
        ];
        const startY = h * 0.36;

        // No backing card — stat rows sit directly on the screen.

        rows.forEach(([label, value], i) => {
            const y = startY + i * 34;
            this.add.text(w / 2 - 200, y, label, {
                fontSize: '17px', fill: '#888888', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            this.add.text(w / 2 + 200, y, String(value), {
                ...this.impact, fontSize: '20px', fill: '#ffffff'
            }).setOrigin(1, 0.5);
        });

        const cardWidth = 330;
        const cardHeight = 112;
        const cardY = startY + rows.length * 34 + 75;
        const gap = 20;
        const totalWidth = cardWidth * 2 + gap;
        const maxKills = Math.max(...this.teammates.map(player => player.kills || 0));
        const mvp = this.teammates.find(player =>
            maxKills > 0 && this.mvpName === player.name
        );

        this.teammates.slice(0, 2).forEach((player, i) => {
            const x = w / 2 - totalWidth / 2 + cardWidth / 2 + i * (cardWidth + gap);
            const isMvp = !!mvp && player === mvp;

            const card = this.add.graphics();
            card.fillStyle(isMvp ? 0x211d10 : 0x141418, 0.9);
            card.fillRoundedRect(x - cardWidth / 2, cardY - cardHeight / 2, cardWidth, cardHeight, RADIUS.md);

            this.add.text(x, cardY - 31, player.name + (isMvp ? '  MVP' : ''), {
                ...this.impact, fontSize: '20px', fill: isMvp ? '#ffcc44' : '#ffffff'
            }).setOrigin(0.5);

            this.add.text(x, cardY + 3, 'KILLS  ' + (player.kills || 0), {
                ...this.impact, fontSize: '18px', fill: '#dddddd'
            }).setOrigin(0.5);

            this.add.text(x, cardY + 32, 'COINS  $' + (player.coins || 0), {
                ...this.impact, fontSize: '18px', fill: '#ffcc00'
            }).setOrigin(0.5);
        });

        this.bankText = this.add.text(w / 2, cardY + cardHeight / 2 + 24, '', {
            fontSize: '15px', fill: '#888888', fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    buildButtons(w, h)
    {
        const y = h * 0.85;

        // Same button size/shape as every other screen (LeaderboardScene,
        // TDMScene, etc.) via the shared kit — spacing widened to 210px
        // so the now-standard 190px-wide buttons don't touch.
        const buttons = [
            { label: 'PLAY AGAIN', color: '#8cff9b', x: -210, action: () => this.playAgain() },
            { label: 'WAVE TIMES', color: '#ffcc00', x: 0,    action: () => this.goTimes() },
            { label: 'MAIN MENU',  color: '#76d7ff', x: 210,  action: () => this.goMenu() }
        ];

        buttons.forEach(b => {
            makeButton(this, { x: w / 2 + b.x, y, label: b.label, colorHex: b.color, onClick: b.action });
        });
    }

    formatTime(sec)
    {
        return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    }

    // ============================================================
    // BANKING
    // ============================================================
    async submitResult()
    {
        this.bankText.setText('Saving result...');

        try {
            const api = (await import('../api/api')).default;

            const res = await api.post('/api/match/complete', {
                coinsEarned:   this.coinsEarned,
                wavesReached:  this.wavesReached,
                enemiesKilled: this.enemiesKilled,
                durationSec:   this.durationSec,
                mapCode:       this.mapCode,
                coOp:          this.coOp,
                victory:       this.victory,
                wasMvp:        !!this.mvpName,
                replaySnapshot: this.replaySnapshot
            });

            this.banked = res;

            if (res.newAchievements && res.newAchievements.length > 0) {
                this.showAchievementPopups(res.newAchievements);
            }

            // New: a level-up moment, shown after any achievement popups
            // so they don't stack on top of each other.
            if (res.leveledUp) {
                const delay = 2400 + (res.newAchievements ? res.newAchievements.length * 1400 : 0);
                this.time.delayedCall(delay, () => this.showLevelUpPopup(res.level));
            }

            this.time.delayedCall(2100, () => {
                const xpLine = res.xpGained ? '   \u2022   +' + res.xpGained + ' XP' : '';
                this.bankText.setText(
                    'Banked to your account  \u2014  balance $' + res.newBalance + xpLine
                );
                this.bankText.setFill('#88ff9b');
            });

        } catch (err) {
            this.time.delayedCall(2100, () => {
                this.bankText.setText('Offline \u2014 coins not saved');
                this.bankText.setFill('#ff7b7b');
            });
        }
    }

    showAchievementPopups(achievements)
    {
        const w = this.cameras.main.width;

        achievements.forEach((ach, i) => {
            this.time.delayedCall(2400 + i * 1400, () => {
                const y = 90;
                const box = this.add.container(w / 2, -60);
                playSfx(this, 'achievement');

                const bg = this.add.graphics();
                bg.fillStyle(0x1a1a24, 0.97);
                bg.fillRoundedRect(-180, -32, 360, 64, RADIUS.md);

                const star = this.add.text(-150, 0, '\u2605', {
                    fontSize: '28px', color: '#ffcc44'
                }).setOrigin(0.5);

                const name = this.add.text(-110, -10, 'ACHIEVEMENT UNLOCKED', {
                    fontSize: '10px', color: '#888888', fontStyle: 'bold'
                }).setOrigin(0, 0.5);

                const title = this.add.text(-110, 10, ach.name, {
                    fontFamily: 'Impact, sans-serif', fontSize: '18px', color: '#ffcc44'
                }).setOrigin(0, 0.5);

                box.add([bg, star, name, title]);

                this.tweens.add({
                    targets: box, y: y,
                    duration: 500, ease: 'Back.Out'
                });

                this.tweens.add({
                    targets: box, y: -60,
                    delay: 3200, duration: 400,
                    onComplete: () => box.destroy()
                });
            });
        });
    }

    // New: same popup treatment as an achievement unlock, but for
    // crossing a level threshold — cosmetic only, no reward to report.
    showLevelUpPopup(level)
    {
        const w = this.cameras.main.width;
        const y = 90;
        const box = this.add.container(w / 2, -60);
        playSfx(this, 'achievement');

        const bg = this.add.graphics();
        bg.fillStyle(0x1a1a24, 0.97);
        bg.fillRoundedRect(-180, -32, 360, 64, RADIUS.md);

        const star = this.add.text(-150, 0, '⬆', {
            fontSize: '26px', color: '#76d7ff'
        }).setOrigin(0.5);

        const name = this.add.text(-110, -10, 'LEVEL UP', {
            fontSize: '10px', color: '#888888', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        const title = this.add.text(-110, 10, 'Level ' + level, {
            fontFamily: 'Impact, sans-serif', fontSize: '18px', color: '#76d7ff'
        }).setOrigin(0, 0.5);

        box.add([bg, star, name, title]);

        this.tweens.add({
            targets: box, y: y,
            duration: 500, ease: 'Back.Out'
        });

        this.tweens.add({
            targets: box, y: -60,
            delay: 3200, duration: 400,
            onComplete: () => box.destroy()
        });
    }

    // ============================================================
    // NAVIGATION
    // ============================================================
    playAgain()
    {
        this.sound.stopAll();
        this.scene.start('MapSelect');
    }

    // ============================================================
    // OLD CODE REPLACED BELOW:
    // goTimes() without forwarding teammate stats to LeaderboardScene
    // ============================================================
    // goTimes()
    // {
    //     const total = this.waveTimes.reduce((sum, t) => sum + t.seconds, 0);
    //     this.scene.start('LeaderboardScene', {
    //         waveTimes: this.waveTimes,
    //         totalSeconds: total,
    //         victory: this.victory,
    //         fromGameOver: true
    //     });
    // }

    // ============================================================
    // NEW CODE: Pass teammates array to LeaderboardScene
    // ============================================================
    async goTimes()
    {
        // submitResult() posts this match to the backend in the
        // background; if the player hits this button quickly, the
        // Leaderboard's own fetch could land before that POST does,
        // so it would open without this match's result yet in it.
        // submitResult() already catches its own errors, so this
        // never throws — it just makes sure the save has actually
        // finished (or failed) before we navigate.
        if (this.submitPromise) await this.submitPromise;

        const total = this.waveTimes.reduce((sum, t) => sum + t.seconds, 0);
        this.scene.start('LeaderboardScene', {
            waveTimes: this.waveTimes,
            totalSeconds: total,
            victory: this.victory,
            fromGameOver: true,
            teammates: this.teammates
        });
    }

    goMenu()
    {
        this.sound.stopAll();
        this.scene.start('MenuScene');
    }
}