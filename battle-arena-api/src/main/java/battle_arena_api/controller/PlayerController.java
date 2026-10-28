package battle_arena_api.controller;

import battle_arena_api.dto.SettingsRequest;
import battle_arena_api.entity.Player;
import battle_arena_api.repository.PlayerRepository;
import battle_arena_api.repository.PlayerUnlockRepository;
import battle_arena_api.security.JwtUtil;
import battle_arena_api.service.AchievementCatalog;
import battle_arena_api.service.FriendService;
import battle_arena_api.service.LevelUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class PlayerController {

    private final PlayerRepository playerRepository;
    // New: needed for showcase-badge ownership checks and public-profile lookups
    private final PlayerUnlockRepository unlockRepository;
    private final FriendService friendService;
    // New: needed for the account-settings endpoints below (verifying the
    // current password, hashing a new one, and re-issuing a JWT when the
    // username itself changes, since the token's subject is the username)
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public PlayerController(PlayerRepository playerRepository,
                             PlayerUnlockRepository unlockRepository,
                             FriendService friendService,
                             PasswordEncoder passwordEncoder,
                             JwtUtil jwtUtil) {
        this.playerRepository = playerRepository;
        this.unlockRepository = unlockRepository;
        this.friendService = friendService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal String username) {
        Player player = playerRepository.findByUsername(username).orElse(null);

        if (player == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Player not found"));
        }

        return ResponseEntity.ok(profileMap(player));
    }

    // New: view another player's public profile — no email, no coin
    // balance (kept private), just what's already shown elsewhere
    // (username, member-since, showcase badge) plus your relation to
    // them and whether they're online right now, so the Profile screen
    // can show the right Add-Friend/Message buttons.
    @GetMapping("/{targetUsername}")
    public ResponseEntity<?> getPublicProfile(@AuthenticationPrincipal String username,
                                               @PathVariable String targetUsername) {
        Player player = playerRepository.findByUsername(targetUsername).orElse(null);
        if (player == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Player not found"));
        }

        boolean self = username.equalsIgnoreCase(targetUsername);

        Map<String, Object> body = new java.util.HashMap<>();
        // New: the real player id, not a placeholder — was missing here
        // even though the self-profile endpoint always had it
        body.put("id", player.getId());
        body.put("username", player.getUsername());
        body.put("createdAt", player.getCreatedAt().toString());
        body.put("showcaseBadgeCode", player.getShowcaseBadgeCode());
        body.put("showcaseBadgeName", badgeName(player.getShowcaseBadgeCode()));
        body.put("self", self);
        putLevelInfo(body, player);

        if (!self) {
            body.put("relation", friendService.getRelation(username, targetUsername));
            body.put("online", friendService.isOnline(targetUsername));
        }

        return ResponseEntity.ok(body);
    }

    // New: choose (or clear, with a null code) which unlocked achievement
    // shows on your profile card.
    @PostMapping("/showcase")
    public ResponseEntity<?> setShowcase(@AuthenticationPrincipal String username,
                                          @RequestBody Map<String, String> body) {
        Player player = playerRepository.findByUsername(username).orElse(null);
        if (player == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Player not found"));
        }

        String code = body.get("code");
        if (code != null && !code.isBlank()) {
            boolean unlocked = unlockRepository.existsByPlayerIdAndItemTypeAndItemCode(
                    player.getId(), "ACHIEVEMENT", code);
            if (!unlocked) {
                return ResponseEntity.badRequest().body(Map.of("error", "That badge isn't unlocked yet"));
            }
            player.setShowcaseBadgeCode(code);
        } else {
            player.setShowcaseBadgeCode(null);
        }

        playerRepository.save(player);
        return ResponseEntity.ok(profileMap(player));
    }

    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(
            @AuthenticationPrincipal String username,
            @RequestBody SettingsRequest req) {

        Player player = playerRepository.findByUsername(username).orElse(null);

        if (player == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Player not found"));
        }

        // Clamp defensively — a client could send anything
        float master = Math.max(0f, Math.min(1f, req.getMasterVolume()));
        float music  = Math.max(0f, Math.min(1f, req.getMusicVolume()));

        player.setMasterVolume(master);
        player.setMusicVolume(music);
        playerRepository.save(player);

        return ResponseEntity.ok(Map.of(
                "masterVolume", master,
                "musicVolume", music
        ));
    }

    // ============================================================
    // ACCOUNT SETTINGS — change username / email / password.
    // All three require the current password as proof, same as any
    // normal account-settings page. Changing the username re-issues a
    // fresh JWT (its subject is the username) so the client doesn't get
    // logged out mid-change; email/password changes don't touch the
    // token at all.
    // ============================================================

    @PutMapping("/account/username")
    public ResponseEntity<?> changeUsername(@AuthenticationPrincipal String username,
                                             @RequestBody Map<String, String> body) {
        Player player = playerRepository.findByUsername(username).orElse(null);
        if (player == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Player not found"));
        }

        String newUsername = body.get("newUsername") != null ? body.get("newUsername").trim() : "";
        String currentPassword = body.getOrDefault("currentPassword", "");

        if (newUsername.length() < 3 || newUsername.length() > 30) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username must be 3-30 characters"));
        }
        if (!passwordEncoder.matches(currentPassword, player.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect"));
        }
        if (!newUsername.equalsIgnoreCase(player.getUsername()) && playerRepository.existsByUsername(newUsername)) {
            return ResponseEntity.badRequest().body(Map.of("error", "That username is already taken"));
        }

        player.setUsername(newUsername);
        playerRepository.save(player);

        String token = jwtUtil.generateToken(newUsername);
        return ResponseEntity.ok(Map.of("username", newUsername, "token", token));
    }

    @PutMapping("/account/email")
    public ResponseEntity<?> changeEmail(@AuthenticationPrincipal String username,
                                          @RequestBody Map<String, String> body) {
        Player player = playerRepository.findByUsername(username).orElse(null);
        if (player == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Player not found"));
        }

        String newEmail = body.get("newEmail") != null ? body.get("newEmail").trim() : "";
        String currentPassword = body.getOrDefault("currentPassword", "");

        if (!newEmail.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "That doesn't look like a valid email"));
        }
        if (!passwordEncoder.matches(currentPassword, player.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect"));
        }
        if (!newEmail.equalsIgnoreCase(player.getEmail()) && playerRepository.existsByEmail(newEmail)) {
            return ResponseEntity.badRequest().body(Map.of("error", "That email is already registered"));
        }

        player.setEmail(newEmail);
        playerRepository.save(player);

        return ResponseEntity.ok(Map.of("email", newEmail));
    }

    @PutMapping("/account/password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal String username,
                                             @RequestBody Map<String, String> body) {
        Player player = playerRepository.findByUsername(username).orElse(null);
        if (player == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Player not found"));
        }

        String currentPassword = body.getOrDefault("currentPassword", "");
        String newPassword = body.getOrDefault("newPassword", "");

        if (!passwordEncoder.matches(currentPassword, player.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect"));
        }
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "New password must be at least 6 characters"));
        }

        player.setPasswordHash(passwordEncoder.encode(newPassword));
        playerRepository.save(player);

        return ResponseEntity.ok(Map.of("message", "Password updated"));
    }

    private Map<String, Object> profileMap(Player player) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("id", player.getId());
        body.put("username", player.getUsername());
        body.put("email", player.getEmail());
        body.put("coins", player.getCoins());
        body.put("createdAt", player.getCreatedAt().toString());
        body.put("masterVolume", player.getMasterVolume());
        body.put("musicVolume", player.getMusicVolume());
        body.put("showcaseBadgeCode", player.getShowcaseBadgeCode());
        body.put("showcaseBadgeName", badgeName(player.getShowcaseBadgeCode()));
        putLevelInfo(body, player);
        return body;
    }

    // New: level/XP progress, shared by both the self profile and the
    // public-profile endpoint — cosmetic only (see LevelUtil), so it's
    // fine to show on anyone's card, same spirit as the showcase badge.
    private void putLevelInfo(Map<String, Object> body, Player player) {
        long xp = player.getXp();
        int level = LevelUtil.levelForXp(xp);
        body.put("level", level);
        body.put("xp", xp);
        body.put("xpIntoLevel", LevelUtil.xpIntoCurrentLevel(xp));
        body.put("xpForNextLevel", LevelUtil.xpSpanOfCurrentLevel(xp));
    }

    private String badgeName(String code) {
        if (code == null) return null;
        return AchievementCatalog.ALL.stream()
                .filter(def -> def.code.equals(code))
                .map(def -> def.name)
                .findFirst()
                .orElse(null);
    }
}