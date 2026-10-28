export default class GamepadInput {
    constructor(scene) {
        this.scene = scene;
        this.prevAttack = false;
        this.prevThrow = false;
        this.prevRevive = false;
    }

    getInputs() {
        let inputs = { 
            left: false, 
            right: false, 
            up: false, 
            down: false, 
            jump: false, 
            attack: false, 
            throw: false, 
            shoot: false, 
            revive: false,
            interact: false 
        };

        if (!this.scene.input || !this.scene.input.gamepad) return inputs;

        const pad = this.scene.input.gamepad.pad1 || this.scene.input.gamepad.getPad(0);

        if (pad) {
            let axisXVal = 0, axisYVal = 0;
            if (pad.axes.length > 0) axisXVal = typeof pad.axes[0] === 'object' ? pad.axes[0].getValue() : pad.axes[0];
            if (pad.axes.length > 1) axisYVal = typeof pad.axes[1] === 'object' ? pad.axes[1].getValue() : pad.axes[1];

            inputs.left = pad.left || axisXVal < -0.5;
            inputs.right = pad.right || axisXVal > 0.5;
            inputs.up = pad.up || axisYVal < -0.5;
            inputs.down = pad.down || axisYVal > 0.5;

            const checkBtn = (index) => {
                return pad.buttons && pad.buttons[index] ? (pad.buttons[index].pressed || pad.buttons[index].value > 0) : false;
            };

            inputs.jump = pad.A || checkBtn(0);
            
            const currentAttack = pad.B || checkBtn(1);
            const currentShoot = pad.X || checkBtn(2);
            const currentRevive = pad.Y || checkBtn(3); 
            const currentThrow = pad.R1 || checkBtn(5); 

            inputs.shoot = currentShoot; 
            inputs.revive = currentRevive; 
            inputs.interact = pad.buttons[3] && pad.buttons[3].pressed;

            inputs.attack = currentAttack && !this.prevAttack;
            inputs.throw = currentThrow && !this.prevThrow;

            this.prevAttack = currentAttack;
            this.prevThrow = currentThrow;
        }

        return inputs;
    }
}