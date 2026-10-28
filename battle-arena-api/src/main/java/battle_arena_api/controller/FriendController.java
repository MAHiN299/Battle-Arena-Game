package battle_arena_api.controller;

import battle_arena_api.dto.FriendDto;
import battle_arena_api.dto.FriendRequestDto;
import battle_arena_api.service.FriendService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @GetMapping
    public ResponseEntity<List<FriendDto>> list(@AuthenticationPrincipal String username) {
        return ResponseEntity.ok(friendService.getFriends(username));
    }

    // New: friend search — GET /api/friends/search?q=par
    @GetMapping("/search")
    public ResponseEntity<?> search(@AuthenticationPrincipal String username,
                                     @RequestParam("q") String q) {
        try {
            return ResponseEntity.ok(friendService.search(username, q));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/requests/incoming")
    public ResponseEntity<List<FriendRequestDto>> incoming(@AuthenticationPrincipal String username) {
        return ResponseEntity.ok(friendService.getIncomingRequests(username));
    }

    @GetMapping("/requests/outgoing")
    public ResponseEntity<List<FriendRequestDto>> outgoing(@AuthenticationPrincipal String username) {
        return ResponseEntity.ok(friendService.getOutgoingRequests(username));
    }

    @PostMapping("/request/{targetUsername}")
    public ResponseEntity<?> sendRequest(@AuthenticationPrincipal String username,
                                          @PathVariable String targetUsername) {
        try {
            return ResponseEntity.ok(friendService.sendRequest(username, targetUsername));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/requests/{friendshipId}/accept")
    public ResponseEntity<?> accept(@AuthenticationPrincipal String username,
                                     @PathVariable Long friendshipId) {
        try {
            friendService.respondToRequest(username, friendshipId, true);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/requests/{friendshipId}/decline")
    public ResponseEntity<?> decline(@AuthenticationPrincipal String username,
                                      @PathVariable Long friendshipId) {
        try {
            friendService.respondToRequest(username, friendshipId, false);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{friendshipId}")
    public ResponseEntity<?> remove(@AuthenticationPrincipal String username,
                                     @PathVariable Long friendshipId) {
        try {
            friendService.removeFriend(username, friendshipId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}