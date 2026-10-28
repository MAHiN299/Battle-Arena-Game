package battle_arena_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "player_unlocks",
    uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "item_type", "item_code"})
)
public class PlayerUnlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column(name = "item_type", nullable = false, length = 20)
    private String itemType;

    @Column(name = "item_code", nullable = false, length = 40)
    private String itemCode;

    @Column(name = "unlocked_at", nullable = false)
    private LocalDateTime unlockedAt = LocalDateTime.now();

    public PlayerUnlock() {}

    public PlayerUnlock(Long playerId, String itemType, String itemCode) {
        this.playerId = playerId;
        this.itemType = itemType;
        this.itemCode = itemCode;
    }

    public Long getId() { return id; }
    public Long getPlayerId() { return playerId; }
    public String getItemType() { return itemType; }
    public String getItemCode() { return itemCode; }
}