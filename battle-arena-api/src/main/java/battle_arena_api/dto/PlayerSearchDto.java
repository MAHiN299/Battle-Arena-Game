package battle_arena_api.dto;

// New: one row of a friend-search result. "relation" tells the client
// which button to show next to this name — Add, Pending, or already Friends.
public class PlayerSearchDto {

    private final String username;
    private final String relation; // "none" | "pending_outgoing" | "pending_incoming" | "friends"

    public PlayerSearchDto(String username, String relation) {
        this.username = username;
        this.relation = relation;
    }

    public String getUsername() { return username; }
    public String getRelation() { return relation; }
}