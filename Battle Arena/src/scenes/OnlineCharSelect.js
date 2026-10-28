import Phaser from 'phaser';
import net from '../net/NetClient';
import api from '../api/api';

export default class OnlineCharSelect extends Phaser.Scene
{
    constructor() {
        super('OnlineCharSelect');
    }

    init(data)
    {
        this.seed = data.seed || 0;
        this.mode = data.mode || 'coop';
        this.selectedMap = data.selectedMap || 'arena1';

        this.characters = [];
        this.myPick     = null;
        this.theirPick  = null;
        this.myHover    = null;
        this.theirHover = null;
        this.locked     = false;
        this.theirLocked = false;
        this.myItem = null;
        this.theirItem = null;
        this.pvpItemSelectionStarted = false;
    }

    create()
    {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.add.image(w / 2, h / 2, 'charSelectBg')
            .setDisplaySize(w, h).setDepth(-1);

        this.impact = { fontFamily: 'Impact, sans-serif' };

        this.loadingText = this.add.text(w / 2, h / 2, 'Loading characters...', {
            fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(50);

        this.wireNetwork();
        this.loadCharacters();
    }

    async loadCharacters()
    {
        try {
            const data = await api.getCharacters();

            this.characters = data.map(c => ({
                id: c.code,
                name: c.name,
                icon: c.icon,
                largeImg: c.largeImg,
                locked: c.locked || !c.playable,
                ability: c.ability
            }));

            while (this.characters.length < 8) {
                this.characters.push({
                    id: 'locked' + this.characters.length,
                    name: 'LOCKED', icon: null, largeImg: null,
                    locked: true, ability: ''
                });
            }

            this.loadingText.destroy();
            this.buildUI();

        } catch (err) {
            this.loadingText.setText('Could not load characters\n' + err.message)
                .setAlign('center').setColor('#ff7b7b');
        }
    }

    buildUI()
    {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        const players = net.players || [];
        const myName    = net.username;
        const theirName = (players.find(p => p.username !== myName) || {}).username || 'Player 2';

        // ---- Left panel: me ----
        this.myLargeImg = this.add.image(w * 0.17, h * 0.55, 'heroBg_1').setAlpha(0);

        this.myTitle = this.add.text(w * 0.17, h * 0.10, myName + '\nSELECT CHARACTER', {
            ...this.impact, fontSize: '28px', color: '#ff6644',
            align: 'center', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(10);

        this.myAbility = this.add.text(w * 0.17, h * 0.86, '', {
            ...this.impact, fontSize: '22px', color: '#ffcc00',
            align: 'center', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        // ---- Right panel: them ----
        this.theirLargeImg = this.add.image(w * 0.83, h * 0.55, 'heroBg_2')
            .setAlpha(0).setFlipX(true);

        this.theirTitle = this.add.text(w * 0.83, h * 0.10, theirName + '\nCHOOSING...', {
            ...this.impact, fontSize: '28px', color: '#4488ff',
            align: 'center', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(10);

        this.theirAbility = this.add.text(w * 0.83, h * 0.86, '', {
            ...this.impact, fontSize: '22px', color: '#ffcc00',
            align: 'center', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        this.buildGrid(w, h);

        this.statusText = this.add.text(w / 2, h * 0.92, '', {
            ...this.impact, fontSize: '22px', color: '#ffffff',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(20);

        // Chat: no local instance here — ChatOverlayScene already launched
        // a persistent one back in LobbyScene (net.connect), and it stays
        // alive across Lobby → this screen → Game without re-launching.
        // Building a second ChatPanel here used to spawn a duplicate
        // floating widget on top of that one.

        this.refreshStatus();
    }

    buildGrid(w, h)
    {
        const cols = 4;
        const spacing = 110;
        const startX = (w / 2) - (spacing * 1.5);
        const startY = h * 0.30;

        this.slots = [];

        this.characters.forEach((char, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * spacing;
            const y = startY + row * spacing;

            const circle = this.add.circle(x, y, 45, char.locked ? 0x222222 : 0x444444)
                .setInteractive({ cursor: char.locked ? 'default' : 'pointer' });

            if (char.icon && this.textures.exists(char.icon)) {
                this.add.image(x, y, char.icon).setDisplaySize(80, 80);
            } else {
                this.add.text(x, y, '?', {
                    fontSize: '38px', color: '#555', fontStyle: 'bold'
                }).setOrigin(0.5);
            }

            // Marker showing who is hovering or locked here
            const myMark = this.add.circle(x - 30, y + 46, 8, 0xff6644).setAlpha(0);
            const theirMark = this.add.circle(x + 30, y + 46, 8, 0x4488ff).setAlpha(0);

            circle.on('pointerover', () => {
                if (char.locked || this.locked) return;
                this.setMyHover(index);
            });

            circle.on('pointerdown', () => {
                if (char.locked || this.locked) return;
                this.lockIn(index);
            });

            this.slots.push({ circle, myMark, theirMark, char, index });
        });
    }

    // ============================================================
    // SELECTION
    // ============================================================
    setMyHover(index)
    {
        this.myHover = index;
        const char = this.characters[index];

        this.myLargeImg.setTexture(char.largeImg).setAlpha(1);
        this.myTitle.setText(net.username + '\n' + char.name);
        this.myAbility.setText(char.ability).setAlpha(1);

        this.refreshMarks();

        net.sendEvent('charHover', { index });
    }

    lockIn(index)
    {
        this.locked = true;
        this.myPick = index;

        const char = this.characters[index];

        this.myTitle.setText(net.username + '\n' + char.name + '  \u2713');
        this.myTitle.setColor('#8cff9b');

        this.refreshMarks();
        this.refreshStatus();

        net.sendEvent('charLock', { index });

        this.cameras.main.flash(180, 255, 200, 120);
        this.tryStart();
    }

    refreshMarks()
    {
        this.slots.forEach((s, i) => {
            const mineHere  = (this.locked ? this.myPick : this.myHover) === i;
            const theirsHere = (this.theirLocked ? this.theirPick : this.theirHover) === i;

            s.myMark.setAlpha(mineHere ? 1 : 0);
            s.theirMark.setAlpha(theirsHere ? 1 : 0);

            // Solid ring when locked, thin when hovering
            if (mineHere && this.locked)        s.circle.setStrokeStyle(5, 0xff6644);
            else if (theirsHere && this.theirLocked) s.circle.setStrokeStyle(5, 0x4488ff);
            else if (mineHere)                  s.circle.setStrokeStyle(3, 0xff6644, 0.7);
            else if (theirsHere)                s.circle.setStrokeStyle(3, 0x4488ff, 0.7);
            else                                s.circle.setStrokeStyle(0);
        });
    }

    refreshStatus()
    {
        if (this.mode === 'pvp' && this.pvpItemSelectionStarted) {
            this.refreshPvpItemStatus();
            return;
        }

        if (this.locked && this.theirLocked) {
            this.statusText.setText('BOTH READY \u2014 STARTING').setColor('#8cff9b');
        } else if (this.locked) {
            this.statusText.setText('Waiting for the other player...').setColor('#ffcc00');
        } else {
            this.statusText.setText('Click a character to lock in').setColor('#ffffff');
        }
    }

    tryStart()
    {
        if (this.mode === 'pvp') {
            if (!this.locked || !this.theirLocked) return;
            if (!this.pvpItemSelectionStarted) this.beginPvpItemSelection();
            if (!this.myItem || !this.theirItem || this.starting) return;

            this.starting = true;
            this.time.delayedCall(700, () => {
                const otherPlayer = net.otherPlayer();
                const selections = {
                    [net.username]: {
                        character: this.characters[this.myPick].id,
                        startingItem: this.myItem
                    },
                    [otherPlayer.username]: {
                        character: this.characters[this.theirPick].id,
                        startingItem: this.theirItem
                    }
                };
                const roster = net.players.slice(0, 2).map((player, index) => ({
                    ...player,
                    team: index === 0 ? 'red' : 'blue'
                }));

                this.sound.stopAll();
                this.scene.start('TDMScene', {
                    isHost: net.isHost,
                    myUsername: net.username,
                    roster,
                    selections,
                    selectedMap: this.selectedMap
                });
            });
            return;
        }

        if (!this.locked || !this.theirLocked) return;
        if (this.starting) return;

        this.starting = true;

        this.time.delayedCall(900, () => {
            const mine   = this.characters[this.myPick].id;
            const theirs = this.characters[this.theirPick].id;

            // Host is always player 1
            const p1 = net.isHost ? mine : theirs;
            const p2 = net.isHost ? theirs : mine;

            this.sound.stopAll();

            this.scene.start('Game', {
                map: 'arena1',
                online: true,
                isHost: net.isHost,
                seed: this.seed,
                p1Character: p1 === 'hero2' ? 'hero2' : 'hero',
                p2Character: p2 === 'hero2' ? 'hero2' : 'hero'
            });
        });
    }

    beginPvpItemSelection()
    {
        this.pvpItemSelectionStarted = true;
        this.slots.forEach(slot => slot.circle.disableInteractive());
        this.myTitle.setText(net.username + '\nSELECT STARTING ITEM');
        this.theirTitle.setText((net.otherPlayer() || {}).username + '\nSELECTING ITEM');

        const items = [
            { id: 'grenade', label: 'GRENADE', color: 0xffcc44 },
            { id: 'molotov', label: 'MOLOTOV', color: 0xff6644 },
            { id: 'landmine', label: 'LANDMINE', color: 0x76d7ff }
        ];
        const w = this.cameras.main.width;
        const y = this.cameras.main.height * 0.73;
        this.pvpItemButtons = items.map((item, index) => {
            const x = w / 2 + (index - 1) * 190;
            const button = this.add.rectangle(x, y, 150, 112, 0x101116, 0.92)
                .setStrokeStyle(2, item.color, 0.9)
                .setInteractive({ cursor: 'pointer' });
            this.add.image(x, y - 18, item.id).setDisplaySize(48, 48);
            this.add.text(x, y + 30, item.label, {
                ...this.impact, fontSize: '16px', color: '#ffffff'
            }).setOrigin(0.5);
            button.on('pointerdown', () => this.lockPvpItem(item.id));
            return { button, item };
        });
        this.refreshStatus();
    }

    lockPvpItem(item)
    {
        if (this.myItem) return;
        this.myItem = item;
        this.myTitle.setText(net.username + '\n' + item.toUpperCase() + ' LOCKED');
        this.myTitle.setColor('#8cff9b');
        this.pvpItemButtons.forEach(({ button, item: option }) => {
            if (option.id !== item) button.disableInteractive().setAlpha(0.45);
        });
        net.sendEvent('pvpItemLock', { item });
        this.refreshStatus();
        this.tryStart();
    }

    refreshPvpItemStatus()
    {
        if (!this.statusText) return;
        if (this.myItem && this.theirItem) {
            this.statusText.setText('BOTH ITEMS LOCKED - STARTING').setColor('#8cff9b');
        } else if (this.myItem) {
            this.statusText.setText('Waiting for the other player to choose an item...').setColor('#ffcc00');
        } else {
            this.statusText.setText('Choose your starting item').setColor('#ffffff');
        }
    }

    // ============================================================
    // NETWORK
    // ============================================================
    wireNetwork()
    {
        this.onEvent = (msg) => {
            if (!this.slots) return;

            if (msg.name === 'charHover') {
                this.theirHover = msg.data.index;

                const char = this.characters[msg.data.index];
                if (char && !this.theirLocked) {
                    this.theirLargeImg.setTexture(char.largeImg).setAlpha(1);
                    this.theirTitle.setText(
                        (net.otherPlayer() || {}).username + '\n' + char.name);
                    this.theirAbility.setText(char.ability).setAlpha(1);
                }

                this.refreshMarks();
            }

            if (msg.name === 'charLock') {
                this.theirLocked = true;
                this.theirPick = msg.data.index;

                const char = this.characters[msg.data.index];
                this.theirTitle.setText(
                    (net.otherPlayer() || {}).username + '\n' + char.name + '  \u2713');
                this.theirTitle.setColor('#8cff9b');

                this.refreshMarks();
                this.refreshStatus();
                this.tryStart();
            }

            if (msg.name === 'pvpItemLock' && this.mode === 'pvp') {
                const allowedItems = ['grenade', 'molotov', 'landmine'];
                if (!allowedItems.includes(msg.data.item)) return;
                this.theirItem = msg.data.item;
                this.theirTitle.setText((net.otherPlayer() || {}).username + '\n' + this.theirItem.toUpperCase() + ' LOCKED');
                this.theirTitle.setColor('#8cff9b');
                this.refreshStatus();
                this.tryStart();
            }
        };

        net.on('event', this.onEvent);

        this.events.once('shutdown', () => {
            net.off('event', this.onEvent);
        });
    }
}