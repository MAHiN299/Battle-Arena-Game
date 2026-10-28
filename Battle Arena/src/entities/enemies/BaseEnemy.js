import Phaser from 'phaser';

export default class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texturePrefix) {
        super(scene, x, y, texturePrefix + 'Idle1'); 

        this.texturePrefix = texturePrefix; 
        this.scene = scene;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Physics body scale & collision setup
        this.setScale(0.2); 
        this.setCollideWorldBounds(true);
        this.setBounce(0);
        this.setDepth(2);
        
        this.body.setSize(150, 400);
        this.body.setOffset(50, 130); 

        // Core state flags
        this.hp = 100;
        this.isDead = false;
        this.isBlasted = false;    // Blasted away status
        this.isStandingUp = false; // Getting up status
        this.isAttacking = false;
        this.isCooldown = false; 
        this.onLadder = false;
        this.isClimbing = false;
        this.currentLadder = null;
        this.isHurt = false;
        this.isConfused = false; 
        this.lastPlayerSide = null; 
        
        this.moveSpeed = 170; 
        this.direction = -1; 
    }

    // Main Update Loop (Receives array of active players)
    update(players) {
        // =======================================================
        // 1. Airblast / Knockback Physics & Landing Logic
        // =======================================================
        if (this.isBlasted) {
            const isOnGround = this.body.blocked.down || this.body.touching.down;
            
            // Wait until velocity settles on ground contact
            if (isOnGround && Math.abs(this.body.velocity.y) < 15 && Math.abs(this.body.velocity.x) < 15) {
                this.setVelocity(0);
                this.setBounce(0);
                this.setDragX(0); // Reset drag force
                this.isBlasted = false;

                if (this.hp <= 0) {
                    this.die(); // Execute death if health depleted during blast
                } else {
                    this.isStandingUp = true;
                    // Play recovery animation
                    this.anims.play(this.texturePrefix + 'StandUp', true);
                    
                    this.once(`animationcomplete-${this.texturePrefix}StandUp`, () => {
                        if (!this.isDead) {
                            this.isStandingUp = false;
                            this.anims.play(this.texturePrefix + 'Idle', true);
                        }
                    });
                }
            }
            return; // Lock AI decisions while in blasted state
        }

        // Lock movement during StandUp animation
        if (this.isStandingUp) return;
        
        // Interrupt AI if dead, hurt, or confused
        if (this.isDead || !this.body) return;
        if (this.isHurt) return; 
        if (this.isConfused) return;
        
        // =======================================================
        // 2. Dynamic Hitbox Centering & Stabilization
        // =======================================================
        const hitBoxWidth = 150;  
        const hitBoxHeight = 400; 
        
        const offsetX = this.frame.halfWidth - (hitBoxWidth / 2);
        const offsetY = this.frame.halfHeight - (hitBoxHeight / 2) + 50; 
        
        this.body.setOffset(offsetX, offsetY);

        // =======================================================
        // 3. Smart Target Selection (Nearest Alive Player)
        // =======================================================
        let targetPlayer = null;
        let minDistance = Infinity;

        if (Array.isArray(players)) {
            players.forEach(p => {
                if (!p.isDead) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
                    if (dist < minDistance) {
                        minDistance = dist;
                        targetPlayer = p;
                    }
                }
            });
        } else {
            targetPlayer = players;
            minDistance = Phaser.Math.Distance.Between(this.x, this.y, targetPlayer.x, targetPlayer.y);
        }

        // Idle if no target remains alive
        if (!targetPlayer || targetPlayer.isDead) {
            this.setVelocityX(0);
            this.anims.play(this.texturePrefix + 'Idle', true);
            return;
        }

        const player = targetPlayer;
        const distanceToPlayer = minDistance;
        const feetDiff = player.body.bottom - this.body.bottom; 
        const currentPlayerSide = player.x < this.x ? -1 : 1;

        // Determine vertical pathfinding necessity
        let needsLadder = false;
        
        if (Math.abs(feetDiff) > 30) {
            needsLadder = true;
            if (feetDiff < 0 && feetDiff >= -120) { 
                needsLadder = false; // Can reach via jump
            }
        }

        // =======================================================
        // 4. Ladder Navigation Logic
        // =======================================================
        if (this.isClimbing && this.currentLadder) {
            const ladderTop = this.currentLadder.y - (this.currentLadder.displayHeight / 2);
            const ladderBottom = this.currentLadder.y + (this.currentLadder.displayHeight / 2);

            this.body.setAllowGravity(false);
            this.x = this.currentLadder.x; 
            this.setVelocityX(0); 

            if (this.climbDirection === -1) { 
                this.setVelocityY(-120); // Move Up
                if (this.body.bottom <= ladderTop + 20) {
                    this.stopClimbing();
                    this.y -= 15; 
                }
            } 
            else { 
                this.setVelocityY(120); // Move Down
                if (this.body.bottom >= ladderBottom - 5) {
                    this.stopClimbing();
                }
            }

            if (this.isClimbing) {
                this.anims.play(this.texturePrefix + 'Climb', true);
                return; 
            }
        }

        // =======================================================
        // 5. Direction Switch Confusion Lock
        // =======================================================
        if (!this.isAttacking && this.lastPlayerSide !== null && this.lastPlayerSide !== currentPlayerSide && distanceToPlayer < 150) {
            this.isConfused = true;
            this.setVelocityX(0); 
            this.anims.play(this.texturePrefix + 'Idle', true); 

            this.scene.time.delayedCall(2000, () => {
                if (!this.isDead) this.isConfused = false;
            });
            this.lastPlayerSide = currentPlayerSide;
            return; 
        }
        this.lastPlayerSide = currentPlayerSide;

        // =======================================================
        // 6. Melee Attack Trigger
        // =======================================================
        if (distanceToPlayer < 40 && Math.abs(feetDiff) < 50 && !this.isAttacking && !this.isCooldown) {
            this.attackPlayer(player);
            return;
        }

        // =======================================================
        // 7. Target Chasing & Ladder Path Selection
        // =======================================================
        if (!this.isAttacking) {
            if (needsLadder) {
                const ladders = this.scene.ladders.getChildren();
                let nearestLadder = null;
                let minPlayerDist = Infinity; 
                
                ladders.forEach(ladder => {
                    const ladderTop = ladder.y - (ladder.displayHeight / 2);
                    const ladderBottom = ladder.y + (ladder.displayHeight / 2);
                    let isValidLadder = false;

                    if (feetDiff < 0) { // Target above
                        if (ladderTop < this.y && ladderBottom > this.y - 30) isValidLadder = true;
                    } else { // Target below
                        if (ladderBottom > this.body.bottom && ladderTop < this.body.bottom + 30) isValidLadder = true;
                    }

                    if (isValidLadder) {
                        const distToPlayer = Math.abs(player.x - ladder.x);
                        if (distToPlayer < minPlayerDist) {
                            minPlayerDist = distToPlayer;
                            nearestLadder = ladder;
                        }
                    }
                });

                if (nearestLadder) {
                    const distToEnemy = Math.abs(this.x - nearestLadder.x);
                    
                    if (distToEnemy < 20) { 
                        if (!this.isClimbing) {
                            this.isClimbing = true;
                            this.currentLadder = nearestLadder;
                            this.climbDirection = feetDiff < 0 ? -1 : 1;
                        }
                    } else {
                        this.chaseTarget(nearestLadder.x);
                    }
                } else {
                    this.chaseTarget(player.x);
                }
            } 
            else {
                this.chaseTarget(player.x);
            }
        }

        // =======================================================
        // 8. Obstacle & Platform Jumping Logic
        // =======================================================
        const isOnGround = this.body.blocked.down || this.body.touching.down;
        const isBlockedHorizontally = this.body.blocked.left || this.body.blocked.right; 
        const diffX = player.x - this.x; 

        if (!this.isClimbing && !this.isAttacking && isOnGround) {
            let shouldJump = false;

            if (isBlockedHorizontally && feetDiff < 10) {
                shouldJump = true;
            }
            if (feetDiff < -15 && Math.abs(diffX) < 60 && feetDiff >= -120) {
                shouldJump = true;
            }

            if (shouldJump) {
                this.setVelocityY(-480); 
                this.anims.play(this.texturePrefix + 'Jump', true);
            }
        }

        // =======================================================
        // 9. Anti-Stacking Velocity Separation Nudge
        // =======================================================
        if (isOnGround && !this.isClimbing && !this.isAttacking && !this.isHurt && !this.isBlasted) {
            if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
                let overlapForce = 0;
                
                this.scene.waveManager.enemyGroup.getChildren().forEach(other => {
                    if (other !== this && !other.isDead && !other.isClimbing && !other.isBlasted) {
                        let distX = this.x - other.x;
                        let distY = Math.abs(this.y - other.y);
                        
                        // Handle exact position overlap
                        if (distX === 0 && distY < 20) {
                            distX = Math.random() > 0.5 ? 1 : -1;
                        }
                        
                        if (Math.abs(distX) < 35 && distY < 20) {
                            overlapForce += (distX > 0 ? 30 : -30); 
                        }
                    }
                });
                
                if (overlapForce !== 0) {
                    this.setVelocityX(this.body.velocity.x + overlapForce);
                }
            }
        }
    }

    // Stop climbing state and restore gravity
    stopClimbing() {
        this.isClimbing = false;
        this.body.setAllowGravity(true);
    }

    // Move horizontal position toward specified target coordinate
    chaseTarget(targetX) {
        const diffX = targetX - this.x;
        const isOnGround = this.body.blocked.down || this.body.touching.down;
        
        if (Math.abs(diffX) < 15 && isOnGround) {
            this.setVelocityX(0);
            this.anims.play(this.texturePrefix + 'Idle', true);
            return;
        }

        if (isOnGround) {
            this.direction = diffX < 0 ? -1 : 1; 
            this.setFlipX(this.direction === -1);
        }

        let currentSpeed = this.moveSpeed;
        if (Math.abs(diffX) < 40 && isOnGround) {
            currentSpeed = this.moveSpeed * 0.6; 
        }
        
        this.setVelocityX(currentSpeed * this.direction);
        
        if (!this.isClimbing) {
            if (isOnGround) {
                this.anims.play(this.texturePrefix + 'Run', true);
            } else {
                this.anims.play(this.texturePrefix + 'Jump', true);
            }
        }
    }

    // =======================================================
    // 10. Combat & Damage Application
    // =======================================================
    attackPlayer(player) {
        this.isAttacking = true;
        this.scene.sound.play('sword', { volume: 0.6 });
        this.setVelocityX(0);
        this.setFlipX(player.x < this.x);
        this.anims.play(this.texturePrefix + 'Attack', true);

        this.scene.time.delayedCall(200, () => {
            if (!this.isDead && player && !player.isDead) {
                if (Math.abs(this.x - player.x) < 60) { 
                    player.takeDamage(10); 
                }
            }
        });

        this.once(`animationcomplete-${this.texturePrefix}Attack`, () => {
            if (this.isDead) return;
            
            this.isAttacking = false; 
            this.isCooldown = true;   
            
            this.anims.play(this.texturePrefix + 'Idle', true);
            
            this.scene.time.delayedCall(2000, () => {
                if (!this.isDead) {
                    this.isCooldown = false; 
                }
            });
        });
    }

    // Explosive AoE Force & Damage Impact
    applyBlast(blastX, amount) {
        if (this.isDead) return;

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
            return;
        }

        this.isBlasted = true;
        this.isHurt = false;
        this.isAttacking = false;
        this.isStandingUp = false;

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

    // Direct Bullet / Melee Damage Handler
    takeDamage(amount) {
        if (this.isDead) return;
        
        this.hp -= amount;

        if (this.hp <= 0) {
            this.die();
            return;
        }

        // Stun & Knockback Processing
        this.isHurt = true;       
        this.isAttacking = false; 
        
        const knockbackForce = 100; 
        this.setVelocityX(this.flipX ? knockbackForce : -knockbackForce);
        this.setVelocityY(-40); 

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
            }
        });
    }

    // =======================================================
    // 11. Death Execution & Cleanup
    // =======================================================
    die() {
        this.isDead = true;
        this.setVelocityX(0);
        this.body.enable = false; 
        
        this.anims.play(this.texturePrefix + 'Death', true); 
        this.clearTint(); 
        
        this.once(`animationcomplete-${this.texturePrefix}Death`, () => {
            this.scene.tweens.add({
                targets: this,
                alpha: 0,
                y: this.y + 10, 
                duration: 500,
                onComplete: () => {
                    this.destroy(); 
                }
            });
        });
    }
}