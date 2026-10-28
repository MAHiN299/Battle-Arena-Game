package battle_arena_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "message_read_state", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"viewer_id", "other_id"})
})
public class MessageReadState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "viewer_id", nullable = false)
    private Long viewerId;

    @Column(name = "other_id", nullable = false)
    private Long otherId;

    @Column(name = "last_read_at", nullable = false)
    private LocalDateTime lastReadAt;

    public Long getId() { return id; }
    public Long getViewerId() { return viewerId; }
    public void setViewerId(Long viewerId) { this.viewerId = viewerId; }
    public Long getOtherId() { return otherId; }
    public void setOtherId(Long otherId) { this.otherId = otherId; }
    public LocalDateTime getLastReadAt() { return lastReadAt; }
    public void setLastReadAt(LocalDateTime lastReadAt) { this.lastReadAt = lastReadAt; }
}