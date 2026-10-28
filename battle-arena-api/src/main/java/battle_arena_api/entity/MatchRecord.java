package battle_arena_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "matches")
public class MatchRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column(name = "map_code", length = 40)
    private String mapCode;

    @Column(name = "waves_reached", nullable = false)
    private int wavesReached;

    @Column(name = "enemies_killed", nullable = false)
    private int enemiesKilled;

    @Column(name = "coins_earned", nullable = false)
    private int coinsEarned;

    @Column(name = "duration_sec", nullable = false)
    private int durationSec;

    @Column(name = "co_op", nullable = false)
    private boolean coOp;

    @Column(nullable = false)
    private boolean victory;

    @Column(name = "was_mvp", nullable = false)
    private boolean wasMvp = false;

    @Column(name = "played_at", nullable = false)
    private LocalDateTime playedAt = LocalDateTime.now();

    // New: a short "final moments" replay — JSON-encoded {mapCode, frames}
    // of position/animation snapshots (players AND enemies) from the last
    // few seconds of the match. Nullable — older matches, and any match
    // the client didn't attach one to, simply have no replay to show.
    // LONGTEXT rather than plain TEXT: TEXT caps at ~64KB in MySQL, and
    // now that enemies are recorded too (not just the 1-2 players), a
    // packed boss fight with a full wave of enemies alive can approach or
    // exceed that, which would silently truncate or fail to save.
    @Lob
    @Column(name = "replay_data", columnDefinition = "LONGTEXT")
    private String replayData;

    // Getters and Setters

    public Long getId() { return id; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }

    public String getMapCode() { return mapCode; }
    public void setMapCode(String mapCode) { this.mapCode = mapCode; }

    public int getWavesReached() { return wavesReached; }
    public void setWavesReached(int wavesReached) { this.wavesReached = wavesReached; }

    public int getEnemiesKilled() { return enemiesKilled; }
    public void setEnemiesKilled(int enemiesKilled) { this.enemiesKilled = enemiesKilled; }

    public int getCoinsEarned() { return coinsEarned; }
    public void setCoinsEarned(int coinsEarned) { this.coinsEarned = coinsEarned; }

    public int getDurationSec() { return durationSec; }
    public void setDurationSec(int durationSec) { this.durationSec = durationSec; }

    public boolean isCoOp() { return coOp; }
    public void setCoOp(boolean coOp) { this.coOp = coOp; }

    public boolean isVictory() { return victory; }
    public void setVictory(boolean victory) { this.victory = victory; }

    public boolean isWasMvp() { return wasMvp; }
    public void setWasMvp(boolean wasMvp) { this.wasMvp = wasMvp; }

    public LocalDateTime getPlayedAt() { return playedAt; }
    public void setPlayedAt(LocalDateTime playedAt) { this.playedAt = playedAt; }

    public String getReplayData() { return replayData; }
    public void setReplayData(String replayData) { this.replayData = replayData; }
}