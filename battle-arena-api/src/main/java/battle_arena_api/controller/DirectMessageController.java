package battle_arena_api.controller;

import battle_arena_api.dto.DirectMessageRequest;
import battle_arena_api.service.DirectMessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class DirectMessageController {

    private final DirectMessageService messageService;

    public DirectMessageController(DirectMessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/{username}")
    public ResponseEntity<?> conversation(@AuthenticationPrincipal String username,
                                           @PathVariable("username") String targetUsername) {
        try {
            return ResponseEntity.ok(messageService.getConversation(username, targetUsername));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{username}")
    public ResponseEntity<?> send(@AuthenticationPrincipal String username,
                                   @PathVariable("username") String targetUsername,
                                   @RequestBody DirectMessageRequest req) {
        try {
            return ResponseEntity.ok(messageService.sendMessage(username, targetUsername, req.getText()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // New: fetch a list of usernames that currently have unread direct messages sent to the caller
    @GetMapping("/unread")
    public ResponseEntity<?> unread(@AuthenticationPrincipal String username) {
        try {
            return ResponseEntity.ok(messageService.getUnreadFromUsernames(username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // New: mark all direct messages from a specific sender as read by the caller
    @PostMapping("/{username}/read")
    public ResponseEntity<?> markRead(@AuthenticationPrincipal String username,
                                       @PathVariable("username") String targetUsername) {
        try {
            messageService.markRead(username, targetUsername);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}