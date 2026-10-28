// ============================================================
// Thin, safe wrapper around scene.sound.play(). Every call is
// guarded — if a sound key hasn't been loaded yet (asset not
// added), it fails silently instead of crashing the game. This
// lets sound be added incrementally: wire the call now, drop
// the actual audio file in whenever it's ready.
// ============================================================

const DEFAULT_VOLUME = {
    hit:            0.35,
    enemyDeath:     0.4,
    kill:           0.45,
    pickup:         0.3,
    coin:           0.25,
    achievement:    0.6,
    mvp:            0.6,
    waveBanner:     0.5,
    victory:        0.7,
    defeat:         0.6,
    buttonHover:    0.15,
    buttonClick:    0.25,
    chatMessage:    0.3,
    bombPlant:      0.4,
    bombDefuse:     0.55,
    tdmScore:       0.5
};

export function playSfx(scene, key, overrides = {}) {
    if (!scene || !scene.sound) return;

    try {
        if (!scene.cache.audio.exists(key)) return;   // not loaded yet — silent, not an error

        scene.sound.play(key, {
            volume: DEFAULT_VOLUME[key] ?? 0.4,
            ...overrides
        });
    } catch (e) { /* never let a missing/broken sound break gameplay */ }
}