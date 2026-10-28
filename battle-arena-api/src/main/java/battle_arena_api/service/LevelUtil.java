package battle_arena_api.service;

// ============================================================
// LEVEL PROGRESSION
//
// Cosmetic-only leveling: a player's level is derived from their
// lifetime XP total (never stored directly), using a simple
// triangular curve so each level costs a bit more than the last.
//
// cumulativeXp(level) = 50 * level * (level - 1)
//   level 1 ->     0 xp
//   level 2 ->   100 xp
//   level 3 ->   300 xp
//   level 4 ->   600 xp
//   level 5 ->  1000 xp
//   level 10 -> 4500 xp
//   level 20 -> 19000 xp
// ============================================================
public final class LevelUtil {

    private LevelUtil() {}

    public static long cumulativeXpForLevel(int level) {
        long l = level;
        return 50L * l * (l - 1);
    }

    public static int levelForXp(long xp) {
        if (xp < 0) xp = 0;

        // Closed-form estimate from solving 50*L*(L-1) <= xp for L,
        // then nudged to the exact level to guard against float error
        // right at a threshold.
        double estimate = (50.0 + Math.sqrt(2500.0 + 200.0 * xp)) / 100.0;
        int level = Math.max(1, (int) Math.floor(estimate));

        while (cumulativeXpForLevel(level + 1) <= xp) level++;
        while (level > 1 && cumulativeXpForLevel(level) > xp) level--;

        return level;
    }

    public static long xpIntoCurrentLevel(long xp) {
        int level = levelForXp(xp);
        return xp - cumulativeXpForLevel(level);
    }

    public static long xpSpanOfCurrentLevel(long xp) {
        int level = levelForXp(xp);
        return cumulativeXpForLevel(level + 1) - cumulativeXpForLevel(level);
    }
}