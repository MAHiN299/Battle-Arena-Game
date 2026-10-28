package battle_arena_api.dto;

public class MapDto {

    private String code;
    private String name;
    private String bgKey;
    private int unlockCost;
    private boolean locked;
    private boolean available;

    public MapDto(String code, String name, String bgKey,
                  int unlockCost, boolean locked, boolean available) {
        this.code = code;
        this.name = name;
        this.bgKey = bgKey;
        this.unlockCost = unlockCost;
        this.locked = locked;
        this.available = available;
    }

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getBgKey() { return bgKey; }
    public int getUnlockCost() { return unlockCost; }
    public boolean isLocked() { return locked; }
    public boolean isAvailable() { return available; }
}