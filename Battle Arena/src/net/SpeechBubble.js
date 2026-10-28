import Phaser from 'phaser';

// ============================================================
// A message floating above the player who said it, so you can
// read chat without looking away from the fight.
// ============================================================

export default class SpeechBubble
{
    static show(scene, player, text, color = '#ffffff')
    {
        if (!player || !player.active) return;

        // One bubble per player at a time
        if (player.activeBubble) player.activeBubble.destroy();

        const maxWidth = 240;

        const txt = scene.add.text(player.x, player.y - 90, text, {
            fontSize: '15px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: maxWidth - 24 },
            padding: { x: 2, y: 2 }
        }).setOrigin(0.5).setDepth(101);

        const w = Math.min(maxWidth, txt.width + 24);
        const h = txt.height + 16;

        const bg = scene.add.rectangle(player.x, player.y - 90, w, h, 0x0a0a0e, 0.88)
            .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.9)
            .setDepth(100);

        // Little tail pointing at the speaker
        const tail = scene.add.triangle(
            player.x, player.y - 90 + h / 2 + 5,
            0, 0, 12, 0, 6, 9,
            0x0a0a0e, 0.88
        ).setOrigin(0.5, 0).setDepth(100);

        const group = { bg, txt, tail, player };

        // Pop in
        [bg, txt, tail].forEach(o => o.setScale(0.6).setAlpha(0));

        scene.tweens.add({
            targets: [bg, txt, tail],
            scale: 1, alpha: 1,
            duration: 200, ease: 'Back.Out'
        });

        // Follow the player
        const follow = scene.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => {
                if (!player.active) { destroy(); return; }

                const y = player.y - 90;
                bg.setPosition(player.x, y);
                txt.setPosition(player.x, y);
                tail.setPosition(player.x, y + h / 2 + 5);
            }
        });

        const destroy = () => {
            follow.remove();
            bg.destroy();
            txt.destroy();
            tail.destroy();
            if (player.activeBubble === group) player.activeBubble = null;
        };

        group.destroy = destroy;
        player.activeBubble = group;

        // Fade out
        scene.time.delayedCall(3200, () => {
            if (!bg.active) return;

            scene.tweens.add({
                targets: [bg, txt, tail],
                alpha: 0, y: '-=16',
                duration: 400,
                onComplete: destroy
            });
        });

        return group;
    }
}