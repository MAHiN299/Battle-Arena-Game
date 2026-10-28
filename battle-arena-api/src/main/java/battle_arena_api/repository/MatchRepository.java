package battle_arena_api.repository;

import battle_arena_api.entity.MatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<MatchRecord, Long> {

    List<MatchRecord> findTop10ByPlayerIdOrderByPlayedAtDesc(Long playerId);

    List<MatchRecord> findTop20ByOrderByWavesReachedDescDurationSecAsc();

    Optional<MatchRecord> findTopByPlayerIdOrderByWavesReachedDesc(Long playerId);

    long countByPlayerId(Long playerId);

    // New: lifetime totals for the Profile screen's Statistics section —
    // real aggregates across ALL of a player's matches, not just the
    // last 10 the history list keeps.
    long countByPlayerIdAndVictoryTrue(Long playerId);

    @Query("SELECT COALESCE(SUM(m.enemiesKilled), 0) FROM MatchRecord m WHERE m.playerId = :playerId")
    long sumEnemiesKilledByPlayerId(@Param("playerId") Long playerId);

    @Query("SELECT COALESCE(SUM(m.coinsEarned), 0) FROM MatchRecord m WHERE m.playerId = :playerId")
    long sumCoinsEarnedByPlayerId(@Param("playerId") Long playerId);
}