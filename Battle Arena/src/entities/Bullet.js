import Phaser from 'phaser';

export default class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, direction) {
        // 🚀 যদি 'bullet' নামের ছবি না থাকে, তবে কোড দিয়ে একটি হলুদ লেজার বানিয়ে নেবে!
        if (!scene.textures.exists('bullet')) {
            const graphics = scene.add.graphics();
            graphics.fillStyle(0xffcc00, 0); // উজ্জ্বল হলুদ রঙ
            graphics.fillRect(0, 0, 10, 2); // ১০ পিক্সেল লম্বা, ২ পিক্সেল চওড়া
            graphics.generateTexture('bullet', 10, 2);
            graphics.destroy();
        }

        super(scene, x, y, 'bullet'); 
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(10); // বুলেট সবসময় উপরে থাকবে

        this.body.setAllowGravity(false); // বুলেট সোজা যাবে
        
        const speed = 2000; // 🚀 বুলেটের স্পিড (প্রয়োজনে কমাতে/বাড়াতে পারেন)

        if (direction === 'right') {
            this.setVelocityX(speed);
        } else if (direction === 'left') {
            this.setVelocityX(-speed);
        } else if (direction === 'up') {
            this.setVelocityY(-speed);
            this.setAngle(-90);
        } else if (direction === 'down') {
            this.setVelocityY(speed);
            this.setAngle(90);
        }

        // ১ সেকেন্ড পর বুলেট গায়েব হয়ে যাবে (মেমোরি সেভ করতে)
        scene.time.delayedCall(1000, () => {
            if (this.active) this.destroy();
        });
    }

    hitWall() {
        this.destroy(); // দেয়ালে লাগলে বুলেট মুছে যাবে
    }
}