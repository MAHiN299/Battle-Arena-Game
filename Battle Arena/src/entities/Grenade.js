import Phaser from 'phaser';

export default class Grenade extends Phaser.Physics.Arcade.Sprite 
{
    constructor(scene, x, y, direction) 
    {
        super(scene, x, y, 'grenade'); 

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.8); 
        this.setBounce(0.5); 
        this.setCollideWorldBounds(true);
        
        // 💡 Drag bariyel dilam jate matite porle taratari theme jay
        this.setDragX(250); 
        this.setOrigin(0.5, 0.8); 
        
        this.body.setCircle(this.width / 2); 

        // ==========================================
        // 🚀 Enemy er shathe Grenade er Collision!
        // ==========================================
        if (scene.waveManager && scene.waveManager.enemyGroup) {
            // Ekhon grenade enemy r gaye lagle theke jabe ba bounce korbe, bhed kore jabe na!
            scene.physics.add.collider(this, scene.waveManager.enemyGroup);
        }

        // ==========================================
        // 🚀 Grenade er Throw Force (Distance Komano Holo)
        // ==========================================
        let throwForceX = 0;
        let throwForceY = 0;
        let angularVel = 0;

        if (direction === 'right') {
            throwForceX = 350;  // 💡 400 theke komiye 250 kora holo
            throwForceY = -300; // 💡 -350 theke komiye -300 kora holo
            angularVel = 200;
        } 
        else if (direction === 'left') {
            throwForceX = -350;
            throwForceY = -300;
            angularVel = -200;
        } 
        else if (direction === 'upRight') {
            throwForceX = 200;  // 💡 Samne aro kom jabe
            throwForceY = -600; // 💡 -800 theke komiye -600 kora holo (bortoman screen height er jonno perfect)
            angularVel = 200;
        } 
        else if (direction === 'upLeft') {
            throwForceX = -200;
            throwForceY = -600;
            angularVel = -200;
        }
        
        this.setVelocity(throwForceX, throwForceY);
        this.setAngularVelocity(angularVel);

        scene.time.delayedCall(2000, () => {
            this.explode();
        });
    }

    explode() 
    {
        this.setVelocity(0, 0);
        this.body.setAllowGravity(false); 
        this.body.enable = false; 

        this.setAngularVelocity(0);
        this.setAngle(0);

        this.setScale(2); 
        this.setDepth(100);

        this.anims.play('grenadeBlast', true);
        this.scene.sound.play('grenadeExplosionSound', { volume: 0.8 });

        this.scene.cameras.main.shake(250, 0.02);

        const blastRadius = 150; // ব্লাস্ট রেঞ্জ

        // ==========================================
        // 🚀 ১. হিরোকে (Player) ড্যামেজ দেওয়ার লজিক 
        // ==========================================
        let playersToDamage = [];
        if (this.scene.players) playersToDamage = this.scene.players;
        else {
            if (this.scene.player1) playersToDamage.push(this.scene.player1);
            if (this.scene.player2) playersToDamage.push(this.scene.player2);
        }

        playersToDamage.forEach(p => {
            if (p && !p.isDead) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
                if (dist <= blastRadius) {
                    p.takeDamage(25); // 💡 গ্রেনেড ফাটলে হিরোর ২৫ ড্যামেজ হবে (ইচ্ছেমতো পাল্টাতে পারেন)
                }
            }
        });

        // ==========================================
        // 🚀 ২. Area of Effect (AoE) ড্যামেজ লজিক (For Enemies)
        // ==========================================
        if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
            this.scene.waveManager.enemyGroup.getChildren().forEach(enemy => {
                if (!enemy.isDead || enemy.isBlasted) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                    
                    if (dist <= blastRadius) {
                        // 💡 আগে takeDamage(100) ছিল। 
                        // এখন ড্যামেজ 50 দিলাম, যাতে তারা এক বোমায় না মরে শুধু উড়ে যায় এবং উঠে দাঁড়াতে পারে!
                        enemy.applyBlast(this.x, 50); 
                    }
                }
            });
        }

        this.once('animationcomplete-grenadeBlast', () => {
            this.destroy();
        });
    }
}