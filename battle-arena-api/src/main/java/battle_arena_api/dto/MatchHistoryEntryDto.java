package battle_arena_api.dto;

public class MatchHistoryEntryDto {

    // New: the match's own id, so the client can ask for its replay
    // (GET /api/match/{id}/replay) without exposing the replay's full
    // (possibly large) JSON blob in every history row.
    private Long id;
    private String mapCode;
    private int wavesReached;
    private int enemiesKilled;
    private int coinsEarned;
    private int durationSec;
    private boolean victory;
    private boolean coOp;
    private boolean wasMvp;
    private String playedAt;
    // New: whether this match has a saved "final moments" replay
    private boolean hasReplay;

    public MatchHistoryEntryDto(Long id, String mapCode, int wavesReached, int enemiesKilled,
                                int coinsEarned, int durationSec, boolean victory,
                                boolean coOp, boolean wasMvp, String playedAt, boolean hasReplay) {
        this.id = id;
        this.mapCode = mapCode;
        this.wavesReached = wavesReached;
        this.enemiesKilled = enemiesKilled;
        this.coinsEarned = coinsEarned;
        this.durationSec = durationSec;
        this.victory = victory;
        this.coOp = coOp;
        this.wasMvp = wasMvp;
        this.playedAt = playedAt;
        this.hasReplay = hasReplay;
    }

    public Long getId() { return id; }
    public String getMapCode() { return mapCode; }
    public int getWavesReached() { return wavesReached; }
    public int getEnemiesKilled() { return enemiesKilled; }
    public int getCoinsEarned() { return coinsEarned; }
    public int getDurationSec() { return durationSec; }
    public boolean isVictory() { return victory; }
    public boolean isCoOp() { return coOp; }
    public boolean isWasMvp() { return wasMvp; }
    public String getPlayedAt() { return playedAt; }
    public boolean isHasReplay() { return hasReplay; }
}