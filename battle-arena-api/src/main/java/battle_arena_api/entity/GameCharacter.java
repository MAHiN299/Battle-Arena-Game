package battle_arena_api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "characters")
public class GameCharacter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(name = "display_name", nullable = false, length = 60)
    private String displayName;

    @Column(name = "ability_text", length = 100)
    private String abilityText;

    @Column(name = "icon_key", length = 60)
    private String iconKey;

    @Column(name = "large_img_key", length = 60)
    private String largeImgKey;

    @Column(name = "unlock_cost", nullable = false)
    private int unlockCost;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getAbilityText() { return abilityText; }
    public void setAbilityText(String abilityText) { this.abilityText = abilityText; }
    public String getIconKey() { return iconKey; }
    public void setIconKey(String iconKey) { this.iconKey = iconKey; }
    public String getLargeImgKey() { return largeImgKey; }
    public void setLargeImgKey(String largeImgKey) { this.largeImgKey = largeImgKey; }
    public int getUnlockCost() { return unlockCost; }
    public void setUnlockCost(int unlockCost) { this.unlockCost = unlockCost; }
    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean aDefault) { isDefault = aDefault; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}