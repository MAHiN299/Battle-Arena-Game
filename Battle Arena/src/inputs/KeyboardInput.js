import Phaser from 'phaser';

export default class KeyboardInput {
    constructor(scene) {
        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
            attack: Phaser.Input.Keyboard.KeyCodes.J, 
            throw: Phaser.Input.Keyboard.KeyCodes.G,
            shoot: Phaser.Input.Keyboard.KeyCodes.K,
            revive: Phaser.Input.Keyboard.KeyCodes.F,
            interact: Phaser.Input.Keyboard.KeyCodes.E
        });

        // Retained for direct reference if needed elsewhere
        this.keyE = this.keys.interact;
    }

    getInputs() {
        return {
            up: this.keys.up.isDown,
            down: this.keys.down.isDown,
            left: this.keys.left.isDown,
            right: this.keys.right.isDown,
            jump: this.keys.jump.isDown,
            attack: this.keys.attack.isDown,
            throw: this.keys.throw.isDown,
            shoot: this.keys.shoot.isDown,
            revive: this.keys.revive.isDown,
            interact: this.keys.interact.isDown
        };
    }
}