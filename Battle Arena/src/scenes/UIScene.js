import Phaser from 'phaser';
import { RADIUS, COLOR } from '../ui/PhaserUiKit';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    init(data) {
        this.p1 = data.player1;
        this.p2 = data.player2;

        this.elapsedMs = 0;
        this.waveElapsedMs = 0;
        this.currentWave = 0;
        this.boss = null;
    }

    create() {
        const width = this.cameras.main.width;

        this.gameScene = this.scene.get('Game');

        this.styles();

        this.buildPlayerPanel(this.p1, 'left');
        if (this.p2) this.buildPlayerPanel(this.p2, 'right');

        this.buildCentrePanel(width);
        this.buildBossBar(width);
        this.buildSupplyHud(width);

        this.wireEvents();
    }

    // ============================================================
    // STYLES
    // ============================================================
    styles() {
        this.uiTextStyle = {
            fontFamily: 'Impact, sans-serif',
            fontSize: '32px',
            fill: '#eeeeee',
            stroke: '#000000',
            strokeThickness: 2,
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, fill: true }
        };

        this.timerStyle = { ...this.uiTextStyle, fill: '#d34327', fontSize: '34px' };

        this.coinStyle = {
            fontFamily: 'Impact, sans-serif',
            fontSize: '22px',
            fill: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true }
        };

        this.countStyle = {
            fontFamily: 'Impact, sans-serif',
            fontSize: '24px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true }
        };

        this.ammoStyle = {
            fontFamily: 'Impact, sans-serif',
            fontSize: '22px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        };
    }

    // ============================================================
    // PLAYER PANELS
    // ============================================================
    buildPlayerPanel(player, side) {
        const width = this.cameras.main.width;
        const isLeft = side === 'left';

        const avatarX = isLeft ? 60 : width - 60;
        const barX = isLeft ? 110 : width - 110;
        const originX = isLeft ? 0 : 1;
        const accent = isLeft ? 0xff0000 : 0x44aaff;

        const panel = {};

        // No backing card behind this cluster — just the avatar, bars
        // and text directly over the gameplay, relying on their own
        // stroke/shadow for legibility.

        // Avatar
        this.add.circle(avatarX, 45, 35, 0x333333).setStrokeStyle(3, accent);

        const pic = player.heroPrefix === 'hero2' ? 'heroPP_2' : 'heroPP_1';
        panel.avatar = this.add.image(avatarX, 45, pic).setDisplaySize(60, 60);
        if (!isLeft) panel.avatar.setFlipX(true);

        // Coins
        panel.coinText = this.add.text(avatarX, 95, '$0', this.coinStyle).setOrigin(0.5);

        // Health bar
        this.add.rectangle(barX, 30, 200, 20, 0x000000).setOrigin(originX, 0.5);
        panel.hpBar = this.add.rectangle(barX, 30, 200, 20, 0xffcc00).setOrigin(originX, 0.5);

        panel.hpText = this.add.text(
            isLeft ? barX + 100 : width - 210, 30, '100 / 100', {
            fontFamily: 'Impact, sans-serif', fontSize: '14px', fill: '#000000'
        }).setOrigin(0.5);

        // Ammo readout
        panel.ammoText = this.add.text(barX, 60, '30 / 30', this.ammoStyle)
            .setOrigin(originX, 0.5);

        // Reload progress bar, hidden until reloading
        panel.reloadBar = this.add.rectangle(barX, 80, 0, 6, 0xffcc00)
            .setOrigin(originX, 0.5).setVisible(false);

        // Compact badge for the currently selected throwable
        const throwableIconX = isLeft ? barX + 130 : width - 240;
        panel.throwableBadge = this.add.circle(throwableIconX, 60, 12, 0x88ff9b)
            .setStrokeStyle(1, 0xffffff, 0.85);
        panel.throwableGlyph = this.add.text(throwableIconX, 60, 'G', {
            fontFamily: 'Impact, sans-serif', fontSize: '14px', fill: '#1c1c22'
        }).setOrigin(0.5);

        panel.grenadeText = this.add.text(
            isLeft ? barX + 155 : width - 265, 60, 'x 3', this.countStyle)
            .setOrigin(isLeft ? 0 : 1, 0.5);

        // Downed indicator
        panel.downText = this.add.text(avatarX, 120, 'DOWN', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '18px', fill: '#ff4444',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setVisible(false);

        if (isLeft) this.panel1 = panel;
        else this.panel2 = panel;
    }

    // ============================================================
    // CENTRE PANEL
    // ============================================================
    buildCentrePanel(width) {
        // No backing card — the wave/timer/threat/crate text sits
        // directly over the gameplay, same as the player panels.
        this.add.text(width / 2 - 152, 40, '⛩', {
            fontSize: '22px', fill: '#ff3b3b'
        }).setOrigin(0.5);

        this.waveText = this.add.text(width / 2 - 10, 40, 'WAVE 1', this.uiTextStyle)
            .setOrigin(1, 0.5);

        this.timerText = this.add.text(width / 2 + 10, 40, '0:00', this.timerStyle)
            .setOrigin(0, 0.5);

        // Qualitative threat readout
        this.enemyText = this.add.text(width / 2, 76, 'ENEMIES: 0', {
            ...this.uiTextStyle, fontSize: '22px', fill: '#ff9966'
        }).setOrigin(0.5);

        this.crateText = this.add.text(width / 2, 104, 'CRATES: 3', {
            ...this.uiTextStyle, fontSize: '20px', fill: '#88ff88'
        }).setOrigin(0.5);

        // Wave progress bar
        this.add.rectangle(width / 2, 124, 240, 6, 0x000000).setAlpha(0.7);
        this.waveBar = this.add.rectangle(width / 2 - 120, 124, 240, 6, 0xff9966)
            .setOrigin(0, 0.5);

        // ============================================================
        // OLD CODE REPLACED / REMOVED BELOW:
        // Shared top-right coin counter and target text removed in favor of per-player coin panels
        // ============================================================
        // // Coin counter, top right — target for flying coins
        // this.add.circle(width - 175, 40, 17, 0xffcc00).setStrokeStyle(2, 0x8a6a00);
        // this.add.text(width - 175, 40, '$', {
        //     ...this.uiTextStyle, fontSize: '20px', fill: '#8a6a00'
        // }).setOrigin(0.5);
        //
        // this.runCoinText = this.add.text(width - 150, 40, '0', {
        //     ...this.uiTextStyle, fontSize: '30px', fill: '#ffcc00'
        // }).setOrigin(0, 0.5);
    }

    buildBossBar(width) {
        const h = this.cameras.main.height;

        this.bossGroup = this.add.container(0, 0).setVisible(false);

        const namePlate = this.add.rectangle(width / 2, h - 74, 220, 32, 0x0a0a0e, 0.5)
            .setStrokeStyle(1, 0xffcc00, 0.5);

        const bg = this.add.rectangle(width / 2, h - 46, 620, 22, 0x000000).setAlpha(0.8);

        this.bossBar = this.add.rectangle(width / 2 - 310, h - 46, 620, 22, 0xcc2222)
            .setOrigin(0, 0.5);

        // Gold frame around the health track, matching the menus' accent.
        const frame = this.add.graphics();
        frame.lineStyle(2, 0xffcc00, 0.85);
        frame.strokeRoundedRect(width / 2 - 312, h - 58, 624, 24, 6);

        this.bossName = this.add.text(width / 2, h - 74, 'BOSS', {
            fontFamily: 'Impact, sans-serif', fontSize: '24px',
            fill: '#ffffff', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5);

        this.bossGroup.add([namePlate, bg, this.bossBar, frame, this.bossName]);
    }

    // New: small row of 3 icons showing how many Shop-bought supplies
    // (Ammo/Grenade/Health) are left, with their keybinds — only shown
    // during the boss fight, since that's the only time they're usable.
    buildSupplyHud(width) {
        const h = this.cameras.main.height;

        this.supplyGroup = this.add.container(0, 0).setVisible(false);

        const items = [
            { key: '1', icon: '🔫', code: 'AMMO',    kind: 'ammo',    accent: 0xffcc00 },
            { key: '2', icon: '💣', code: 'GRENADE', kind: 'grenade', accent: 0xff3b3b },
            { key: '3', icon: '❤',  code: 'HEALTH',  kind: 'health',  accent: 0x8cff9b }
        ];

        const startX = width / 2 - 110;
        const y = h - 100;

        this.supplyTexts = {};

        items.forEach((item, i) => {
            const x = startX + i * 110;
            const accentHex = '#' + item.accent.toString(16).padStart(6, '0');

            const bg = this.add.graphics();
            bg.fillStyle(COLOR.panelBg, 0.6);
            bg.fillRoundedRect(x - 48, y - 20, 96, 40, RADIUS.sm);
            bg.lineStyle(1, item.accent, 0.65);
            bg.strokeRoundedRect(x - 48, y - 20, 96, 40, RADIUS.sm);

            const label = this.add.text(x - 34, y, item.icon, {
                fontSize: '20px'
            }).setOrigin(0.5);

            const keyHint = this.add.text(x - 12, y - 12, '[' + item.key + ']', {
                fontSize: '10px', fill: '#9bb1cb'
            }).setOrigin(0.5);

            const countText = this.add.text(x + 18, y, '0', {
                fontFamily: 'Impact, sans-serif',
                fontSize: '22px', fill: accentHex,
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5);

            this.supplyTexts[item.code] = countText;
            this.supplyGroup.add([bg, label, keyHint, countText]);

            // New: these were keyboard-only (1/2/3) — the whole chip is
            // now clickable/tappable too, calling the exact same
            // useBossSupply() on the Game scene that the keybind uses,
            // so buying/using stays wired through the one real path.
            bg.setInteractive(
                new Phaser.Geom.Rectangle(x - 48, y - 20, 96, 40),
                Phaser.Geom.Rectangle.Contains
            );
            bg.on('pointerover', () => bg.setAlpha(0.8));
            bg.on('pointerout', () => bg.setAlpha(1));
            bg.on('pointerdown', () => {
                if (this.gameScene && this.gameScene.useBossSupply) {
                    this.gameScene.useBossSupply(item.code, item.kind);
                }
            });
        });
    }

    updateSupplyHud(supplies) {
        if (!supplies || !this.supplyTexts) return;
        Object.keys(this.supplyTexts).forEach(code => {
            this.supplyTexts[code].setText(String(supplies[code] || 0));
        });
    }

    // ============================================================
    // EVENTS
    // ============================================================
    wireEvents() {
        const g = this.gameScene;
        if (!g) return;

        g.events.on('playerHealthChanged', (player) => {
            const panel = (player === this.p1) ? this.panel1 : this.panel2;
            if (!panel) return;

            this.tweens.add({
                targets: panel.hpBar,
                width: (player.hp / player.maxHp) * 200,
                duration: 200,
                ease: 'Power2'
            });
        });

        g.events.on('waveStarted', (n) => {
            this.waveElapsedMs = 0;
            this.currentWave = n;
            this.waveText.setText('WAVE ' + n);

            this.tweens.add({
                targets: this.waveText,
                scale: 1.25, duration: 220, yoyo: true
            });
        });

        g.events.on('bossSpawned', (boss) => {
            this.boss = boss;
            this.bossName.setText(boss.bossName || 'BOSS');
            this.bossGroup.setVisible(true).setAlpha(0);
            this.tweens.add({ targets: this.bossGroup, alpha: 1, duration: 500 });

            this.supplyGroup.setVisible(true).setAlpha(0);
            this.tweens.add({ targets: this.supplyGroup, alpha: 1, duration: 500 });
        });

        // New: the supply counts just loaded (boss spawn) or one was
        // just used (key 1/2/3) — refresh the HUD numbers.
        g.events.on('bossSuppliesReady', (supplies) => {
            this.updateSupplyHud(supplies);
        });

        g.events.on('runCleared', () => {
            this.showBanner('ALL WAVES CLEARED', '#ffcc00');
            this.supplyGroup.setVisible(false);
        });

        g.events.on('soloDeath', () => {
            this.supplyGroup.setVisible(false);
        });

        // ============================================================
        // OLD CODE REPLACED / REMOVED BELOW:
        // Global coinsChanged listener updated since coins are now displayed per-player panel
        // ============================================================
        // g.events.on('coinsChanged', (total) => {
        //     this.runCoinText.setText(String(total));
        // });

        g.events.on('coinLanded', () => {
            // ============================================================
            // OLD CODE REPLACED BELOW:
            // Tweened single top-right runCoinText
            // ============================================================
            // this.tweens.add({
            //     targets: this.runCoinText,
            //     scale: 1.3, duration: 110, yoyo: true
            // });

            // ============================================================
            // NEW CODE: Pulse per-player coin text when a coin lands
            // ============================================================
            const targetPanel = this.panel1;
            if (targetPanel && targetPanel.coinText) {
                this.tweens.add({
                    targets: targetPanel.coinText,
                    scale: 1.3, duration: 110, yoyo: true
                });
            }
        });
    }

    showBanner(text, color) {
        const t = this.add.text(this.cameras.main.width / 2, 180, text, {
            fontFamily: 'Impact, sans-serif',
            fontSize: '38px', fill: color,
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(150).setAlpha(0);

        this.tweens.add({ targets: t, alpha: 1, duration: 300 });
        this.tweens.add({
            targets: t, alpha: 0, delay: 1800, duration: 500,
            onComplete: () => t.destroy()
        });
    }

    // ============================================================
    // MAIN LOOP
    // ============================================================
    update(time, delta) {
        this.updatePlayer(this.p1, this.panel1);
        if (this.p2) this.updatePlayer(this.p2, this.panel2);
        this.updateCentre(time, delta);
        this.updateBoss();
    }

    updateCentre(time, delta) {
        // Accumulate our own clock so it always starts at zero
        this.elapsedMs += delta;
        this.waveElapsedMs += delta;

        const elapsed = Math.floor(this.elapsedMs / 1000);
        this.timerText.setText(
            Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0')
        );

        const wm = this.gameScene && this.gameScene.waveManager;

        if (wm) {
            // Threat bar instead of an exact count
            const progress = wm.waveProgress ? wm.waveProgress() : 0;
            this.waveBar.width = 240 * progress;

            // Qualitative threat readout
            const alive = wm.aliveCount ? wm.aliveCount() : 0;
            let threat = 'CLEAR';
            let color  = '#88ff9b';

            if (alive > 10)      { threat = 'OVERRUN';  color = '#ff4444'; }
            else if (alive > 6)  { threat = 'HEAVY';    color = '#ff7744'; }
            else if (alive > 3)  { threat = 'ENGAGED';  color = '#ff9966'; }
            else if (alive > 0)  { threat = 'MOPPING UP'; color = '#ffcc66'; }

            this.enemyText.setText(threat);
            this.enemyText.setFill(color);
        }

        const crates = this.findCrates();
        if (crates !== null) {
            this.crateText.setText('CRATES: ' + crates);
            this.crateText.setFill(crates === 0 ? '#ff4444' : crates === 1 ? '#ffcc00' : '#88ff88');
        }
    }

    updatePlayer(player, panel) {
        if (!player || !panel) return;

        // ---- Coins ----
        // ============================================================
        // NEW CODE: Live update of individual per-player coin totals on their panel
        // ============================================================
        panel.coinText.setText('$' + (player.coinsEarned || 0));

        // ---- Health ----
        const ratio = Math.max(0, player.hp / player.maxHp);
        panel.hpBar.width = 200 * ratio;
        panel.hpBar.setFillStyle(
            ratio > 0.6 ? 0x8cff9b : ratio > 0.3 ? 0xffcc00 : 0xff4444
        );
        panel.hpText.setText(Math.ceil(player.hp) + ' / ' + player.maxHp);

        // ---- Ammo ----
        const reserve = player.reserveAmmo || 0;

        if (player.isReloading) {
            panel.ammoText.setText('RELOADING  [' + reserve + ']').setFill('#ff4444');
        } else if (player.bullets === 0 && reserve === 0) {
            panel.ammoText.setText('NO AMMO').setFill('#ff4444');
        } else {
            const low = reserve <= 40;
            panel.ammoText.setText(player.bullets + '  |  ' + reserve);
            panel.ammoText.setFill(low ? '#ffcc00' : '#ffffff');
        }

        // ---- Reload bar ----
        if (player.reloadTimer && player.reloadTimer.getProgress) {
            const p = player.reloadTimer.getProgress();
            panel.reloadBar.setVisible(true);
            panel.reloadBar.width = 200 * p;
            panel.reloadBar.setFillStyle(player.isReloading ? 0xff4444 : 0xffcc00);
        } else {
            panel.reloadBar.setVisible(false);
        }

        // ---- Selected throwable ----
        const item = player.throwables[player.currentThrowableIndex] || 'grenade';
        const count = player.inventory[item] || 0;
        const itemStyles = {
            grenade: { glyph: 'G', color: 0x88ff9b },
            molotov: { glyph: 'M', color: 0xff9c42 },
            landmine: { glyph: 'L', color: 0x9ba5aa }
        };
        const itemStyle = itemStyles[item] || itemStyles.grenade;
        panel.grenadeText.setText(item.toUpperCase() + ' x ' + count);
        panel.grenadeText.setFill(count === 0 ? '#777777' : '#ffffff');
        panel.throwableBadge.setFillStyle(itemStyle.color, count === 0 ? 0.35 : 1);
        panel.throwableGlyph.setText(itemStyle.glyph).setAlpha(count === 0 ? 0.35 : 1);

        // ---- Downed ----
        if (player.isDead) {
            panel.downText.setVisible(true);
            panel.avatar.setTint(0x555555);

            if (player.needsRevive && player.reviveProgress > 0) {
                const pct = Math.round((player.reviveProgress / 3000) * 100);
                panel.downText.setText('REVIVING ' + pct + '%').setFill('#88ff9b');
            } else {
                panel.downText.setText('DOWN').setFill('#ff4444');
            }
        } else {
            panel.downText.setVisible(false);
            panel.avatar.clearTint();
        }
    }

    findCrates() {
        const g = this.gameScene;
        if (!g) return null;

        const list = g.supplyCrates || g.crates || g.crateList;
        if (!list) return null;

        const arr = list.getChildren ? list.getChildren() : list;
        return arr.filter(c => c && c.active !== false && !c.isExploded).length;
    }

    updateBoss() {
        if (!this.boss || !this.bossGroup.visible) return;

        if (this.boss.isDead) {
            this.bossGroup.setVisible(false);
            this.boss = null;
            return;
        }

        const max = this.boss.maxHp || this.boss.health || 1;
        const cur = this.boss.hp !== undefined ? this.boss.hp : this.boss.health;

        this.bossBar.width = 620 * Phaser.Math.Clamp(cur / max, 0, 1);
    }
}