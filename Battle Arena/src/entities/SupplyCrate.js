import Phaser from 'phaser';

export default class SupplyCrate extends Phaser.Physics.Arcade.Sprite 
{
    constructor(scene, x, y) 
    {
        super(scene, x, y, 'supplyCrate');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDepth(1);
        this.setScale(0.1); 
        this.body.setAllowGravity(false);
        this.body.updateFromGameObject();
        this.setImmovable(true); 

        this.isDestroyed = false;
        
        // 🚀 নতুন: বোম্বারের জন্য স্ট্যাটাস
        this.active = true;    // বোম্বার চেক করবে ক্রেটটা আস্ত আছে কি না
        this.hasBomb = false;  // বোম্বার চেক করবে এতে অলরেডি বোম বসানো আছে কি না
    }

    // 💣 বম্ব ব্লাস্ট হলে এই ফাংশনটি কল করা হবে
   explode() {
        if (this.isExploded) return;
        this.isExploded = true;
        this.active = false;
        this.hasBomb = false;

        // 🚀 ১. Original Crate ke ekdom invisible kore dilam ebong physics off kore dilam
        this.setVisible(false);
        if (this.body) {
            this.body.enable = false;
        }

        // 🚀 ২. Thik same position e Destroyed Crate er notun chobi add korlam!
        const brokenCrate = this.scene.add.image(this.x, this.y, 'desSupplyCrate');
        brokenCrate.setScale(this.scaleX, this.scaleY); // Original scale ta copy korbe
        brokenCrate.setDepth(this.depth);               // Original depth e thakbe

        // 💥 ব্লাস্ট অ্যানিমেশন
        const blast = this.scene.add.sprite(this.x, this.y, 'grenadeBlast').setScale(2.5).setDepth(10);
        blast.anims.play('grenadeBlast', true);
        
        blast.once('animationcomplete', () => {
            blast.destroy();
        });

        const blastRadius = 200;
        
        // 🚀 ৩. হিরোকে ড্যামেজ দেওয়া
        let playersToDamage = [];
        if (this.scene.players) playersToDamage = this.scene.players;
        else {
            if (this.scene.player1) playersToDamage.push(this.scene.player1);
            if (this.scene.player2) playersToDamage.push(this.scene.player2);
        }

        playersToDamage.forEach(p => {
            if (p && !p.isDead) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
                if (dist <= blastRadius) p.takeDamage(40); // ক্রেট ফাটলে হিরোর গায়ে ড্যামেজ
            }
        });

        // 🚀 ৪. বোম্বার যেন না মরে তাই ড্যামেজ কমানো হলো
        if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
            this.scene.waveManager.enemyGroup.getChildren().forEach(enemy => {
                if (!enemy.isDead && !enemy.isBlasted) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                    
                    // 💡 ড্যামেজ মাত্র ৩০ করে দিলাম! ফলে বোম্বার উড়ে যাবে ঠিকই, কিন্তু মরবে না।
                    if (dist <= blastRadius) enemy.applyBlast(this.x, 30); 
                }
            });
        }
    }
}