import Phaser from 'phaser';


export default class TitleScreen extends Phaser.Scene {
    constructor() {
        super('TitleScreen');
    }


    create() {
        this.cameras.main.setBackgroundColor('#000000');

        this.titlepage1 = this.add.image(0, 0, 'titlepage1')
            .setOrigin(0.5, 0.5)
            .setAlpha(1)
            .setDepth(1)
            .setScale(0.55);

        this.titlepage2 = this.add.image(0, 0, 'titlepage2')
            .setOrigin(0.5, 0.5)
            .setAlpha(0)
            .setScale(0.4)
            .setDepth(2);

        this.blackScreen = this.add.rectangle(0, 0, 1, 1, 0x000000, 0)
            .setOrigin(0.5, 0.5)
            .setDepth(10);

        this.pressText = this.add.text(0, 0, 'PRESS ANY KEY TO ENTER', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '28px',
            fill: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 5,
            letterSpacing: 1,
            shadow: { offsetX: 0, offsetY: 0, color: '#ff3b3b', blur: 14, fill: true }
        }).setOrigin(0.5, 0.5).setAlpha(0).setDepth(3);

        this.titlepage2.setInteractive({ useHandCursor: true });
        this.menuShown = false;

        this.positionTitleArt();
        this.scale.on('resize', this.positionTitleArt, this);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.positionTitleArt, this);
        });

        this.showIntroSequence();

        this.input.keyboard.once('keydown', () => {
            this.goToMenu();
        });

        this.titlepage2.once('pointerdown', () => {
            this.goToMenu();
        });
    }

    showIntroSequence() {
        this.time.delayedCall(5000, () => {
            this.tweens.add({
                targets: this.titlepage1,
                alpha: 0,
                duration: 500,
                ease: 'Linear'
            });

            this.tweens.add({
                targets: this.blackScreen,
                alpha: 1,
                duration: 250,
                ease: 'Linear'
            });

            this.time.delayedCall(250, () => {
                this.titlepage2.setAlpha(1);
                this.titlepage2.setScale(0.6);

                this.tweens.add({
                    targets: this.titlepage2,
                    scale: 0.75,
                    duration: 420,
                    ease: 'Cubic.Out',
                    onComplete: () => {
                        this.titlepage2.setScale(0.6);
                    }
                });

                this.tweens.add({
                    targets: this.blackScreen,
                    alpha: 0,
                    duration: 250,
                    ease: 'Linear'
                });

                this.tweens.add({
                    targets: this.pressText,
                    alpha: { from: 0, to: 1 },
                    duration: 700,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.InOut'
                });
            });
        });
    }

    goToMenu() {
        if (this.menuShown) return;

        this.menuShown = true;

        this.tweens.add({
            targets: [this.titlepage1, this.titlepage2, this.pressText],
            alpha: 0,
            duration: 450,
            ease: 'Linear',
            onComplete: () => {
                this.scene.start('LoginScene');
            }
        });
    }

    positionTitleArt() {
        const camera = this.cameras?.main;

        if (!camera || !this.titlepage1 || !this.titlepage2 || !this.blackScreen || !this.pressText) {
            return;
        }

        const width = camera.width;
        const height = camera.height;

        this.titlepage1.setPosition(width / 2, height / 2);
        this.titlepage2.setPosition(width / 2, height / 2);
        this.blackScreen.setPosition(width / 2, height / 2);
        this.blackScreen.setSize(width, height);
        this.pressText.setPosition(width / 2, height * 0.9);

        this.titlepage2.setDisplaySize(width, height);
    }
}