package battle_arena_api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "maps")
public class GameMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(name = "display_name", nullable = false, length = 60)
    private String displayName;

    @Column(name = "bg_key", length = 60)
    private String bgKey;

    @Column(name = "unlock_cost", nullable = false)
    private int unlockCost;

    @Column(name = "is_available", nullable = false)
    private boolean isAvailable;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getBgKey() { return bgKey; }
    public void setBgKey(String bgKey) { this.bgKey = bgKey; }
    public int getUnlockCost() { return unlockCost; }
    public void setUnlockCost(int unlockCost) { this.unlockCost = unlockCost; }
    public boolean isAvailable() { return isAvailable; }
    public void setAvailable(boolean available) { isAvailable = available; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}