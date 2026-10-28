package battle_arena_api.dto;

// New: real lifetime totals across ALL of a player's matches (not just
// the last 10 kept in match history). Used by the Profile screen's
// Statistics stat-stack so those numbers are genuine totals, not just
// a count of the recently-fetched history rows.
public class PlayerStatsDto {
    private long totalMatches;
    private long totalVictories;
    private long totalKills;
    private long totalCoinsEarned;
    private int bestWave;
    private int winRatePercent;

    public PlayerStatsDto(long totalMatches, long totalVictories, long totalKills,
                           long totalCoinsEarned, int bestWave, int winRatePercent) {
        this.totalMatches = totalMatches;
        this.totalVictories = totalVictories;
        this.totalKills = totalKills;
        this.totalCoinsEarned = totalCoinsEarned;
        this.bestWave = bestWave;
        this.winRatePercent = winRatePercent;
    }

    public long getTotalMatches() { return totalMatches; }
    public long getTotalVictories() { return totalVictories; }
    public long getTotalKills() { return totalKills; }
    public long getTotalCoinsEarned() { return totalCoinsEarned; }
    public int getBestWave() { return bestWave; }
    public int getWinRatePercent() { return winRatePercent; }
}