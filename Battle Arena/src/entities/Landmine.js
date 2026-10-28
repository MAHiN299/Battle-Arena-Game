import Phaser from 'phaser';

export default class Landmine extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, owner = null) {
        super(scene, x, y, 'landmine'); 

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 🚀 ফিক্স ১: মাইনের ছবি আরও অনেক ছোট করা হলো (0.15 থেকে 0.08)
        this.setScale(0.08); 
        this.setDepth(1.2);
        
        this.body.setAllowGravity(true);
        this.body.setImmovable(false); 
        this.setBounce(0); 
        this.setDragX(1000); 

        // 🚀 ফিক্স ২: মাইনের ছবি ছোট হলেও হিটবক্স (Hitbox) যেন ঠিক থাকে, তাই ম্যানুয়ালি সাইজ একটু বাড়িয়ে দিলাম
        this.body.setSize(this.width * 1.5, this.height * 1.5); 

        this.isArmed = false;
        this.isExploded = false;
        this.owner = owner;

        // ০.৫ সেকেন্ড পর মাইন একটিভ হবে (আর্মিং টাইম)
        scene.time.delayedCall(500, () => {
            this.isArmed = true;
        });
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta); 

        if (!this.isArmed || this.isExploded) return;

        // 🚀 ফিক্স ৩: যেকোনো টাচ (Overlap) লাগলেই ব্লাস্ট হবে! (আগের দূরত্বের হিসাব বাদ)
        if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
            // ফিজারের বিল্ট-ইন কলিশন চেকার (হিটবক্সে এনিমির বডি টাচ করলেই ফাটবে)
            this.scene.physics.overlap(this, this.scene.waveManager.enemyGroup, (mine, enemy) => {
                if (!enemy.isDead && !this.isExploded) {
                    this.explode();
                }
            });
        }

        if (this.scene.players) {
            this.scene.players.forEach(player => {
                if (!player || player === this.owner || player.isDead || this.isExploded) return;
                this.scene.physics.overlap(this, player, () => this.explode());
            });
        }
    }

    explode() {
        if (this.isExploded) return;
        this.isExploded = true;

        this.scene.sound.play('misile', { volume: 0.9 }); 

        const blast = this.scene.add.sprite(this.x, this.y-50, 'grenadeBlust1').setScale(2).setDepth(10);
        
        if (this.scene.anims.exists('grenadeBlast')) {
            blast.anims.play('grenadeBlast', true);
        }

        const blastRadius = 150;
        if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
            this.scene.waveManager.enemyGroup.getChildren().forEach(enemy => {
                if (!enemy.isDead) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                    if (dist <= blastRadius) {
                        enemy.takeDamage(80); 
                        if (enemy.applyBlast) enemy.applyBlast(this.x, 200);
                    }
                }
            });
        }

        blast.once('animationcomplete', () => {
            blast.destroy();
        });
        
        this.setVisible(false);
        this.body.enable = false;
        
        this.scene.time.delayedCall(1000, () => {
            if (this && this.scene) {
                this.destroy();
            }
        });
    }
}