package battle_arena_api.service;

import java.util.List;
import java.util.function.BiPredicate;

// ============================================================
// Every achievement is defined once here: a code, display text,
// and a condition checked against the just-completed match plus
// the player's lifetime match count. Scoped strictly to stats
// already recorded — nothing here needs new tracking.
// ============================================================
public class AchievementCatalog {

    public static class Definition {
        public final String code;
        public final String name;
        public final String description;
        public final BiPredicate<MatchContext, Long> condition;

        public Definition(String code, String name, String description,
                          BiPredicate<MatchContext, Long> condition) {
            this.code = code;
            this.name = name;
            this.description = description;
            this.condition = condition;
        }
    }

    // Snapshot of the match just submitted, passed to each condition
    public static class MatchContext {
        public int wavesReached;
        public int enemiesKilled;
        public int coinsEarned;
        public boolean wasMvp;
    }

    public static final List<Definition> ALL = List.of(

        new Definition("FIRST_BLOOD", "First Blood", "Get your first kill",
            (m, lifetime) -> m.enemiesKilled >= 1),

        new Definition("SURVIVOR", "Survivor", "Reach wave 10 in a single run",
            (m, lifetime) -> m.wavesReached >= 10),

        new Definition("UNSTOPPABLE", "Unstoppable", "Reach wave 20 in a single run",
            (m, lifetime) -> m.wavesReached >= 20),

        new Definition("EXTERMINATOR", "Exterminator", "Kill 50 enemies in one run",
            (m, lifetime) -> m.enemiesKilled >= 50),

        new Definition("BIG_HAUL", "Big Haul", "Earn 500 coins in a single run",
            (m, lifetime) -> m.coinsEarned >= 500),

        new Definition("TEAM_PLAYER", "Team Player", "Be crowned MVP in co-op",
            (m, lifetime) -> m.wasMvp),

        new Definition("VETERAN", "Veteran", "Play 10 matches",
            (m, lifetime) -> lifetime >= 10)
    );
}