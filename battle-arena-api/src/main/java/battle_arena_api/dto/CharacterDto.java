package battle_arena_api.dto;

public class CharacterDto {

    private String code;
    private String name;
    private String ability;
    private String icon;
    private String largeImg;
    private int unlockCost;
    private boolean locked;
    private boolean playable;

    public CharacterDto(String code, String name, String ability,
                        String icon, String largeImg,
                        int unlockCost, boolean locked, boolean playable) {
        this.code = code;
        this.name = name;
        this.ability = ability;
        this.icon = icon;
        this.largeImg = largeImg;
        this.unlockCost = unlockCost;
        this.locked = locked;
        this.playable = playable;
    }

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getAbility() { return ability; }
    public String getIcon() { return icon; }
    public String getLargeImg() { return largeImg; }
    public int getUnlockCost() { return unlockCost; }
    public boolean isLocked() { return locked; }
    public boolean isPlayable() { return playable; }
}