package battle_arena_api.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import battle_arena_api.security.JwtUtil;
import battle_arena_api.service.FriendService;
import battle_arena_api.service.MatchService;

import java.io.IOException;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper mapper = new ObjectMapper();
    private final Random random = new Random();
    private final JwtUtil jwtUtil;
    private final FriendService friendService;

    // Original constructor:
    // public GameSocketHandler(JwtUtil jwtUtil, FriendService friendService, MatchService matchService) {
    //     this.jwtUtil = jwtUtil;
    //     this.friendService = friendService;
    //     this.friendService.setOnlineChecker(username -> sessionUsername.containsValue(username));
    //     // New: connect MatchService to the global WebSocket broadcaster
    //     matchService.setBroadcaster(type -> broadcastToEveryone(type));
    // }

    // Previous constructor with basic FriendService user notifier wiring:
    // public GameSocketHandler(JwtUtil jwtUtil, FriendService friendService, MatchService matchService) {
    //     this.jwtUtil = jwtUtil;
    //     this.friendService = friendService;
    //     this.friendService.setOnlineChecker(username -> sessionUsername.containsValue(username));
    //     // New: let FriendService push a real-time event to one specific
    //     // user (friend request sent/accepted/declined/removed), same
    //     // wiring pattern as the broadcaster below.
    //     this.friendService.setUserNotifier(this::sendToUsername);
    //     // New: connect MatchService to the global WebSocket broadcaster
    //     matchService.setBroadcaster(type -> broadcastToEveryone(type));
    // }

    // Updated constructor wired to sendFriendEvent for rich friend notifications:
    public GameSocketHandler(JwtUtil jwtUtil, FriendService friendService, MatchService matchService) {
        this.jwtUtil = jwtUtil;
        this.friendService = friendService;
        this.friendService.setOnlineChecker(username -> sessionUsername.containsValue(username));
        // Wire FriendService to pass (username, eventType, otherUsername) to sendFriendEvent
        this.friendService.setUserNotifier(this::sendFriendEvent);
        // New: connect MatchService to the global WebSocket broadcaster
        matchService.setBroadcaster(type -> broadcastToEveryone(type));
        // New: let MatchService push a live "matchRecorded" event to just
        // the one player whose run this was, if they're online right now
        matchService.setMatchNotifier(this::sendMatchRecorded);
    }

    // room code -> room
    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();

    // session id -> room code
    private final Map<String, String> sessionRoom = new ConcurrentHashMap<>();

    // Every open session, regardless of room — the global chat audience
    private final Map<String, WebSocketSession> globalSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionUsername = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        // Nothing yet; the client identifies itself in its first message
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            JsonNode msg = mapper.readTree(message.getPayload());
            String type = msg.path("type").asText();

            switch (type) {
                case "identify"     -> identify(session, msg);
                case "globalChat"   -> relayGlobalChat(session, msg);
                case "globalEvent"  -> relayGlobalEvent(session, msg);
                case "createRoom"   -> createRoom(session, msg);
                case "joinRoom"     -> joinRoom(session, msg);
                case "leaveRoom"    -> leaveRoom(session);
                case "directInvite" -> sendDirectInvite(session, msg);   // New: invite an online friend straight into a room, no code needed
                case "declineInvite" -> declineInvite(session, msg);     // New: tell the inviter their invite was turned down
                case "chat"         -> relayChat(session, msg);
                case "ready"        -> setReady(session, msg);
                case "setTeam"      -> setTeam(session, msg);
                case "startGame"    -> startGame(session);
                case "state"        -> relayToOthers(session, message);   // host to guest
                case "input"        -> relayToHost(session, message);     // guest to host
                case "teamState"    -> relayToOthers(session, message);   // host to all guests
                case "teamInput"    -> relayToHost(session, message);     // any guest to host
                case "event"        -> relayToOthers(session, message);   // one-off effects (room-scoped)
                default -> { /* ignore unknown */ }
            }

        } catch (Exception e) {
            System.out.println("WS error: " + e.getMessage());
        }
    }

    // ============================================================
    // IDENTIFICATION & GLOBAL CHAT
    // ============================================================

    // Called once when a client connects, before any room action —
    // validates token, registers them in the global audience, and records their name
    private void identify(WebSocketSession session, JsonNode msg) throws IOException {
        String token = msg.path("token").asText("");
        if (token.isEmpty() || !jwtUtil.isTokenValid(token)) {
            sendError(session, "Invalid session — please log in again");
            return;
        }

        String username = jwtUtil.getUsernameFromToken(token);
        globalSessions.put(session.getId(), session);
        sessionUsername.put(session.getId(), username);
        broadcastPresenceCount();

        // New: tell every one of this player's friends who happens to be
        // online right now that they just came online — lets an open
        // Profile screen flip its online dot live instead of only
        // showing whatever was true at page-load.
        notifyFriendsOfPresence(username, true);
    }

    private void relayGlobalChat(WebSocketSession session, JsonNode msg) throws IOException {
        String username = sessionUsername.getOrDefault(session.getId(), "Player");
        String text = msg.path("text").asText("").trim();
        if (text.isEmpty()) return;
        if (text.length() > 200) text = text.substring(0, 200);

        ObjectNode out = mapper.createObjectNode();
        out.put("type", "globalChat");
        out.put("from", username);
        out.put("text", text);

        TextMessage tm = new TextMessage(mapper.writeValueAsString(out));
        for (WebSocketSession s : globalSessions.values()) {
            if (s.isOpen()) s.sendMessage(tm);
        }
    }

    private void relayGlobalEvent(WebSocketSession session, JsonNode msg) throws IOException {
        ObjectNode out = mapper.createObjectNode();
        out.put("type", "event");
        out.set("name", msg.path("name"));
        out.set("data", msg.path("data"));

        TextMessage tm = new TextMessage(mapper.writeValueAsString(out));
        for (WebSocketSession s : globalSessions.values()) {
            if (s.isOpen()) s.sendMessage(tm);
        }
    }

    private void broadcastPresenceCount() throws IOException {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", "presence");
        msg.put("count", globalSessions.size());

        TextMessage tm = new TextMessage(mapper.writeValueAsString(msg));
        for (WebSocketSession s : globalSessions.values()) {
            if (s.isOpen()) s.sendMessage(tm);
        }
    }

    // ============================================================
    // GLOBAL BROADCASTING
    // ============================================================
    // Reusable: push a message to every connected client, regardless
    // of room. Used for the presence count already, and now for
    // leaderboard-changed notifications from MatchService.
    public void broadcastToEveryone(String type) {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", type);
        try {
            TextMessage tm = new TextMessage(mapper.writeValueAsString(msg));
            for (WebSocketSession s : globalSessions.values()) {
                if (s.isOpen()) s.sendMessage(tm);
            }
        } catch (IOException ignored) {}
    }

    // Previous implementation:
    // public void sendToUsername(String username, String type) {
    //     String sessionId = null;
    //     for (Map.Entry<String, String> e : sessionUsername.entrySet()) {
    //         if (e.getValue().equals(username)) {
    //             sessionId = e.getKey();
    //             break;
    //         }
    //     }
    //     if (sessionId == null) return;
    //     WebSocketSession session = globalSessions.get(sessionId);
    //     if (session == null || !session.isOpen()) return;
    //     ObjectNode msg = mapper.createObjectNode();
    //     msg.put("type", type);
    //     try {
    //         session.sendMessage(new TextMessage(mapper.writeValueAsString(msg)));
    //     } catch (IOException ignored) {}
    // }

    // New: Helper method to look up a session ID by username to avoid duplicating lookup loops
    private String findSessionIdForUsername(String username) {
        for (Map.Entry<String, String> e : sessionUsername.entrySet()) {
            if (e.getValue().equals(username)) {
                return e.getKey();
            }
        }
        return null;
    }

    // Previous implementation before adding findSessionIdForUsername helper:
    // public void sendFriendEvent(String username, String eventType, String otherUsername) {
    //     String sessionId = null;
    //     for (Map.Entry<String, String> e : sessionUsername.entrySet()) {
    //         if (e.getValue().equals(username)) {
    //             sessionId = e.getKey();
    //             break;
    //         }
    //     }
    //     if (sessionId == null) return;
    //     WebSocketSession session = globalSessions.get(sessionId);
    //     if (session == null || !session.isOpen()) return;
    //     ObjectNode msg = mapper.createObjectNode();
    //     msg.put("type", eventType);
    //     msg.put("otherUsername", otherUsername);
    //     try {
    //         session.sendMessage(new TextMessage(mapper.writeValueAsString(msg)));
    //     } catch (IOException ignored) {}
    // }

    // Updated: push a message to one specific user's session, using findSessionIdForUsername helper
    public void sendFriendEvent(String username, String eventType, String otherUsername) {
        String sessionId = findSessionIdForUsername(username);
        if (sessionId == null) return;
        WebSocketSession session = globalSessions.get(sessionId);
        if (session == null || !session.isOpen()) return;
        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", eventType);
        msg.put("otherUsername", otherUsername);
        try {
            session.sendMessage(new TextMessage(mapper.writeValueAsString(msg)));
        } catch (IOException ignored) {}
    }

    // New: deliver a friend-to-friend chat message instantly if the
    // recipient is online right now.
    public void sendDirectMessage(String toUsername, String fromUsername, String text, String createdAt) {
        String sessionId = findSessionIdForUsername(toUsername);
        if (sessionId == null) return;
        WebSocketSession session = globalSessions.get(sessionId);
        if (session == null || !session.isOpen()) return;
        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", "directMessage");
        msg.put("from", fromUsername);
        msg.put("text", text);
        msg.put("createdAt", createdAt);
        try {
            session.sendMessage(new TextMessage(mapper.writeValueAsString(msg)));
        } catch (IOException ignored) {}
    }

    // New: tell one specific player their match was just recorded, if
    // they're online right now (same lookup pattern as sendFriendEvent).
    public void sendMatchRecorded(String username) {
        String sessionId = findSessionIdForUsername(username);
        if (sessionId == null) return;
        WebSocketSession session = globalSessions.get(sessionId);
        if (session == null || !session.isOpen()) return;

        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", "matchRecorded");
        try {
            session.sendMessage(new TextMessage(mapper.writeValueAsString(msg)));
        } catch (IOException ignored) {}
    }

    // ============================================================
    // ROOMS
    // ============================================================
    private void createRoom(WebSocketSession session, JsonNode msg) throws IOException {
        String username = sessionUsername.get(session.getId());
        if (username == null) {
            sendError(session, "Not identified — reconnect and try again");
            return;
        }

        String code = generateCode();
        GameRoom room = new GameRoom(code, msg.path("mode").asText("coop"));
        rooms.put(code, room);

        GameRoom.Member me = room.add(session, username);
        sessionRoom.put(session.getId(), code);

        ObjectNode res = mapper.createObjectNode();
        res.put("type", "roomCreated");
        res.put("code", code);
        res.put("isHost", me.isHost);

        send(session, res);
        broadcastRoomState(room);
    }

    private void joinRoom(WebSocketSession session, JsonNode msg) throws IOException {
        String code = msg.path("code").asText("").toUpperCase();
        String username = sessionUsername.get(session.getId());
        if (username == null) {
            sendError(session, "Not identified — reconnect and try again");
            return;
        }

        GameRoom room = rooms.get(code);

        if (room == null) {
            sendError(session, "Room not found");
            return;
        }
        if (room.isFull()) {
            sendError(session, "Room is full");
            return;
        }
        if (room.isInGame()) {
            sendError(session, "Match already started");
            return;
        }

        GameRoom.Member me = room.add(session, username);
        sessionRoom.put(session.getId(), code);

        ObjectNode res = mapper.createObjectNode();
        res.put("type", "roomJoined");
        res.put("code", code);
        res.put("isHost", me.isHost);

        send(session, res);
        broadcastRoomState(room);

        systemChat(room, username + " joined");
    }

    // New: direct-invite — skips room-code entry entirely. Creates (or
    // reuses) a room for the inviter exactly like createRoom() does, then
    // pushes the code straight to the target's own session if they're
    // online right now. The target's client shows an accept/decline
    // popup; accepting just calls the existing joinRoom(code) flow, so
    // this reuses 100% of the current room machinery below.
    private void sendDirectInvite(WebSocketSession session, JsonNode msg) throws IOException {
        String fromUsername = sessionUsername.get(session.getId());
        if (fromUsername == null) {
            sendError(session, "Not identified — reconnect and try again");
            return;
        }

        String targetUsername = msg.path("targetUsername").asText("");
        if (targetUsername.isEmpty() || targetUsername.equalsIgnoreCase(fromUsername)) {
            sendError(session, "Invalid invite target");
            return;
        }

        String targetSessionId = findSessionIdForUsername(targetUsername);
        WebSocketSession targetSession = targetSessionId != null ? globalSessions.get(targetSessionId) : null;
        if (targetSession == null || !targetSession.isOpen()) {
            sendError(session, targetUsername + " is not online right now");
            return;
        }

        // Reuse the inviter's current room if they're already hosting one
        // that hasn't started yet; otherwise create a fresh one, same as
        // clicking "Host a Game" would.
        String code = sessionRoom.get(session.getId());
        GameRoom room = code != null ? rooms.get(code) : null;

        if (room == null || room.isInGame()) {
            code = generateCode();
            room = new GameRoom(code);
            rooms.put(code, room);

            GameRoom.Member me = room.add(session, fromUsername);
            sessionRoom.put(session.getId(), code);

            ObjectNode res = mapper.createObjectNode();
            res.put("type", "roomCreated");
            res.put("code", code);
            res.put("isHost", me.isHost);
            send(session, res);
            broadcastRoomState(room);
        }

        ObjectNode invite = mapper.createObjectNode();
        invite.put("type", "directInviteReceived");
        invite.put("fromUsername", fromUsername);
        invite.put("code", code);
        targetSession.sendMessage(new TextMessage(mapper.writeValueAsString(invite)));
    }

    // New: the invitee declined — let the inviter know, if they're still online.
    private void declineInvite(WebSocketSession session, JsonNode msg) throws IOException {
        String myUsername = sessionUsername.get(session.getId());
        String fromUsername = msg.path("fromUsername").asText("");
        if (myUsername == null || fromUsername.isEmpty()) return;

        String inviterSessionId = findSessionIdForUsername(fromUsername);
        WebSocketSession inviterSession = inviterSessionId != null ? globalSessions.get(inviterSessionId) : null;
        if (inviterSession == null || !inviterSession.isOpen()) return;

        ObjectNode out = mapper.createObjectNode();
        out.put("type", "directInviteDeclined");
        out.put("byUsername", myUsername);
        inviterSession.sendMessage(new TextMessage(mapper.writeValueAsString(out)));
    }

    private void leaveRoom(WebSocketSession session) throws IOException {
        String code = sessionRoom.remove(session.getId());
        if (code == null) return;

        GameRoom room = rooms.get(code);
        if (room == null) return;

        GameRoom.Member me = room.find(session);
        String name = me != null ? me.username : "Player";

        room.remove(session);

        if (room.isEmpty()) {
            rooms.remove(code);
            return;
        }

        systemChat(room, name + " left");
        broadcastRoomState(room);
    }

    private void setReady(WebSocketSession session, JsonNode msg) throws IOException {
        GameRoom room = roomOf(session);
        if (room == null) return;

        GameRoom.Member me = room.find(session);
        if (me == null) return;

        me.ready = msg.path("ready").asBoolean(true);
        broadcastRoomState(room);
    }

    private void setTeam(WebSocketSession session, JsonNode msg) throws IOException {
        GameRoom room = roomOf(session);
        if (room == null) return;

        String team = msg.path("team").asText("");
        boolean ok = room.setTeam(session, team);
        if (ok) broadcastRoomState(room);
    }

    private void startGame(WebSocketSession session) throws IOException {
        GameRoom room = roomOf(session);
        if (room == null) return;

        GameRoom.Member me = room.find(session);
        if (me == null || !me.isHost) return;      // only the host may start

        room.setInGame(true);

        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", "gameStarting");
        msg.put("seed", random.nextInt(1_000_000));   // shared RNG seed

        broadcast(room, msg);
    }

    // ============================================================
    // CHAT
    // ============================================================
    private void relayChat(WebSocketSession session, JsonNode msg) throws IOException {
        GameRoom room = roomOf(session);
        if (room == null) return;

        GameRoom.Member me = room.find(session);
        if (me == null) return;

        String text = msg.path("text").asText("").trim();
        if (text.isEmpty()) return;
        if (text.length() > 200) text = text.substring(0, 200);

        ObjectNode out = mapper.createObjectNode();
        out.put("type", "chat");
        out.put("from", me.username);
        out.put("text", text);
        out.put("system", false);

        broadcast(room, out);
    }

    private void systemChat(GameRoom room, String text) throws IOException {
        ObjectNode out = mapper.createObjectNode();
        out.put("type", "chat");
        out.put("from", "");
        out.put("text", text);
        out.put("system", true);

        broadcast(room, out);
    }

    // ============================================================
    // RELAY
    // ============================================================
    private void relayToOthers(WebSocketSession session, TextMessage message) throws IOException {
        GameRoom room = roomOf(session);
        if (room == null) return;

        for (GameRoom.Member m : room.getMembers()) {
            if (m.session.getId().equals(session.getId())) continue;
            if (m.session.isOpen()) m.session.sendMessage(message);
        }
    }

    private void relayToHost(WebSocketSession session, TextMessage message) throws IOException {
        GameRoom room = roomOf(session);
        if (room == null) return;

        GameRoom.Member host = room.getHost();
        if (host != null && host.session.isOpen()
                && !host.session.getId().equals(session.getId())) {
            host.session.sendMessage(message);
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================
    private GameRoom roomOf(WebSocketSession session) {
        String code = sessionRoom.get(session.getId());
        return code == null ? null : rooms.get(code);
    }

    private void broadcastRoomState(GameRoom room) throws IOException {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", "roomState");
        msg.put("code", room.getCode());
        msg.put("maxPlayers", GameRoom.MAX_PLAYERS);

        var arr = msg.putArray("players");
        for (GameRoom.Member m : room.getMembers()) {
            ObjectNode p = arr.addObject();
            p.put("username", m.username);
            p.put("isHost", m.isHost);
            p.put("ready", m.ready);
            p.put("team", m.team);
        }

        broadcast(room, msg);
    }

    private void broadcast(GameRoom room, ObjectNode msg) throws IOException {
        TextMessage tm = new TextMessage(mapper.writeValueAsString(msg));

        for (GameRoom.Member m : room.getMembers()) {
            if (m.session.isOpen()) m.session.sendMessage(tm);
        }
    }

    private void send(WebSocketSession session, ObjectNode msg) throws IOException {
        if (session.isOpen()) {
            session.sendMessage(new TextMessage(mapper.writeValueAsString(msg)));
        }
    }

    private void sendError(WebSocketSession session, String text) throws IOException {
        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", "error");
        msg.put("message", text);
        send(session, msg);
    }

    // Four-character room codes, avoiding ambiguous characters
    private String generateCode() {
        final String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        String code;

        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 4; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            code = sb.toString();
        } while (rooms.containsKey(code));

        return code;
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        try {
            leaveRoom(session);
        } catch (IOException ignored) {}

        // Captured before removal — need it to know whose friends to notify
        String username = sessionUsername.get(session.getId());

        globalSessions.remove(session.getId());
        sessionUsername.remove(session.getId());

        try {
            broadcastPresenceCount();
        } catch (IOException ignored) {}

        // New: tell this player's online friends they just went offline
        if (username != null) {
            notifyFriendsOfPresence(username, false);
        }
    }

    // New: push a "friendOnline"/"friendOffline" event to every one of
    // `username`'s friends who is currently online, so their Profile
    // screen (if open) updates the online dot in real time. Safe to call
    // even if friendService can't resolve the player (e.g. bad token) —
    // getFriendUsernames returns an empty list in that case.
    private void notifyFriendsOfPresence(String username, boolean online) {
        java.util.List<String> friends = friendService.getFriendUsernames(username);
        String type = online ? "friendOnline" : "friendOffline";
        for (String friendUsername : friends) {
            sendPresenceEvent(friendUsername, type, username);
        }
    }

    private void sendPresenceEvent(String toUsername, String type, String aboutUsername) {
        String sessionId = findSessionIdForUsername(toUsername);
        if (sessionId == null) return;
        WebSocketSession session = globalSessions.get(sessionId);
        if (session == null || !session.isOpen()) return;

        ObjectNode msg = mapper.createObjectNode();
        msg.put("type", type);
        msg.put("username", aboutUsername);
        try {
            session.sendMessage(new TextMessage(mapper.writeValueAsString(msg)));
        } catch (IOException ignored) {}
    }
}