import { THEME } from '../managers/Theme';

// ============================================================
// Shared Phaser-canvas UI kit — one panel shape, one button shape,
// one spacing scale, used by every non-DOM screen (HUD, Character
// Select, Game Over, Leaderboard, Wave Shop, TDM). Before this, each
// screen picked its own corner radius (8/10/12/14/16/18px), its own
// panel opacity (0.32–0.75), and its own button size — which is what
// made the set feel inconsistent/unpolished even though each screen
// looked fine in isolation. Pulling those choices into one place
// means every panel and every button now matches exactly, everywhere.
// ============================================================

export function hexToInt(hex) {
    return parseInt(String(hex).replace('#', ''), 16);
}

export const COLOR = {
    gold:     hexToInt(THEME.gold),
    white:    hexToInt(THEME.white),
    grey:     hexToInt(THEME.grey),
    dimGrey:  hexToInt(THEME.dimGrey),
    good:     hexToInt(THEME.good),
    bad:      hexToInt(THEME.bad),
    warn:     hexToInt(THEME.warn),
    red:      hexToInt(THEME.red),
    blue:     hexToInt(THEME.blue),
    black:    0x000000,
    panelBg:  0x0a0a0e,
    torii:    0xff3b3b
};

export const FONT = THEME.font;

// One spacing scale. Panel padding, gaps between clusters, and margins
// around text all pick from this list instead of ad hoc pixel values.
export const SPACE = { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 };

// One corner radius per "kind" of shape — small for buttons/chips,
// medium for cards, large for full modals.
export const RADIUS = { sm: 10, md: 14, lg: 18 };

export const PANEL_ALPHA = { fill: 0.42, stroke: 0.5 };

// One button size used on every screen (Game Over, Leaderboard, TDM
// results, etc.) — previously each screen had its own (160×50,
// 170×54, 190×46, 200×50), which is a big part of why the set read
// as inconsistent.
export const BUTTON = { w: 190, h: 52, radius: RADIUS.sm, fontSize: '20px' };

// A soft, blurred-looking glow blob — several concentric circles that
// get smaller and more opaque toward the center, since Phaser's canvas
// Graphics has no real blur filter. Used as ambient background
// decoration (Game Over, Leaderboard) so a plain dark screen reads as
// lit rather than flat, without drawing any kind of bordered panel.
export function drawGlowBlob(scene, x, y, radius, color, opts = {}) {
    const layers = opts.layers ?? 6;
    const maxAlpha = opts.alpha ?? 0.3;
    const g = scene.add.graphics().setPosition(x, y);
    for (let i = layers; i >= 1; i--) {
        const t = i / layers;
        g.fillStyle(color, maxAlpha * (1 - t) + maxAlpha / layers);
        g.fillCircle(0, 0, radius * t);
    }
    if (opts.depth !== undefined) g.setDepth(opts.depth);
    return g;
}

// Small L-shaped "targeting" brackets at each corner of a rounded
// rect, offset onto the flat edges so they never cross the curve.
// This is what replaces the old flat single-line border everywhere:
// a HUD frame reads its edges from these corner marks rather than a
// uniform outline, which is the "premium" cue this kit was missing.
// `left`/`top` are in whatever local coordinate space the caller's
// Graphics object is already using, so this works both for a
// centered panel (left = -w/2) and an origin-based one (left = the
// panel's actual left edge).
export function strokeCornerBrackets(g, left, top, w, h, radius, color, alpha, legLen = 16) {
    const bl = Math.min(legLen, w / 2 - radius, h / 2 - radius);
    if (bl <= 0) return;
    g.lineStyle(2, color, alpha);
    const corners = [
        [left,     top,     1,  1],
        [left + w, top,    -1,  1],
        [left,     top + h, 1, -1],
        [left + w, top + h,-1, -1]
    ];
    corners.forEach(([cx, cy, sx, sy]) => {
        g.beginPath();
        g.moveTo(cx + sx * radius, cy);
        g.lineTo(cx + sx * radius + sx * bl, cy);
        g.strokePath();
        g.beginPath();
        g.moveTo(cx, cy + sy * radius);
        g.lineTo(cx, cy + sy * radius + sy * bl);
        g.strokePath();
    });
}

// Dark-glass rounded panel behind a content cluster. Give it the
// cluster's own content size (not including margin) and it pads
// outward by `pad` on every side — so panels always breathe the same
// amount no matter which screen draws them.
//
// `opts.border` (default true) picks the edge treatment: the
// glow-ring + hairline + corner-bracket "lit fixture" look used on
// Character Select, or (pass `border: false`) a plain fill with no
// outline at all, used everywhere in-game and on the end-of-match
// screens, which asked to drop the border entirely rather than tone
// it down.
// Drawn in LOCAL coords (the Graphics object is positioned at
// centerX/centerY) rather than absolute world coords — so if the
// caller later scales or tweens the returned object, it scales around
// its own center instead of jumping toward the world origin.
export function drawPanel(scene, centerX, centerY, contentW, contentH, accentColor, opts = {}) {
    const pad         = opts.pad ?? SPACE.lg;
    const radius       = opts.radius ?? RADIUS.md;
    const fillAlpha    = opts.fillAlpha ?? PANEL_ALPHA.fill;
    const strokeAlpha  = opts.strokeAlpha ?? PANEL_ALPHA.stroke;
    const depth        = opts.depth;
    const border       = opts.border ?? true;

    const w = contentW + pad * 2;
    const h = contentH + pad * 2;
    const left = -w / 2, top = -h / 2;

    const g = scene.add.graphics().setPosition(centerX, centerY);

    if (border) {
        // Soft outer glow — a few progressively larger, fainter rings
        // instead of one flat outline, so the edge reads as gently lit.
        for (let i = 3; i >= 1; i--) {
            g.lineStyle(1, accentColor, Math.min(1, strokeAlpha * 0.22 * i));
            g.strokeRoundedRect(left - i * 1.5, top - i * 1.5, w + i * 3, h + i * 3, radius + i * 1.5);
        }
    }

    // Fill — a faint top-lit gradient rather than one flat tone
    // (falls back to a flat fill of the first color on non-WebGL
    // renderers, which still looks correct, just without the lift).
    g.fillGradientStyle(0x1c1c22, 0x1c1c22, COLOR.panelBg, COLOR.panelBg, fillAlpha, fillAlpha, fillAlpha, fillAlpha);
    g.fillRoundedRect(left, top, w, h, radius);

    if (border) {
        // Crisp true-edge hairline
        g.lineStyle(1, accentColor, strokeAlpha);
        g.strokeRoundedRect(left, top, w, h, radius);

        strokeCornerBrackets(g, left, top, w, h, radius, accentColor, Math.min(1, strokeAlpha + 0.35));
    }

    if (depth !== undefined) g.setDepth(depth);
    return g;
}

// A modal/result card — same treatment as drawPanel but with a
// bolder glow/edge and higher fill opacity, for full-screen popups
// (New Record, TDM match result, disconnect) rather than in-scene
// HUD clusters.
// Same local-coords convention as drawPanel (see note above) — a
// modal card is almost always the thing that gets scaled/tweened in.
export function drawCard(scene, centerX, centerY, w, h, accentColor, opts = {}) {
    const radius = opts.radius ?? RADIUS.lg;
    const fillAlpha = opts.fillAlpha ?? 0.75;
    const strokeAlpha = opts.strokeAlpha ?? 0.85;
    const fillColor = opts.fillColor ?? 0x14141a;
    const border = opts.border ?? true;
    const left = -w / 2, top = -h / 2;

    const g = scene.add.graphics().setPosition(centerX, centerY);

    if (border) {
        for (let i = 4; i >= 1; i--) {
            g.lineStyle(1, accentColor, Math.min(1, strokeAlpha * 0.18 * i));
            g.strokeRoundedRect(left - i * 2, top - i * 2, w + i * 4, h + i * 4, radius + i * 2);
        }
    }

    g.fillGradientStyle(0x22222a, 0x22222a, fillColor, fillColor, fillAlpha, fillAlpha, fillAlpha, fillAlpha);
    g.fillRoundedRect(left, top, w, h, radius);

    if (border) {
        g.lineStyle(2, accentColor, strokeAlpha);
        g.strokeRoundedRect(left, top, w, h, radius);

        strokeCornerBrackets(g, left, top, w, h, radius, accentColor, Math.min(1, strokeAlpha + 0.15), 20);
    }

    if (opts.depth !== undefined) g.setDepth(opts.depth);
    return g;
}

// One button, one shape, everywhere. Returns {frame, hitArea, text}
// — destroy all three to remove it. `colorHex` is a "#rrggbb" string
// (used directly as the text fill); the frame accent is derived from
// it automatically.
export function makeButton(scene, { x, y, w = BUTTON.w, h = BUTTON.h, label, colorHex, fontSize = BUTTON.fontSize, onClick, depth }) {
    const accent = hexToInt(colorHex);

    const frame = scene.add.graphics().setPosition(x, y);
    if (depth !== undefined) frame.setDepth(depth);

    const draw = (hover) => {
        frame.clear();
        frame.fillStyle(0x0f0f13, 0.6);
        frame.fillRoundedRect(-w / 2, -h / 2, w, h, BUTTON.radius);
        frame.lineStyle(hover ? 2 : 1, accent, hover ? 0.9 : 0.45);
        frame.strokeRoundedRect(-w / 2, -h / 2, w, h, BUTTON.radius);
    };
    draw(false);

    const hitArea = scene.add.rectangle(x, y, w, h, 0x000000, 0.001)
        .setInteractive({ cursor: 'pointer' });
    if (depth !== undefined) hitArea.setDepth(depth);

    const text = scene.add.text(x, y, label, {
        fontFamily: FONT, fontSize, fill: colorHex
    }).setOrigin(0.5);
    if (depth !== undefined) text.setDepth(depth + 1);

    hitArea.on('pointerover', () => {
        draw(true);
        scene.tweens.add({ targets: [frame, text], scale: 1.06, duration: 120 });
    });
    hitArea.on('pointerout', () => {
        draw(false);
        scene.tweens.add({ targets: [frame, text], scale: 1, duration: 120 });
    });
    if (onClick) hitArea.on('pointerdown', onClick);

    return { frame, hitArea, text, redraw: draw };
}

// A torii glyph in the theme's red accent — the one recurring motif
// used next to titles across Menu/Options/HUD/Game Over/Leaderboard.
export function toriiGlyph(scene, x, y, size = '26px') {
    return scene.add.text(x, y, '⛩', { fontSize: size, fill: '#ff3b3b' }).setOrigin(0.5);
}