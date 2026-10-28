package battle_arena_api.websocket;

import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class GameRoom {

    public static final int MAX_PLAYERS = 4;

    private final String code;
    private final int maxPlayers;
    private final List<Member> members = new CopyOnWriteArrayList<>();

    private boolean inGame = false;

    public GameRoom(String code) {
        this(code, "coop");
    }

    public GameRoom(String code, String mode) {
        this.code = code;
        this.maxPlayers = "pvp".equalsIgnoreCase(mode) ? 2 : MAX_PLAYERS;
    }

    public String getCode() { return code; }
    public boolean isInGame() { return inGame; }
    public void setInGame(boolean inGame) { this.inGame = inGame; }

    public List<Member> getMembers() { return members; }

    public boolean isFull() { return members.size() >= maxPlayers; }
    public boolean isEmpty() { return members.isEmpty(); }

    public Member add(WebSocketSession session, String username) {
        boolean isHost = members.isEmpty();

        // Alternate teams as players join: 1st+3rd = red, 2nd+4th = blue.
        // A 1v1 room simply never fills the second slot on either side.
        String team = (members.size() % 2 == 0) ? "red" : "blue";

        Member m = new Member(session, username, isHost, team);
        members.add(m);
        return m;
    }

    public void remove(WebSocketSession session) {
        members.removeIf(m -> m.session.getId().equals(session.getId()));

        if (!members.isEmpty() && members.stream().noneMatch(m -> m.isHost)) {
            members.get(0).isHost = true;
        }
    }

    public Member find(WebSocketSession session) {
        return members.stream()
                .filter(m -> m.session.getId().equals(session.getId()))
                .findFirst()
                .orElse(null);
    }

    public Member getHost() {
        return members.stream().filter(m -> m.isHost).findFirst().orElse(null);
    }

    public List<String> memberNames() {
        List<String> names = new ArrayList<>();
        members.forEach(m -> names.add(m.username));
        return names;
    }

    public long countOnTeam(String team) {
        return members.stream().filter(m -> team.equals(m.team)).count();
    }

    // A player can explicitly switch team while the room isn't full/locked,
    // for when the lobby UI wants to let people choose rather than just
    // auto-alternate
    public boolean setTeam(WebSocketSession session, String team) {
        Member m = find(session);
        if (m == null) return false;
        if (!"red".equals(team) && !"blue".equals(team)) return false;

        m.team = team;
        return true;
    }

    // ============================================================
    public static class Member {
        public final WebSocketSession session;
        public final String username;
        public boolean isHost;
        public boolean ready = false;
        public String team;

        Member(WebSocketSession session, String username, boolean isHost, String team) {
            this.session = session;
            this.username = username;
            this.isHost = isHost;
            this.team = team;
        }
    }
}