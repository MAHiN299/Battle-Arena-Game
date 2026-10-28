package battle_arena_api.dto;

public class LeaderboardEntryDto {

    private String username;
    private int wavesReached;
    private int durationSec;
    private int enemiesKilled;
    private boolean victory;
    private boolean coOp;

    public LeaderboardEntryDto(String username, int wavesReached, int durationSec,
                               int enemiesKilled, boolean victory, boolean coOp) {
        this.username = username;
        this.wavesReached = wavesReached;
        this.durationSec = durationSec;
        this.enemiesKilled = enemiesKilled;
        this.victory = victory;
        this.coOp = coOp;
    }

    public String getUsername() { return username; }
    public int getWavesReached() { return wavesReached; }
    public int getDurationSec() { return durationSec; }
    public int getEnemiesKilled() { return enemiesKilled; }
    public boolean isVictory() { return victory; }
    public boolean isCoOp() { return coOp; }
}