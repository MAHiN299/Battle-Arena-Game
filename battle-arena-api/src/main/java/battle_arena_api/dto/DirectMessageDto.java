package battle_arena_api.dto;

import java.time.LocalDateTime;

public class DirectMessageDto {
    private Long id;
    private String fromUsername;
    private String toUsername;
    private String text;
    private LocalDateTime createdAt;

    public DirectMessageDto(Long id, String fromUsername, String toUsername, String text, LocalDateTime createdAt) {
        this.id = id;
        this.fromUsername = fromUsername;
        this.toUsername = toUsername;
        this.text = text;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public String getFromUsername() { return fromUsername; }
    public String getToUsername() { return toUsername; }
    public String getText() { return text; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}