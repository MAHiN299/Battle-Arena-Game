// ============================================================
// "Living background" treatment for Game Over / Leaderboard — real
// blurred, slowly drifting color orbs (CSS filter: blur + keyframe
// animation) plus a brightness/saturation lift on the game canvas,
// so a screen reads as lit and alive rather than sitting on flat
// black. Built with actual DOM/CSS rather than canvas Graphics,
// since a flat gradient wasn't enough. Cleans itself up automatically
// when the scene shuts down.
// ============================================================
export function attachAmbientGlow(scene, opts = {}) {
    const canvas = scene.game.canvas;
    const prevFilter = canvas ? (canvas.style.filter || '') : '';

    if (canvas) {
        canvas.style.filter = 'brightness(1.1) saturate(1.3) contrast(1.05)';
    }

    // Default palette (warm gold/red) if the caller doesn't pass one —
    // callers should pass colors matching their own accent (green for
    // a win, red for a defeat, gold for the leaderboard).
    const colors = opts.colors ?? [
        'rgba(255,196,84,.55)',
        'rgba(255,90,90,.4)',
        'rgba(120,170,255,.3)'
    ];

    const specs = [
        { top: '10%', left: '8%',  size: '48vw', dur: '18s', delay: '0s'  },
        { top: '68%', left: '86%', size: '40vw', dur: '22s', delay: '-7s' },
        { top: '82%', left: '20%', size: '32vw', dur: '15s', delay: '-3s' }
    ];

    const el = document.createElement('div');
    el.className = 'ambient-glow';

    specs.forEach((s, i) => {
        const orb = document.createElement('div');
        orb.className = 'ambient-glow-orb';
        orb.style.top = s.top;
        orb.style.left = s.left;
        orb.style.width = s.size;
        orb.style.height = s.size;
        orb.style.setProperty('--c', colors[i % colors.length]);
        orb.style.animationDuration = s.dur;
        orb.style.animationDelay = s.delay;
        el.appendChild(orb);
    });

    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));

    scene.events.once('shutdown', () => {
        el.remove();
        if (canvas) canvas.style.filter = prevFilter;
    });

    return el;
}