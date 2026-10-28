package battle_arena_api.dto;

public class FriendDto {
    private Long friendshipId;
    private String username;
    private boolean online;

    public FriendDto(Long friendshipId, String username, boolean online) {
        this.friendshipId = friendshipId;
        this.username = username;
        this.online = online;
    }

    public Long getFriendshipId() { return friendshipId; }
    public String getUsername() { return username; }
    public boolean isOnline() { return online; }
}