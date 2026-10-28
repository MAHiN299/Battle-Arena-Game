package battle_arena_api.dto;

public class MatchResultRequest {

    private int coinsEarned;
    private int wavesReached;
    private int enemiesKilled;
    private int durationSec;
    private String mapCode;
    private boolean coOp;
    private boolean victory;
    private boolean wasMvp;

    // New: optional JSON-encoded "final moments" replay buffer from the
    // client's rolling killcam recorder — null/omitted means no replay
    // was captured for this match (e.g. an older client build).
    private String replaySnapshot;

    public int getCoinsEarned() { return coinsEarned; }
    public void setCoinsEarned(int coinsEarned) { this.coinsEarned = coinsEarned; }

    public int getWavesReached() { return wavesReached; }
    public void setWavesReached(int wavesReached) { this.wavesReached = wavesReached; }

    public int getEnemiesKilled() { return enemiesKilled; }
    public void setEnemiesKilled(int enemiesKilled) { this.enemiesKilled = enemiesKilled; }

    public int getDurationSec() { return durationSec; }
    public void setDurationSec(int durationSec) { this.durationSec = durationSec; }

    public String getMapCode() { return mapCode; }
    public void setMapCode(String mapCode) { this.mapCode = mapCode; }

    public boolean isCoOp() { return coOp; }
    public void setCoOp(boolean coOp) { this.coOp = coOp; }

    public boolean isVictory() { return victory; }
    public void setVictory(boolean victory) { this.victory = victory; }

    public boolean isWasMvp() { return wasMvp; }
    public void setWasMvp(boolean wasMvp) { this.wasMvp = wasMvp; }

    public String getReplaySnapshot() { return replaySnapshot; }
    public void setReplaySnapshot(String replaySnapshot) { this.replaySnapshot = replaySnapshot; }
}