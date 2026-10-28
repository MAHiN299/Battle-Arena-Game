import SupplyCrate from '../entities/SupplyCrate';

export function buildArena2(scene, width, height) {
    // 🗺️ ব্যাকগ্রাউন্ড সেটআপ
    scene.add.image(width / 2, height / 2, 'arena2Bg').setDisplaySize(width, height).setDepth(0);

    // 🚀 ১. গ্রাউন্ডকে দুই ভাগে ভাগ করা এবং স্ক্রিনের বাইরে লম্বা করা হলো (যাতে এনিমি না পড়ে যায়)
    scene.ground = scene.physics.add.staticGroup();
    
    // বাম দিকের গ্রাউন্ড (বাম দিকে ২০০ পিক্সেল বাড়ানো হলো)
    const groundLeft = scene.add.rectangle(width * 0.18 - 100, height - 122, (width * 0.44) + 300, 70, 0x101010, 0);
    // ডান দিকের গ্রাউন্ড (ডান দিকে ২০০ পিক্সেল বাড়ানো হলো)
    const groundRight = scene.add.rectangle(width * 0.78 + 100, height - 122, (width * 0.44) + 200, 70, 0x101010, 0);
    
    scene.ground.addMultiple([groundLeft, groundRight]);

    // ☠️ ২. স্পাইক জোন (Spike Zone) তৈরি করা (মাঝখানের ফাঁকা জায়গায়)
    scene.spikeZone = scene.add.rectangle(width * 0.5, height - 80, width * 0.12, 50, 0xff0000, 0);
    scene.physics.add.existing(scene.spikeZone, true);

    // 🧱 প্ল্যাটফর্ম গ্রুপ
    scene.platforms = scene.physics.add.staticGroup();
    const p1 = scene.add.rectangle(width * 0.5, height * 0.38, width + 400, 20, 0xff0000, 0);
    scene.platforms.add(p1);
    
    p1.body.checkCollision.down = false;
    p1.body.checkCollision.left = false;
    p1.body.checkCollision.right = false;

    // 🪜 ২টি মই (Ladders)
    scene.ladders = scene.physics.add.staticGroup();
    const ladder1 = scene.add.rectangle(width * 0.3, height * 0.525, 30, height * 0.32, 0x0000ff, 0);
    const ladder2 = scene.add.rectangle(width * 0.7, height * 0.525, 30, height * 0.32, 0x800080, 0);
    scene.ladders.addMultiple([ladder1, ladder2]);

    // 📦 ৩টি সাপ্লাই ক্রেট (Supply Crates)
    scene.supplyCrate1 = new SupplyCrate(scene, width * 0.2, height * 0.71);
    scene.supplyCrate2 = new SupplyCrate(scene, width * 0.5, height * 0.30);
    scene.supplyCrate3 = new SupplyCrate(scene, width * 0.8, height * 0.71);
    scene.crates = [scene.supplyCrate1, scene.supplyCrate2, scene.supplyCrate3];
    scene.supplyCrates = scene.crates;
}