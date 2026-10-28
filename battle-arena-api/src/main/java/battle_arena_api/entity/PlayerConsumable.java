package battle_arena_api.entity;

import jakarta.persistence.*;

// New: a stackable, persistent inventory row for one consumable item
// (Ammo Pack / Grenade / Health Kit) owned by one player. Separate from
// PlayerUnlock on purpose — PlayerUnlock models a one-time boolean
// "owned/not owned" unlock (characters, maps, achievements), while a
// consumable needs a genuine quantity that goes up (buy) and down
// (sell, or use during a boss fight).
@Entity
@Table(
    name = "player_consumables",
    uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "item_code"})
)
public class PlayerConsumable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column(name = "item_code", nullable = false, length = 20)
    private String itemCode;

    @Column(nullable = false)
    private int quantity = 0;

    public PlayerConsumable() {}

    public PlayerConsumable(Long playerId, String itemCode, int quantity) {
        this.playerId = playerId;
        this.itemCode = itemCode;
        this.quantity = quantity;
    }

    public Long getId() { return id; }
    public Long getPlayerId() { return playerId; }
    public String getItemCode() { return itemCode; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
}