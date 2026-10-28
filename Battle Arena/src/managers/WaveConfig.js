
// New File

// ============================================================
// WAVE CONFIGURATION
//
// Enemy has 100 HP. A bullet does 25 at point blank, 5 at range.
// So a kill costs 4 bullets up close, up to 20 at distance.
// The ammo refund is tuned against that: fight close, stay supplied.
// ============================================================

export const WAVES = [
    { total: 5,  bombers: 0, spawnDelay: 2200, boss: false },
    { total: 6,  bombers: 0, spawnDelay: 2000, boss: false },
    { total: 8,  bombers: 1, spawnDelay: 1900, boss: false },
    { total: 10, bombers: 2, spawnDelay: 1800, boss: false },
    { total: 13, bombers: 3, spawnDelay: 1600, boss: false },
    { total: 16, bombers: 3, spawnDelay: 1500, boss: false },
    { total: 20, bombers: 4, spawnDelay: 1400, boss: false },
    { total: 24, bombers: 5, spawnDelay: 1300, boss: false },
    { total: 28, bombers: 5, spawnDelay: 1200, boss: false },
    { total: 35, bombers: 6, spawnDelay: 1100, boss: true, bossReinforceMs: 6000 }
];

export const WAVE_SETTINGS = {
    BREATHER_MS:      6000,   // gap between waves, shown as a countdown
    BANNER_MS:        2000,
    MAX_ALIVE:        16,     // per player; doubles in co-op
    FIRST_WAVE_DELAY: 4000,

    // Two-player scaling. 1.6 rather than 2.0 so late waves stay playable.
    COOP_MULTIPLIER:  1.6
};

// ============================================================
// AMMO ECONOMY
// ============================================================
export const AMMO = {
    RESERVE_MAX:      200,
    RESERVE_START:    120,
    MAG_SIZE:         30,

    // Base refund per kill
    KILL_REFUND:      8,
    BOMBER_REFUND:    15,
    BOSS_REFUND:      60,

    // Bonus for killing efficiently. Under this many hits and you
    // get the extra, which rewards fighting at close range.
    EFFICIENT_HITS:   5,
    EFFICIENT_BONUS:  6,

    // Melee kills cost no ammo, so they pay more
    MELEE_BONUS:      5,

    // Grenades
    GRENADE_START:    3,
    GRENADE_MAX:      5,
    GRENADE_DROP_CHANCE: 0.12,   // per kill
    BOMBER_GRENADE_CHANCE: 0.30  // bombers drop them more often
};

// Enemy scaling per wave
export function waveScaling(waveNumber) {
    return {
        hpMult:     1 + (waveNumber - 1) * 0.10,
        damageMult: 1 + (waveNumber - 1) * 0.06,
        speedMult:  1 + (waveNumber - 1) * 0.03
    };
}

// Enemy count for a wave, adjusted for player count
export function waveCount(waveNumber, playerCount) {
    const cfg = WAVES[waveNumber - 1];
    if (!cfg) return { total: 0, bombers: 0 };

    const mult = playerCount > 1 ? WAVE_SETTINGS.COOP_MULTIPLIER : 1;

    return {
        total:   Math.round(cfg.total * mult),
        bombers: Math.round(cfg.bombers * mult),
        spawnDelay: cfg.spawnDelay,
        boss: cfg.boss,
        bossReinforceMs: cfg.bossReinforceMs
    };
}

// ============================================================
// ESTIMATED WAVE DURATION
//
// Used for the threat bar and the between-wave countdown.
// Spawn time is known exactly; kill time is an estimate based on
// how long a competent player takes to clear one enemy.
// ============================================================
export const TIMING = {
    SECONDS_PER_KILL: 3.5,     // average, single player
    COOP_KILL_FACTOR: 0.6      // two players clear faster than 1x each
};

export function estimateWaveSeconds(waveNumber, playerCount) {
    const cfg = waveCount(waveNumber, playerCount);

    // Time for every enemy to have spawned
    const spawnSeconds = (cfg.total * cfg.spawnDelay) / 1000;

    // Time to kill them all
    const killRate = playerCount > 1
        ? TIMING.SECONDS_PER_KILL * TIMING.COOP_KILL_FACTOR
        : TIMING.SECONDS_PER_KILL;

    const killSeconds = cfg.total * killRate;

    // The two overlap: you kill while others spawn.
    // Whichever takes longer dominates, plus a margin.
    return Math.round(Math.max(spawnSeconds, killSeconds) * 1.15);
}