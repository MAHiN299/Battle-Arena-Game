package battle_arena_api.dto;

public class FriendRequestDto {
    private Long friendshipId;
    private String username;

    public FriendRequestDto(Long friendshipId, String username) {
        this.friendshipId = friendshipId;
        this.username = username;
    }

    public Long getFriendshipId() { return friendshipId; }
    public String getUsername() { return username; }
}