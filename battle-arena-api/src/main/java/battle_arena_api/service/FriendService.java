package battle_arena_api.service;

import battle_arena_api.dto.FriendDto;
import battle_arena_api.dto.FriendRequestDto;
import battle_arena_api.dto.PlayerSearchDto;
import battle_arena_api.entity.Friendship;
import battle_arena_api.entity.Player;
import battle_arena_api.repository.FriendshipRepository;
import battle_arena_api.repository.PlayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Function;

@Service
public class FriendService {

    // Original notifier definition (using BiConsumer):
    // private BiConsumer<String, String> userNotifier = (username, type) -> {};

    // Updated notifier structure:
    // Same wiring pattern as onlineChecker below and MatchService's
    // broadcaster: lets this service push a real-time event to one
    // specific user (if they're online) without depending on the
    // websocket package. eventType is what the client reacts to
    // (e.g. "friendRequestReceived"), otherUsername is who triggered
    // it, so the client can show something like "Bob accepted your
    // request" instead of a bare "something changed".
    @FunctionalInterface
    public interface FriendEventNotifier {
        void notify(String username, String eventType, String otherUsername);
    }

    private final PlayerRepository playerRepo;
    private final FriendshipRepository friendRepo;

    // Set by GameSocketHandler at startup, so this service can check
    // who's currently online without a circular dependency on the
    // websocket package
    private Function<String, Boolean> onlineChecker = username -> false;

    // Same wiring pattern as onlineChecker above and MatchService's
    // broadcaster: lets this service push a real-time event to one
    // specific user (if they're online) without depending on the
    // websocket package. (username, eventType) -> void.
    private FriendEventNotifier userNotifier = (username, eventType, otherUsername) -> {};

    public FriendService(PlayerRepository playerRepo, FriendshipRepository friendRepo) {
        this.playerRepo = playerRepo;
        this.friendRepo = friendRepo;
    }

    public void setOnlineChecker(Function<String, Boolean> checker) {
        this.onlineChecker = checker;
    }

    // Original setter:
    // public void setUserNotifier(BiConsumer<String, String> notifier) {
    //     this.userNotifier = notifier;
    // }

    // New: setter for userNotifier to wire real-time notifications with full event metadata
    public void setUserNotifier(FriendEventNotifier notifier) {
        this.userNotifier = notifier;
    }

    @Transactional
    public FriendRequestDto sendRequest(String username, String targetUsername) {
        if (username.equalsIgnoreCase(targetUsername)) {
            throw new IllegalArgumentException("You can't friend yourself");
        }

        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));
        Player target = playerRepo.findByUsername(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("No player with that username"));

        Friendship existing = friendRepo.findBetween(me.getId(), target.getId()).orElse(null);

        if (existing != null) {
            if (existing.getStatus() == Friendship.Status.ACCEPTED) {
                throw new IllegalArgumentException("Already friends");
            }
            throw new IllegalArgumentException("A request already exists between you two");
        }

        Friendship f = new Friendship();
        f.setRequesterId(me.getId());
        f.setAddresseeId(target.getId());
        f.setStatus(Friendship.Status.PENDING);

        friendRepo.save(f);

        // Original code:
        // return new FriendRequestDto(f.getId(), target.getUsername());

        // Previous real-time notification (generic type):
        // userNotifier.accept(target.getUsername(), "friendsChanged");

        // Updated code: Real-time notification with rich event type and sender username
        // Real-time: let the target know a request just landed, if
        // they're online right now — refreshes their FriendsScene and
        // pops a toast naming who sent it.
        userNotifier.notify(target.getUsername(), "friendRequestReceived", me.getUsername());

        return new FriendRequestDto(f.getId(), target.getUsername());
    }

    @Transactional
    public void respondToRequest(String username, Long friendshipId, boolean accept) {
        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        Friendship f = friendRepo.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (!f.getAddresseeId().equals(me.getId())) {
            throw new IllegalArgumentException("This request isn't addressed to you");
        }
        if (f.getStatus() != Friendship.Status.PENDING) {
            throw new IllegalArgumentException("This request has already been handled");
        }

        // Original code:
        // if (accept) {
        //     f.setStatus(Friendship.Status.ACCEPTED);
        //     friendRepo.save(f);
        // } else {
        //     friendRepo.delete(f);
        // }

        if (accept) {
            f.setStatus(Friendship.Status.ACCEPTED);
            friendRepo.save(f);
        } else {
            friendRepo.delete(f);
        }

        // Previous notification:
        // Player requester = playerRepo.findById(f.getRequesterId()).orElse(null);
        // if (requester != null) {
        //     userNotifier.accept(requester.getUsername(), "friendsChanged");
        // }

        // Updated notification: Real-time notice distinguishing acceptance vs decline
        // Real-time: tell the original requester what happened, either
        // way — accept gets a toast, decline just refreshes quietly.
        Player requester = playerRepo.findById(f.getRequesterId()).orElse(null);
        if (requester != null) {
            String eventType = accept ? "friendRequestAccepted" : "friendRequestDeclined";
            userNotifier.notify(requester.getUsername(), eventType, me.getUsername());
        }
    }

    @Transactional
    public void removeFriend(String username, Long friendshipId) {
        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        Friendship f = friendRepo.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Friendship not found"));

        boolean isParty = f.getRequesterId().equals(me.getId()) || f.getAddresseeId().equals(me.getId());
        if (!isParty) {
            throw new IllegalArgumentException("Not your friendship to remove");
        }

        // Original code:
        // friendRepo.delete(f);

        friendRepo.delete(f);

        // Previous notification:
        // Long otherId = f.getRequesterId().equals(me.getId()) ? f.getAddresseeId() : f.getRequesterId();
        // Player other = playerRepo.findById(otherId).orElse(null);
        // if (other != null) {
        //     userNotifier.accept(other.getUsername(), "friendsChanged");
        // }

        // Updated notification: Specific "friendRemoved" event notification
        // Real-time: tell the other side their friends list just changed
        // (no toast for this one — just a quiet list refresh)
        Long otherId = f.getRequesterId().equals(me.getId()) ? f.getAddresseeId() : f.getRequesterId();
        Player other = playerRepo.findById(otherId).orElse(null);
        if (other != null) {
            userNotifier.notify(other.getUsername(), "friendRemoved", me.getUsername());
        }
    }

    public List<FriendDto> getFriends(String username) {
        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        return friendRepo.findAcceptedFor(me.getId()).stream()
                .map(f -> {
                    Long otherId = f.getRequesterId().equals(me.getId()) ? f.getAddresseeId() : f.getRequesterId();
                    Player other = playerRepo.findById(otherId).orElse(null);
                    String otherName = other != null ? other.getUsername() : "Unknown";
                    return new FriendDto(f.getId(), otherName, onlineChecker.apply(otherName));
                })
                .toList();
    }

    public List<FriendRequestDto> getIncomingRequests(String username) {
        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        return friendRepo.findByAddresseeIdAndStatus(me.getId(), Friendship.Status.PENDING).stream()
                .map(f -> {
                    Player requester = playerRepo.findById(f.getRequesterId()).orElse(null);
                    String name = requester != null ? requester.getUsername() : "Unknown";
                    return new FriendRequestDto(f.getId(), name);
                })
                .toList();
    }

    // New: friend search by partial username (min 2 chars) — used by the
    // Friends screen's search box. Excludes yourself, and tells the client
    // your current relation with each result so it can show the right button.
    public List<PlayerSearchDto> search(String username, String query) {
        if (query == null || query.trim().length() < 2) return List.of();

        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        return playerRepo.findTop10ByUsernameContainingIgnoreCaseOrderByUsernameAsc(query.trim()).stream()
                .filter(p -> !p.getId().equals(me.getId()))
                .map(p -> {
                    Friendship f = friendRepo.findBetween(me.getId(), p.getId()).orElse(null);
                    String relation;
                    if (f == null) {
                        relation = "none";
                    } else if (f.getStatus() == Friendship.Status.ACCEPTED) {
                        relation = "friends";
                    } else if (f.getRequesterId().equals(me.getId())) {
                        relation = "pending_outgoing";
                    } else {
                        relation = "pending_incoming";
                    }
                    return new PlayerSearchDto(p.getUsername(), relation);
                })
                .toList();
    }

    // New: used by the Profile screen when viewing someone else — same
    // relation values as search() above, plus a plain online check, both
    // reused by PlayerController without duplicating this logic there.
    public String getRelation(String me, String otherUsername) {
        Player meP = playerRepo.findByUsername(me).orElse(null);
        Player other = playerRepo.findByUsername(otherUsername).orElse(null);
        if (meP == null || other == null) return "none";

        Friendship f = friendRepo.findBetween(meP.getId(), other.getId()).orElse(null);
        if (f == null) return "none";
        if (f.getStatus() == Friendship.Status.ACCEPTED) return "friends";
        return f.getRequesterId().equals(meP.getId()) ? "pending_outgoing" : "pending_incoming";
    }

    public boolean isOnline(String username) {
        return onlineChecker.apply(username);
    }

    // New: plain list of a player's friend usernames (accepted
    // friendships only), with no online-status lookup attached — used
    // by GameSocketHandler to know who to push a "friendOnline" /
    // "friendOffline" presence event to when this player connects or
    // disconnects, so a friend's open Profile screen updates live
    // instead of showing a stale online dot from page-load.
    public List<String> getFriendUsernames(String username) {
        Player me = playerRepo.findByUsername(username).orElse(null);
        if (me == null) return List.of();

        return friendRepo.findAcceptedFor(me.getId()).stream()
                .map(f -> {
                    Long otherId = f.getRequesterId().equals(me.getId()) ? f.getAddresseeId() : f.getRequesterId();
                    Player other = playerRepo.findById(otherId).orElse(null);
                    return other != null ? other.getUsername() : null;
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    public List<FriendRequestDto> getOutgoingRequests(String username) {
        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        return friendRepo.findByRequesterIdAndStatus(me.getId(), Friendship.Status.PENDING).stream()
                .map(f -> {
                    Player addressee = playerRepo.findById(f.getAddresseeId()).orElse(null);
                    String name = addressee != null ? addressee.getUsername() : "Unknown";
                    return new FriendRequestDto(f.getId(), name);
                })
                .toList();
    }
}