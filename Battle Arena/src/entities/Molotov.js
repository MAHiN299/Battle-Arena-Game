import Phaser from 'phaser';

export default class Molotov extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, direction) {
        super(scene, x, y, 'molotov'); 

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.2);
        this.setDepth(2);

        // ছোঁড়ার দিক অনুযায়ী ভেলোসিটি
        const vx = direction === 'left' ? -300 : 300;
        this.setVelocity(vx, -350);
        this.setAngularVelocity(400); 
    }

    hitGround() {
        if (this.hasHit) return;
        this.hasHit = true;

        const impactX = this.x;
        const impactY = this.y;

        // 🚀 ফিক্স ১: মলোটোভ ডিলিট করার আগে আগুন তৈরি করতে হবে!
        this.createFireZone(impactX, impactY);
        
        // 🚀 ফিক্স ২: আগুন তৈরি হওয়ার পর বোতলটা গায়েব হবে
        this.destroy(); 
    }

    createFireZone(x, y) {
        // 🚀 ফিক্স ৩: মলোটোভ ডিলিট হওয়ার পর this.scene আনডিফাইন হয়ে যেতে পারে, তাই সিন ব্যাকআপ রাখলাম
        const scene = this.scene; 
        
        const fires = [];
        const offsets = [-45, 0, 45]; 

        offsets.forEach(offsetX => {
            const fire = scene.add.sprite(x + offsetX, y - 30, 'fireEffect1').setDepth(5).setScale(0.8);
            if (scene.anims.exists('fireEffect')) {
                fire.anims.play('fireEffect', true);
            }
            fires.push(fire);
        });

        // ৫ সেকেন্ড ধরে আগুন জ্বলবে
        let burnDuration = 5000;
        let tickInterval = 500; 

        // ==========================================
        // 🚀 ড্যামেজ টাইমার (এনিমি এবং হিরোকে ড্যামেজ দেবে)
        // ==========================================
        scene.time.addEvent({
            delay: tickInterval,
            repeat: burnDuration / tickInterval,
            callback: () => {
                // ১. এনিমিদের ড্যামেজ দেওয়া
                if (scene.waveManager && scene.waveManager.enemyGroup) {
                    scene.waveManager.enemyGroup.getChildren().forEach(enemy => {
                        if (!enemy.isDead) {
                            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                            if (dist < 90) { 
                                enemy.takeDamage(15); 
                            }
                        }
                    });
                }
                
                // ২. হিরোদের ড্যামেজ দেওয়া (ফ্রেন্ডলি ফায়ার / সেলফ ড্যামেজ)
                const players = scene.players || [scene.player1, scene.player2].filter(Boolean);
                players.forEach(player => {
                    if (!player.isDead) {
                        const dist = Phaser.Math.Distance.Between(x, y, player.x, player.y);
                        if (dist < 90) {
                            player.takeDamage(10); 
                        }
                    }
                });
            }
        });

       // ==========================================
       // 🚀 ৫ সেকেন্ড পর আগুন আস্তে আস্তে নিভে যাবে এবং গ্যারান্টিড ডিলিট হবে
       // ==========================================
       scene.time.delayedCall(burnDuration, () => {
           fires.forEach(fire => {
               if (fire && fire.active) {
                   scene.tweens.add({
                       targets: fire,
                       alpha: 0,
                       duration: 500, 
                       onComplete: () => {
                           if (fire) fire.destroy(); // টুইন শেষ হলে ডিলিট
                       }
                   });
                   
                   // 🚀 ব্যাকআপ সেফটি: যদি কোনো কারণে টুইন ফেইল করে, তবে ৬০০ মিলিসেকেন্ড পর ফোর্স ডিলিট!
                   scene.time.delayedCall(600, () => {
                       if (fire && fire.active) {
                           fire.destroy();
                       }
                   });
               }
           });
       });
    }
}