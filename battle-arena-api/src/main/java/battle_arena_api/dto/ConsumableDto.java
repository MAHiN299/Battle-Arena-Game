package battle_arena_api.dto;

// New: one row of the Shop's Supplies tab — a consumable's catalog
// info plus how many the player currently owns.
public class ConsumableDto {
    private String code;
    private String displayName;
    private int buyPrice;
    private int sellPrice;
    private int maxStack;
    private int owned;

    public ConsumableDto(String code, String displayName, int buyPrice, int sellPrice, int maxStack, int owned) {
        this.code = code;
        this.displayName = displayName;
        this.buyPrice = buyPrice;
        this.sellPrice = sellPrice;
        this.maxStack = maxStack;
        this.owned = owned;
    }

    public String getCode() { return code; }
    public String getDisplayName() { return displayName; }
    public int getBuyPrice() { return buyPrice; }
    public int getSellPrice() { return sellPrice; }
    public int getMaxStack() { return maxStack; }
    public int getOwned() { return owned; }
}