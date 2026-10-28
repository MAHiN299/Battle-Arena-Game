package battle_arena_api.dto;

import java.util.ArrayList;
import java.util.List;

public class MatchResultResponse {

    private boolean success;
    private int coinsBanked;
    private int newBalance;
    private String message;
    private List<AchievementDto> newAchievements = new ArrayList<>();

    // New: leveling feedback for this match — xpGained is just this
    // match's award, level/totalXp are the player's new state after it,
    // leveledUp flags whether this match crossed a level threshold (so
    // the client only shows a "Level Up!" moment when one actually happened).
    private int xpGained = 0;
    private long totalXp = 0;
    private int level = 1;
    private boolean leveledUp = false;

    public MatchResultResponse(boolean success, int coinsBanked, int newBalance, String message) {
        this.success = success;
        this.coinsBanked = coinsBanked;
        this.newBalance = newBalance;
        this.message = message;
        this.newAchievements = new ArrayList<>();
    }

    public MatchResultResponse(boolean success, int coinsBanked, int newBalance, String message, List<AchievementDto> newAchievements) {
        this.success = success;
        this.coinsBanked = coinsBanked;
        this.newBalance = newBalance;
        this.message = message;
        this.newAchievements = newAchievements != null ? newAchievements : new ArrayList<>();
    }

    public boolean isSuccess() { return success; }
    public int getCoinsBanked() { return coinsBanked; }
    public int getNewBalance() { return newBalance; }
    public String getMessage() { return message; }

    public List<AchievementDto> getNewAchievements() { return newAchievements; }
    public void setNewAchievements(List<AchievementDto> newAchievements) { this.newAchievements = newAchievements; }

    public int getXpGained() { return xpGained; }
    public void setXpGained(int xpGained) { this.xpGained = xpGained; }

    public long getTotalXp() { return totalXp; }
    public void setTotalXp(long totalXp) { this.totalXp = totalXp; }

    public int getLevel() { return level; }
    public void setLevel(int level) { this.level = level; }

    public boolean isLeveledUp() { return leveledUp; }
    public void setLeveledUp(boolean leveledUp) { this.leveledUp = leveledUp; }
}