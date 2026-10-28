// src/maps/Arena1.js
import SupplyCrate from '../entities/SupplyCrate';

export function buildArena1(scene, width, height) {
    // Background setup
    scene.add.image(width / 2, height / 2, 'arenaBg').setDisplaySize(width, height).setDepth(0);

    // Ground setup
    scene.ground = scene.add.rectangle(width / 2, height - 75, width + 400, 70, 0x101010, 0);
    scene.ground.setDepth(1);
    scene.physics.add.existing(scene.ground, true);

    scene.ground2 = scene.add.rectangle(width * 0.35, height * 0.667, 200, 30, 0x202020, 0);
    scene.physics.add.existing(scene.ground2, true);
    scene.ground2.body.checkCollision.up = true;
    scene.ground2.body.checkCollision.down = false;
    scene.ground2.body.checkCollision.left = false;
    scene.ground2.body.checkCollision.right = false;

    scene.ground3 = scene.add.rectangle(width * 0.7, height * 0.652, 200, 30, 0x303030, 0);
    scene.physics.add.existing(scene.ground3, true);
    scene.ground3.body.checkCollision.up = true;
    scene.ground3.body.checkCollision.down = false;
    scene.ground3.body.checkCollision.left = false;
    scene.ground3.body.checkCollision.right = false;

    // Platforms setup
    scene.platforms = scene.physics.add.staticGroup();
    const p1 = scene.add.rectangle(width * 0.3, height * 0.66, 450, 20, 0xff0000, 0);
    const p2 = scene.add.rectangle(width * 0.74, height * 0.645, 280, 20, 0xff0000, 0);
    const p3 = scene.add.rectangle(width * 0.52, height * 0.44, 655, 20, 0xff0000, 0);
    const p4 = scene.add.rectangle(width * 0.05, height * 0.53, 230, 20, 0xff0000, 0);
    const p5 = scene.add.rectangle(width * 0.91, height * 0.53, 265, 20, 0xff0000, 0);
    const p6 = scene.add.rectangle(width * 0.83, height * 0.581, 40, 90, 0xff0000, 0);

    scene.platforms.addMultiple([p1, p2, p3, p4, p5, p6]);

    // Stairs
    const slopeStartX = width * 0.18;
    const slopeStartY = height * 0.63;
    const totalSteps = 6;
    const stepSize = 15;

    for (let i = 0; i < totalSteps; i++) {
        const step = scene.add.rectangle(slopeStartX - (i * stepSize), slopeStartY - (i * stepSize), stepSize, stepSize, 0xff0000, 0);
        step.name = 'stair';
        p6.name = "Lwall";
        scene.platforms.add(step);
    }

    scene.platforms.getChildren().forEach(platform => {
        platform.body.checkCollision.down = false;
        platform.body.checkCollision.left = false;

        if (platform.name === 'stair') {
            platform.body.checkCollision.right = true;
        } else if (platform.name === 'Lwall') {
            platform.body.checkCollision.left = true;
        } else {
            platform.body.checkCollision.right = false;
        }
    });

    // Ladders setup
    scene.ladders = scene.physics.add.staticGroup();
    const l1 = scene.add.rectangle(width * 0.25, height * 0.744, 25, height * 0.20, 0x00ff00, 0);
    const l2 = scene.add.rectangle(width * 0.797, height * 0.73, 25, height * 0.20, 0xff0000, 0);
    const l3 = scene.add.rectangle(width * 0.365, height * 0.50, 30, height * 0.15, 0x0000ff, 0);
    const l4 = scene.add.rectangle(width * 0.66, height * 0.50, 30, height * 0.15, 0x800080, 0);

    scene.ladders.addMultiple([l1, l2, l3, l4]);

    // Supply Crates setup
    scene.supplyCrate1 = new SupplyCrate(scene, width * 0.5, height * 0.37);
    scene.supplyCrate2 = new SupplyCrate(scene, width * 0.15, height * 0.772);
    scene.supplyCrate3 = new SupplyCrate(scene, width * 0.90, height * 0.456);

    scene.crates = [scene.supplyCrate1, scene.supplyCrate2, scene.supplyCrate3];
    scene.supplyCrates = scene.crates;
}