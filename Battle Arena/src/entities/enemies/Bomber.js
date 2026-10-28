import Phaser from 'phaser';
import Grenade from '../Grenade'; 

export default class Bomber extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'bomberEnemyIdle1'); 

        this.texturePrefix = 'bomberEnemy'; 
        this.scene = scene;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.23); 
        this.setCollideWorldBounds(true);
        this.setBounce(0);
        this.setDepth(2);
        
        this.body.setSize(100, 300);
        this.body.setOffset(50, 130); 

        this.hp = 120; 
        this.maxHp = 120;
        this.isDead = false;
        
        this.isThrowing = false;
        this.isPlanting = false;
        this.throwCooldown = false; 
        
        this.onLadder = false;
        this.isClimbing = false;
        this.currentLadder = null;
        this.ladderCooldown = false; 
        
        this.justJumped = false; 
        
        this.isHurt = false;
        this.isBlasted = false;
        this.isStandingUp = false;
        
        this.isRecovering = false;
        this.recoveryTimer = null;
        
        this.guardedCrate = null; 
        this.plantingCrate = null; 
        this.targetCrate = null; 
        
        this.moveSpeed = 160; 
        this.direction = -1; 

        this.plantBarBg = scene.add.rectangle(x, y - 80, 60, 8, 0x000000).setOrigin(0.5).setVisible(false).setDepth(20);
        this.plantBarFill = scene.add.rectangle(x - 30, y - 80, 0, 4, 0xff2200).setOrigin(0, 0.5).setVisible(false).setDepth(21);
        this.plantText = scene.add.text(x, y - 95, 'PLANTING...', {
            fontSize: '12px', fill: '#ff2200', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setVisible(false).setDepth(20);
    }

    startRecovery() {
        this.isRecovering = true;
        if (this.recoveryTimer) this.recoveryTimer.remove();
        
        this.recoveryTimer = this.scene.time.delayedCall(2000, () => {
            if (this && !this.isDead) this.isRecovering = false;
        });
    }

    hidePlantingUI() {
        if (this.plantBarBg) this.plantBarBg.setVisible(false);
        if (this.plantBarFill) this.plantBarFill.setVisible(false);
        if (this.plantText) this.plantText.setVisible(false);
    }

    interruptPlanting() {
        if (this.isPlanting) {
            if (this.plantTimer) {
                this.plantTimer.remove(); 
                this.plantTimer = null;
            }
            this.hidePlantingUI();
            this.isPlanting = false;
            
            if (this.plantingCrate) {
                this.plantingCrate.isBeingPlanted = false;
                this.plantingCrate = null;
            }
        }
    }

    update(players, crates) {
        if (this.isPlanting && this.plantTimer) {
            const progress = this.plantTimer.getProgress();
            this.plantBarFill.width = 60 * progress;
            this.plantBarBg.setPosition(this.x, this.y - 120);
            this.plantBarFill.setPosition(this.x - 30, this.y - 120);
            this.plantText.setPosition(this.x, this.y - 135);

            // 🚀 ফিক্স ১: প্ল্যান্ট করার সময় একদম ক্রেটের পজিশনে সুপারগ্লু দিয়ে আটকে থাকবে!
            // অন্য কেউ ধাক্কা দিলেও সে নড়বে না।
            if (this.plantingCrate) {
                this.x = this.plantingCrate.x;
                this.setVelocityX(0);
            }
        }

        if (this.isBlasted) {
            const isOnGround = this.body.blocked.down || this.body.touching.down;
            if (isOnGround && Math.abs(this.body.velocity.y) < 15 && Math.abs(this.body.velocity.x) < 15) {
                this.setVelocity(0);
                this.setBounce(0);
                this.setDragX(0);
                this.isBlasted = false;

                if (this.hp <= 0) {
                    this.die(); 
                } else {
                    this.isStandingUp = true;
                    this.anims.play(this.texturePrefix + 'StandUp', true);
                    this.once(`animationcomplete-${this.texturePrefix}StandUp`, () => {
                        if (!this.isDead) {
                            this.isStandingUp = false;
                            this.anims.play(this.texturePrefix + 'Idle', true);
                            this.startRecovery(); 
                        }
                    });
                }
            }
            return;
        }

        if (this.isStandingUp || this.isDead || !this.body || this.isHurt || this.isPlanting) return;

        const hitBoxWidth = 100;  
        const hitBoxHeight = 300; 
        const offsetX = this.frame.halfWidth - (hitBoxWidth / 2);
        const offsetY = this.frame.halfHeight - (hitBoxHeight / 2); 
        this.body.setOffset(offsetX, offsetY);

        const isOnGround = (this.body.blocked.down || this.body.touching.down) && Math.abs(this.body.velocity.y) < 5;
        
        if (this.isRecovering) {
            if (isOnGround) {
                this.setVelocityX(0);
                this.anims.play(this.texturePrefix + 'Idle', true);
            }
        } 
        else {
            if (this.guardedCrate && (!this.guardedCrate.active || !this.guardedCrate.hasBomb)) {
                this.guardedCrate = null; 
            }

            let nearestHero = null;
            let minHeroDist = Infinity;

            players.forEach(p => {
                if (!p.isDead) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
                    if (dist < minHeroDist) {
                        minHeroDist = dist;
                        nearestHero = p;
                    }
                }
            });

            if (nearestHero && minHeroDist < 300) {
                const feetDiffHero = nearestHero.body ? (nearestHero.body.bottom - this.body.bottom) : (nearestHero.y - this.y);
                
                if (Math.abs(feetDiffHero) < 50 && isOnGround && !this.isClimbing) {
                    if (!this.isThrowing && !this.throwCooldown) {
                        this.throwGrenade(nearestHero);
                    } else if (!this.isThrowing && this.throwCooldown) {
                        this.setVelocityX(0);
                        this.setFlipX(nearestHero.x < this.x);
                        if(isOnGround) this.anims.play(this.texturePrefix + 'Idle', true);
                    }
                }
            }

            if (!this.isThrowing && !this.isRecovering) {
                if (this.guardedCrate) {
                    this.setVelocityX(0); 
                    if (nearestHero) this.setFlipX(nearestHero.x < this.x);
                    if(isOnGround) this.anims.play(this.texturePrefix + 'Idle', true);
                } 
                else {
                    if (this.targetCrate) {
                        if (!this.targetCrate.active || this.targetCrate.hasBomb || this.targetCrate.isBeingPlanted) {
                            this.targetCrate = null;
                        }
                    }

                    if (!this.targetCrate) {
                        let nearestCrate = null;
                        let minCrateDist = Infinity;
                        crates.forEach(crate => {
                            if (crate.active && !crate.hasBomb && !crate.isBeingPlanted) { 
                                const dist = Phaser.Math.Distance.Between(this.x, this.y, crate.x, crate.y);
                                if (dist < minCrateDist) {
                                    minCrateDist = dist;
                                    nearestCrate = crate;
                                }
                            }
                        });
                        this.targetCrate = nearestCrate;
                    }

                    let targetObj = this.targetCrate;

                    if (!targetObj) {
                        if (nearestHero) targetObj = nearestHero;
                        else {
                            this.setVelocityX(0);
                            if(isOnGround) this.anims.play(this.texturePrefix + 'Idle', true);
                        }
                    }

                    if (targetObj) {
                        const diffX = targetObj.x - this.x;
                        const feetDiff = targetObj.body ? (targetObj.body.bottom - this.body.bottom) : (targetObj.y - this.y);

                        if (targetObj === this.targetCrate && Math.abs(diffX) < 15 && Math.abs(feetDiff) < 50 && !this.isPlanting && isOnGround && !this.isClimbing) {
                            this.plantBomb(targetObj);
                        } 
                        else {
                            let needsLadder = false;
                            let noLadderFound = false;
                            let willJump = false; 

                            if (Math.abs(feetDiff) > 15 && Math.abs(feetDiff) <= 100 && Math.abs(diffX) < 180) {
                                willJump = true; 
                            }
                            else if (Math.abs(feetDiff) > 100) {
                                needsLadder = true; 
                            }

                            let overlappingLadders = [];
                            if (this.scene.ladders) {
                                this.scene.physics.overlap(this, this.scene.ladders, (enemy, ladder) => {
                                    overlappingLadders.push(ladder);
                                });
                            }

                            this.onLadder = overlappingLadders.length > 0;
                            
                            if (this.onLadder) {
                                if (this.isClimbing && this.currentLadder && overlappingLadders.includes(this.currentLadder)) {
                                    // Keep current ladder
                                } else {
                                    let bestLadder = overlappingLadders[0];
                                    if (overlappingLadders.length > 1) {
                                        overlappingLadders.forEach(ladder => {
                                            const ladderTop = ladder.y - (ladder.displayHeight / 2);
                                            const bestTop = bestLadder.y - (bestLadder.displayHeight / 2);
                                            const ladderBottom = ladder.y + (ladder.displayHeight / 2);
                                            const bestBottom = bestLadder.y + (bestLadder.displayHeight / 2);
                                            
                                            if (feetDiff < 0) {
                                                if (ladderTop < bestTop) bestLadder = ladder; 
                                            } else {
                                                if (ladderBottom > bestBottom) bestLadder = ladder; 
                                            }
                                        });
                                    }
                                    this.currentLadder = bestLadder;
                                }
                            } else {
                                this.currentLadder = null;
                                if (this.isClimbing) this.stopClimbing(); 
                            }

                            if (this.isClimbing && this.currentLadder) {
                                const ladderTop = this.currentLadder.y - (this.currentLadder.displayHeight / 2);
                                const ladderBottom = this.currentLadder.y + (this.currentLadder.displayHeight / 2);

                                this.body.setAllowGravity(false);
                                this.x = this.currentLadder.x; 
                                this.setVelocityX(0); 

                                if (this.climbDirection === -1) {
                                    this.setVelocityY(-140); 
                                    if (this.body.bottom <= ladderTop + 20) {
                                        this.stopClimbing();
                                        this.y -= 10; 
                                    }
                                } else {
                                    this.setVelocityY(140); 
                                    if (this.body.bottom >= ladderBottom - 5) {
                                        this.stopClimbing();
                                    }
                                }

                                if (this.isClimbing) {
                                    this.anims.play(this.texturePrefix + 'Climb', true);
                                }
                            } else {
                                if (needsLadder && !willJump) {
                                    let canUseCurrent = false;
                                    if (this.onLadder && !this.ladderCooldown && this.currentLadder) {
                                        const ladderTop = this.currentLadder.y - (this.currentLadder.displayHeight / 2);
                                        const ladderBottom = this.currentLadder.y + (this.currentLadder.displayHeight / 2);
                                        
                                        canUseCurrent = true;
                                        if (feetDiff < 0 && this.body.bottom <= ladderTop + 40) canUseCurrent = false; 
                                        if (feetDiff > 0 && this.body.bottom >= ladderBottom - 10) canUseCurrent = false; 
                                    }

                                    if (canUseCurrent) {
                                        this.isClimbing = true;
                                        this.climbDirection = feetDiff < 0 ? -1 : 1;
                                        this.setVelocityX(0);
                                    } else {
                                        const ladders = this.scene.ladders.getChildren();
                                        let nearestLadder = null;
                                        let minTargetDist = Infinity; 
                                        
                                        ladders.forEach(ladder => {
                                            const ladderTop = ladder.y - (ladder.displayHeight / 2);
                                            const ladderBottom = ladder.y + (ladder.displayHeight / 2);
                                            let isValidLadder = false;

                                            if (feetDiff < 0) { 
                                                if (ladderTop < this.y && ladderBottom > this.y - 100) isValidLadder = true;
                                            } else { 
                                                if (ladderBottom > this.body.bottom && ladderTop < this.body.bottom + 50) isValidLadder = true;
                                            }

                                            if (isValidLadder) {
                                                const distToObj = Math.abs(targetObj.x - ladder.x);
                                                if (distToObj < minTargetDist) {
                                                    minTargetDist = distToObj;
                                                    nearestLadder = ladder;
                                                }
                                            }
                                        });

                                        if (nearestLadder) {
                                            const distToLadder = Math.abs(this.x - nearestLadder.x);
                                            if (distToLadder < 20 && !this.ladderCooldown) {
                                                if (!this.isClimbing) {
                                                    this.isClimbing = true;
                                                    this.currentLadder = nearestLadder;
                                                    this.climbDirection = feetDiff < 0 ? -1 : 1;
                                                    this.setVelocityX(0);
                                                }
                                            } else {
                                                this.chaseTarget(nearestLadder.x);
                                            }
                                        } else {
                                            noLadderFound = true; 
                                            this.chaseTarget(targetObj.x);
                                        }
                                    }
                                } else {
                                    this.chaseTarget(targetObj.x);
                                }
                            }

                            const isBlockedHorizontally = this.body.blocked.left || this.body.blocked.right; 
                            
                            if (!this.isClimbing && !this.isThrowing && !this.isPlanting && isOnGround && !this.guardedCrate && !this.justJumped) {
                                let shouldJump = false;
                                
                                if (isBlockedHorizontally && Math.abs(feetDiff) < 30) {
                                    shouldJump = true;
                                }
                                
                                if ((willJump || noLadderFound) && Math.abs(diffX) < 180 && Math.abs(feetDiff) > 15) {
                                    shouldJump = true;
                                }

                                if (shouldJump) {
                                    this.justJumped = true;
                                    this.scene.time.delayedCall(800, () => {
                                        if (this && !this.isDead) this.justJumped = false;
                                    });

                                    this.setVelocityY(-480); 
                                    this.anims.play(this.texturePrefix + 'Jump', true);
                                }
                            }
                        }
                    }
                }
            }
        }

        // ==========================================
        // 🚀 Separation Logic (Anti-Stacking Fix) 🚀
        // ==========================================
        // 🚀 ফিক্স ২: প্ল্যান্ট করা, গার্ড দেওয়া বা রিকভারির সময় বোম্বার স্ট্যাচুর মতো দাঁড়িয়ে থাকবে, নড়বে না!
        const isBusy = this.isPlanting || this.guardedCrate || this.isThrowing || this.isRecovering || this.justJumped;

        if (isOnGround && !this.isClimbing && !this.isDead && !isBusy) {
            let overlapForce = 0;
            if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
                this.scene.waveManager.enemyGroup.getChildren().forEach(other => {
                    if (other !== this && !other.isDead && !other.isClimbing && !other.isBlasted && !other.isPlanting) {
                        let distX = this.x - other.x;
                        let distY = Math.abs(this.y - other.y);
                        
                        if (distX === 0 && distY < 20) distX = Math.random() > 0.5 ? 1 : -1;
                        if (Math.abs(distX) < 45 && distY < 20) {
                            overlapForce += (distX > 0 ? 55 : -55); 
                        }
                    }
                });
            }
            if (overlapForce !== 0) {
                this.setVelocityX(this.body.velocity.x + overlapForce);
            }
        }
    }

    stopClimbing() {
        this.isClimbing = false;
        this.body.setAllowGravity(true);
        
        this.ladderCooldown = true;
        this.scene.time.delayedCall(500, () => {
            if (!this.isDead) this.ladderCooldown = false;
        });
    }

    chaseTarget(targetX) {
        const diffX = targetX - this.x;
        const isTouchingGround = this.body.blocked.down || this.body.touching.down;
        
        if (Math.abs(diffX) < 10 && isTouchingGround) {
            this.setVelocityX(0);
            this.anims.play(this.texturePrefix + 'Idle', true);
            return;
        }

        if (isTouchingGround) {
            this.direction = diffX < 0 ? -1 : 1; 
            this.setFlipX(this.direction === -1);
        }

        let currentSpeed = this.moveSpeed;
        if (Math.abs(diffX) < 60 && isTouchingGround) currentSpeed = this.moveSpeed * 0.6; 
        if (!isTouchingGround) currentSpeed = this.moveSpeed * 1.2; 
        
        this.setVelocityX(currentSpeed * this.direction);
        
        if (!this.isClimbing) {
            if (isTouchingGround) this.anims.play(this.texturePrefix + 'Run', true);
        }
    }

    throwGrenade(hero) {
        this.isThrowing = true;
        this.setVelocityX(0); 
        this.setFlipX(hero.x < this.x);
        this.anims.play(this.texturePrefix + 'Throw', true);

        this.scene.time.delayedCall(200, () => {
            if (!this.isDead && hero && !hero.isDead) {
                let throwDir = this.flipX ? 'left' : 'right';
                const grenade = new Grenade(this.scene, this.x + (this.flipX ? -40 : 40), this.y, throwDir);
                
                if (this.scene.ground) this.scene.physics.add.collider(grenade, this.scene.ground);
                if (this.scene.platforms) this.scene.physics.add.collider(grenade, this.scene.platforms);
            }
        });

        this.once(`animationcomplete-${this.texturePrefix}Throw`, () => {
            if (this.isDead) return;
            this.isThrowing = false; 
            this.throwCooldown = true;   
            this.anims.play(this.texturePrefix + 'Idle', true);
            this.scene.time.delayedCall(3000, () => {
                if (!this.isDead) this.throwCooldown = false; 
            });
        });
    }

    plantBomb(crate) {
        this.isPlanting = true;
        
        this.plantingCrate = crate;
        crate.isBeingPlanted = true; 

        this.x = crate.x; 
        this.setVelocityX(0);

        this.anims.play(this.texturePrefix + 'BombSetUp', true); 

        this.plantBarBg.setVisible(true);
        this.plantBarFill.setVisible(true);
        this.plantText.setVisible(true);
        this.plantBarFill.width = 0; 

        this.plantTimer = this.scene.time.addEvent({
            delay: 9000,
            callback: () => {
                if (this.isDead || !this.isPlanting) return;
                
                this.hidePlantingUI();
                
                crate.hasBomb = true;
                crate.isBeingPlanted = false; 
                this.plantingCrate = null;
                
                this.guardedCrate = crate; 
                this.scene.plantTimeBomb(crate); 

                this.anims.playReverse(this.texturePrefix + 'BombSetUp', true);
                this.once(`animationcomplete-${this.texturePrefix}BombSetUp`, () => {
                    if (!this.isDead && !this.isHurt && !this.isBlasted) {
                        this.isPlanting = false; 
                        this.anims.play(this.texturePrefix + 'Idle', true);
                    }
                });
            }
        });
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.die();
            return;
        }

        this.interruptPlanting(); 

        this.isHurt = true;       
        this.isThrowing = false; 
        
        const knockbackForce = 150; 
        this.setVelocityX(this.flipX ? knockbackForce : -knockbackForce);
        this.setVelocityY(-80); 

        if (this.isClimbing) {
            this.isClimbing = false;
            this.body.setAllowGravity(true);
        }

        this.anims.stop();
        this.setTexture(this.texturePrefix + 'Hurt'); 

        this.scene.time.delayedCall(300, () => {
            if (!this.isDead) {
                this.isHurt = false; 
                this.setVelocityX(0); 
                this.anims.play(this.texturePrefix + 'Idle', true);
                this.startRecovery();
            }
        });
    }

    applyBlast(blastX, amount) {
        if (this.isDead) return;

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
            return;
        }

        this.interruptPlanting(); 

        this.isBlasted = true;
        this.isHurt = false;
        this.isThrowing = false;
        this.isStandingUp = false;
        this.guardedCrate = null; 

        if (this.isClimbing) {
            this.isClimbing = false;
            this.body.setAllowGravity(true);
        }

        this.anims.stop();
        this.setTexture(this.texturePrefix + 'BlastAway'); 
        this.setBounce(0.5); 
        this.setDragX(250); 
        const pushDir = this.x < blastX ? -1 : 1;
        this.setFlipX(pushDir === 1); 
        this.setVelocity(pushDir * 350, -450); 
    }

    die() {
        this.isDead = true;
        this.setVelocityX(0);
        this.body.enable = false; 
        this.guardedCrate = null;
        
        this.interruptPlanting(); 

        if (this.plantBarBg) this.plantBarBg.destroy();
        if (this.plantBarFill) this.plantBarFill.destroy();
        if (this.plantText) this.plantText.destroy();

        this.anims.play(this.texturePrefix + 'Death', true); 
        
        this.once(`animationcomplete-${this.texturePrefix}Death`, () => {
            this.scene.tweens.add({
                targets: this, alpha: 0, y: this.y + 10, duration: 500,
                onComplete: () => { this.destroy(); }
            });
        });
    }
}