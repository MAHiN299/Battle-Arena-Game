import Phaser from 'phaser';

import api from '../api/api';
import { drawPanel, SPACE } from '../ui/PhaserUiKit';

export default class CharacterSelect extends Phaser.Scene {
    constructor() {
        super('CharacterSelect');
    }

    init(data) {
        this.selectedMap = data.selectedMap || 'arena1';

        this.characters = [];

        this.p1Data = {
            character: null,
            startingItem: null, // 🚀 ফিক্স: weapon এর বদলে startingItem
            isReady: false
        };

        this.p2Data = {
            character: null,
            startingItem: null, // 🚀 ফিক্স: weapon এর বদলে startingItem
            isReady: false
        };

        this.isPlayer2Joined = false;

        this.p2SelectedIndex = 0; 
        this.p2ItemIndex = 0;     // 🚀 ফিক্স: 0 = Grenade, 1 = Molotov, 2 = Landmine
        this.p2State = 'WAITING'; // 'WAITING', 'SELECTING_CHAR', 'SELECTING_ITEM', 'READY'
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.add.image(width / 2, height / 2, 'charSelectBg')
            .setDisplaySize(width, height)
            .setDepth(-1);

        this.loadingText = this.add.text(width / 2, height / 2, 'Loading characters...', {
            fontSize: '28px', fill: '#ffffff', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(50);

        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('MapSelect');
        });

        this.loadCharacters();
    }

    async loadCharacters() {
        try {
            const data = await api.getCharacters();

            // 🚀 API থেকে ডেটা আসতে দেরি হলে এবং ইউজার ব্যাক করলে যেন ক্র্যাশ না খায়
            if (!this.sys.isActive()) return;

            this.characters = data.map(c => ({
                id: c.code,
                name: c.name,
                icon: c.icon,
                largeImg: c.largeImg,
                locked: c.locked,
                owned: !c.locked,
                playable: c.playable,
                ability: c.ability
            }));

            while (this.characters.length < 8) {
                this.characters.push({
                    id: 'locked' + this.characters.length,
                    name: 'LOCKED',
                    icon: null,
                    largeImg: null,
                    locked: true,
                    owned: false,
                    playable: false,
                    ability: ''
                });
            }

            this.loadingText.destroy();
            this.buildUI();

        } catch (err) {
            this.loadingText.setText(
                'Could not load characters\n' + err.message + '\n\nPress ESC to go back'
            );
            this.loadingText.setAlign('center').setFill('#ff7b7b');
        }
    }

    buildUI() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.p1LargeImg = this.add.image(width * 0.18, height * 0.55, 'heroBg_1').setAlpha(0);
        this.p2LargeImg = this.add.image(width * 0.82, height * 0.55, 'heroBg_2').setAlpha(0).setFlipX(true);

        const PLATE_W = 320 - SPACE.sm * 2;
        drawPanel(this, width * 0.18, height * 0.1, PLATE_W, 78 - SPACE.sm * 2, 0xff3b3b, { pad: SPACE.sm });
        drawPanel(this, width * 0.82, height * 0.1, PLATE_W, 78 - SPACE.sm * 2, 0x44aaff, { pad: SPACE.sm });

        this.p1Title = this.add.text(width * 0.18, height * 0.1, 'PLAYER 1\nSELECT CHARACTER', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '30px', fill: '#ff4444', align: 'center', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(10);

        this.p2Title = this.add.text(width * 0.82, height * 0.1, 'PLAYER 2\n(Press Gamepad)', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '22px', fill: '#888888', align: 'center', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(10);

        drawPanel(this, width * 0.18, height * 0.88, PLATE_W, 54 - SPACE.sm * 2, 0xffcc00, { pad: SPACE.sm });
        drawPanel(this, width * 0.82, height * 0.88, PLATE_W, 54 - SPACE.sm * 2, 0xffcc00, { pad: SPACE.sm });

        this.p1Ability = this.add.text(width * 0.18, height * 0.88, '', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '22px', fill: '#ffcc00', align: 'center', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        this.p2Ability = this.add.text(width * 0.82, height * 0.88, '', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '22px', fill: '#ffcc00', align: 'center', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        // গ্রিড তৈরি করা
        const cols = 4;
        const spacing = 110;
        const startX = (width / 2) - (spacing * 1.5);
        const startY = height * 0.4;

        drawPanel(this, width / 2, startY + spacing * 0.5, spacing * cols + 60 - SPACE.lg * 2, spacing * 2 + 40 - SPACE.lg * 2, 0xff3b3b, { fillAlpha: 0.32 });

        this.charCircles = [];

        this.characters.forEach((char, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + (col * spacing);
            const y = startY + (row * spacing);

            const isPendingArt = char.owned && !char.playable;
            const canSelect = char.owned && char.playable;
            const circleColor = char.locked ? 0x222222
                               : isPendingArt ? 0x4a3a1a
                               : 0x444444;

            const bgCircle = this.add.circle(x, y, 45, circleColor)
                .setInteractive({ cursor: canSelect ? 'pointer' : 'default' });

            const ringColor = canSelect ? 0x8cff9b : isPendingArt ? 0xffcc44 : 0x3a3a44;
            this.add.circle(x, y, 48, 0x000000, 0).setStrokeStyle(2, ringColor, 0.75);

            this.charCircles.push(bgCircle);

            if (char.icon && this.textures.exists(char.icon)) {
                this.add.image(x, y, char.icon).setDisplaySize(80, 80);
            } else if (isPendingArt) {
                this.add.text(x, y, '\u2713', {
                    fontSize: '32px', fill: '#ffcc44', fontStyle: 'bold'
                }).setOrigin(0.5);
                this.add.text(x, y + 62, 'OWNED', {
                    fontSize: '12px', fill: '#ffcc44', fontStyle: 'bold'
                }).setOrigin(0.5);
            } else {
                this.add.text(x, y, '?', { fontSize: '40px', fill: '#555', fontStyle: 'bold' }).setOrigin(0.5);
            }

            bgCircle.on('pointerover', () => {
                if (char.locked) return;
                if (this.p1Data.character) return;

                bgCircle.setStrokeStyle(4, 0xffffff);

                if (char.largeImg && this.textures.exists(char.largeImg)) {
                    this.p1LargeImg.setTexture(char.largeImg).setAlpha(1);
                } else {
                    this.p1LargeImg.setAlpha(0);
                }
                this.p1Title.setText(`PLAYER 1\n${char.name}`);
                this.p1Ability.setText(char.ability).setAlpha(1);
            });

            bgCircle.on('pointerout', () => {
                if (char.locked) return;
                if (this.p1Data.character) return;

                // 🚀 ফিক্স: Player 2 এর কার্সর যেন Player 1 এর কারণে গায়েব না হয়
                if (this.isPlayer2Joined && this.p2SelectedIndex === index) {
                    bgCircle.setStrokeStyle(4, 0x44aaff);
                } else {
                    bgCircle.setStrokeStyle(0);
                }
            });

            bgCircle.on('pointerdown', () => {
                if (!canSelect || this.p1Data.character) {
                    if (isPendingArt) {
                        this.cameras.main.shake(60, 0.002);
                        this.p1Title.setText('OWNED\nComing soon');
                        this.time.delayedCall(1200, () => {
                            if (!this.p1Data.character) this.p1Title.setText('PLAYER 1\nSELECT CHARACTER');
                        });
                    }
                    return;
                }

                this.p1Data.character = char.id;
                this.p1Title.setText(`PLAYER 1: ${char.name}\nSELECT ITEM`); // 🚀 ফিক্স: SELECT ITEM

                this.showItemSelect(1, width * 0.18, height * 0.5);
            });
        });

        if (this.input.gamepad) {
            this.input.gamepad.on('down', (pad, button, index) => {
                if (!this.isPlayer2Joined) {
                    this.isPlayer2Joined = true;
                    this.p2State = 'SELECTING_CHAR';
                    this.p2Title.setText('PLAYER 2\nSELECT CHARACTER');
                    this.p2Title.setFill('#44aaff');

                    this.p2SelectedIndex = 0;
                    this.updateP2Selection();

                    this.p2InputDelay = this.time.now + 500;

                    console.log("Player 2 Gamepad Activated!");
                }
            });
        }
    }

    update(time, delta) {
        if (!this.characters || this.characters.length === 0) return;

        const pad = this.input.gamepad.getPad(0);
        if (!pad) return;

        let left = pad.left;
        let right = pad.right;
        let up = pad.up;
        let down = pad.down;

        try {
            if (pad.axes.length > 0 && pad.axes[0]) {
                if (pad.axes[0].getValue() < -0.5) left = true;
                if (pad.axes[0].getValue() > 0.5) right = true;
            }
            if (pad.axes.length > 1 && pad.axes[1]) {
                if (pad.axes[1].getValue() < -0.5) up = true;
                if (pad.axes[1].getValue() > 0.5) down = true;
            }
        } catch (e) { }

        const btnA = pad.A || (pad.buttons[0] && pad.buttons[0].pressed);
        const btnB = pad.B || (pad.buttons[1] && pad.buttons[1].pressed);

        const aJustPressed = btnA && !this.prevBtnA;
        const bJustPressed = btnB && !this.prevBtnB;

        this.prevBtnA = btnA;
        this.prevBtnB = btnB;

        const canMove = !this.p2InputDelay || time > this.p2InputDelay;

        // ==========================================
        // ১. ক্যারেক্টার সিলেক্ট মোড
        // ==========================================
        if (this.p2State === 'SELECTING_CHAR') {
            if (canMove) {
                let newIndex = this.p2SelectedIndex;

                if (left && newIndex % 4 !== 0) newIndex--;
                if (right && (newIndex + 1) % 4 !== 0) newIndex++;
                if (up && newIndex >= 4) newIndex -= 4;
                if (down && newIndex < 4) newIndex += 4;

                if (newIndex !== this.p2SelectedIndex) {
                    this.p2SelectedIndex = newIndex;
                    this.updateP2Selection();
                    this.p2InputDelay = time + 200;
                }
            }

            if (aJustPressed) {
                const selectedChar = this.characters[this.p2SelectedIndex];
                if (selectedChar.owned && selectedChar.playable) {
                    this.p2Data.character = selectedChar.id;
                    this.p2State = 'SELECTING_ITEM'; // 🚀 ফিক্স
                    this.p2Title.setText(`PLAYER 2: ${selectedChar.name}\nSELECT ITEM`); // 🚀 ফিক্স

                    this.showP2GamepadItemSelect(this.cameras.main.width * 0.82, this.cameras.main.height * 0.5);
                    this.p2InputDelay = time + 300;
                } else {
                    this.cameras.main.shake(100, 0.005);
                }
            }
        }
        // ==========================================
        // ২. আইটেম সিলেক্ট মোড (৩টি আইটেম)
        // ==========================================
        else if (this.p2State === 'SELECTING_ITEM') {
            if (canMove) {
                if (left && this.p2ItemIndex > 0) {
                    this.p2ItemIndex--;
                    this.updateP2ItemSelection();
                    this.p2InputDelay = time + 200;
                }
                if (right && this.p2ItemIndex < 2) {
                    this.p2ItemIndex++;
                    this.updateP2ItemSelection();
                    this.p2InputDelay = time + 200;
                }
            }

            if (aJustPressed) {
                const items = ['grenade', 'molotov', 'landmine'];
                this.p2Data.startingItem = items[this.p2ItemIndex];
                this.p2Data.isReady = true;
                this.p2State = 'READY';
                this.p2Title.setText('PLAYER 2\nREADY!');
                this.p2Title.setFill('#00ff00');

                this.closeP2Overlay();
                this.checkGameStart();
            }

            if (bJustPressed) {
                this.closeP2Overlay();
                this.p2Data.character = null;
                this.p2State = 'SELECTING_CHAR';
                this.p2Title.setText('PLAYER 2\nSELECT CHARACTER');
            }
        }
    }

    // 🚀 Player 1 এর জন্য নতুন ৩টি ট্যাকটিকাল আইটেম উইন্ডো (স্টাইল ঠিক রেখে)
    showItemSelect(playerNum, x, y) {
        // ৩টি আইটেম ধরানোর জন্য প্যানেল সাইজ একটু বাড়ানো হলো
        const panelWidth = 310;
        const panelHeight = 160 - SPACE.lg * 2;
        const panelFrame = drawPanel(this, x, y + 50, panelWidth, panelHeight, 0xff3b3b, { fillAlpha: 0.75 }).setDepth(20);
        const overlayBg = panelFrame; 

        // বাটন ও UI গ্রাফিক্স জেনারেট করার হেল্পার ফাংশন
        const createItemBtn = (offsetX, label, itemId, frameColor) => {
            const btnCenter = x + offsetX;
            
            const btn = this.add.rectangle(btnCenter, y + 50, 80, 80, 0x1c1c22, 0.001).setInteractive({ cursor: 'pointer' }).setDepth(20);
            
            const frame = this.add.graphics().setDepth(20);
            frame.fillStyle(0x1c1c22, 0.7);
            frame.fillRoundedRect(btnCenter - 40, y + 10, 80, 80, 10);
            frame.lineStyle(2, frameColor, 0.7);
            frame.strokeRoundedRect(btnCenter - 40, y + 10, 80, 80, 10);
            
            const img = this.add.image(btnCenter, y + 38, itemId).setDisplaySize(40, 40).setDepth(21);
            const txt = this.add.text(btnCenter, y + 74, label, { fontFamily: 'Impact, sans-serif', fill: '#fff', fontSize: '13px' }).setOrigin(0.5).setDepth(21);

            btn.on('pointerover', () => btn.setStrokeStyle(3, 0xffffff));
            btn.on('pointerout', () => btn.setStrokeStyle(0));
            btn.on('pointerdown', () => onItemSelected(itemId));

            return { btn, frame, txt, img };
        };

        const onItemSelected = (itemId) => {
            if (playerNum === 1) {
                this.p1Data.startingItem = itemId;
                this.p1Data.isReady = true;
                this.p1Title.setText('PLAYER 1\nREADY!');
                this.p1Title.setFill('#00ff00');
            } else {
                this.p2Data.startingItem = itemId;
                this.p2Data.isReady = true;
                this.p2Title.setText('PLAYER 2\nREADY!');
                this.p2Title.setFill('#00ff00');
            }

            overlayBg.destroy();
            b1.btn.destroy(); b1.frame.destroy(); b1.txt.destroy(); b1.img.destroy();
            b2.btn.destroy(); b2.frame.destroy(); b2.txt.destroy(); b2.img.destroy();
            b3.btn.destroy(); b3.frame.destroy(); b3.txt.destroy(); b3.img.destroy();

            this.checkGameStart();
        };

        const b1 = createItemBtn(-90, 'GRENADE', 'grenade', 0xffcc00);
        const b2 = createItemBtn(0, 'MOLOTOV', 'molotov', 0xff3b3b);
        const b3 = createItemBtn(90, 'MINE', 'landmine', 0x44aaff);
    }

    checkGameStart() {
        const isP2Done = !this.isPlayer2Joined || this.p2Data.isReady;

        if (this.p1Data.isReady && isP2Done) {
            this.time.delayedCall(1000, () => {
                this.scene.start('Game', {
                    map: this.selectedMap,
                    player1: this.p1Data,
                    player2: this.isPlayer2Joined ? this.p2Data : null
                });
            });
        }
    }

    updateP2Selection() {
        this.charCircles.forEach((circle) => {
            if (circle.isStroked && circle.strokeColor === 0x44aaff) {
                circle.setStrokeStyle(0);
            }
        });

        const targetCircle = this.charCircles[this.p2SelectedIndex];
        targetCircle.setStrokeStyle(4, 0x44aaff);

        const charData = this.characters[this.p2SelectedIndex];
        if (charData.owned && charData.playable) {
            if (charData.largeImg && this.textures.exists(charData.largeImg)) {
                this.p2LargeImg.setTexture(charData.largeImg).setAlpha(1);
            } else {
                this.p2LargeImg.setAlpha(0);
            }
            this.p2Ability.setText(charData.ability).setAlpha(1);
        } else {
            this.p2LargeImg.setAlpha(0);
            this.p2Ability.setAlpha(0);
        }
    }

    // 🚀 Player 2 এর জন্য নতুন ৩টি ট্যাকটিকাল আইটেম গেমপ্যাড উইন্ডো
    showP2GamepadItemSelect(x, y) {
        this.p2OverlayElements = [];

        const panelWidth = 310;
        const panelHeight = 160 - SPACE.lg * 2;
        const overlayBg = drawPanel(this, x, y + 50, panelWidth, panelHeight, 0x44aaff, { fillAlpha: 0.75 }).setDepth(20);
        this.p2OverlayElements.push(overlayBg);

        const createGamepadBtn = (offsetX, label, itemId, frameColor) => {
            const btnCenter = x + offsetX;
            
            // Background & border
            const btn = this.add.rectangle(btnCenter, y + 50, 80, 80, 0x1c1c22, 0.7)
                .setStrokeStyle(2, frameColor, 0.7).setDepth(20);
            
            const img = this.add.image(btnCenter, y + 38, itemId).setDisplaySize(40, 40).setDepth(21);
            const txt = this.add.text(btnCenter, y + 74, label, { fontFamily: 'Impact, sans-serif', fill: '#fff', fontSize: '13px' }).setOrigin(0.5).setDepth(21);

            this.p2OverlayElements.push(btn, img, txt);
            return btn;
        };

        this.p2ItemBtns = [
            createGamepadBtn(-90, 'GRENADE', 'grenade', 0xffcc00),
            createGamepadBtn(0, 'MOLOTOV', 'molotov', 0xff3b3b),
            createGamepadBtn(90, 'MINE', 'landmine', 0x44aaff)
        ];

        this.p2ItemIndex = 0;
        this.updateP2ItemSelection();
    }

    // 🚀 গেমপ্যাডের বর্ডার আপডেট
    updateP2ItemSelection() {
        const colors = [0xffcc00, 0xff3b3b, 0x44aaff];
        
        this.p2ItemBtns.forEach((btn, index) => {
            btn.setStrokeStyle(2, colors[index], 0.7);
        });

        // যেটা সিলেক্টেড সেটাতে উজ্জ্বল সাদা বর্ডার
        this.p2ItemBtns[this.p2ItemIndex].setStrokeStyle(4, 0xffffff);
    }

    closeP2Overlay() {
        if (this.p2OverlayElements) {
            this.p2OverlayElements.forEach(el => el.destroy());
        }
    }
}