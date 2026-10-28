package battle_arena_api.dto;

public class AchievementDto {
    private String code;
    private String name;
    private String description;
    private boolean unlocked;

    public AchievementDto(String code, String name, String description, boolean unlocked) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.unlocked = unlocked;
    }

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public boolean isUnlocked() { return unlocked; }
}