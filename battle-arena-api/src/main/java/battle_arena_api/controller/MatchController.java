package battle_arena_api.controller;

import battle_arena_api.dto.AchievementDto;
import battle_arena_api.dto.LeaderboardEntryDto;
import battle_arena_api.dto.MatchHistoryEntryDto;
import battle_arena_api.dto.MatchResultRequest;
import battle_arena_api.dto.MatchResultResponse;
import battle_arena_api.dto.PersonalBestDto;
import battle_arena_api.dto.PlayerStatsDto;
import battle_arena_api.service.MatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/match")
public class MatchController {

    private final MatchService matchService;

    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    @PostMapping("/complete")
    public ResponseEntity<MatchResultResponse> complete(
            @AuthenticationPrincipal String username,
            @RequestBody MatchResultRequest request) {

        return ResponseEntity.ok(matchService.recordMatch(username, request));
    }

    @GetMapping("/history")
    public ResponseEntity<List<MatchHistoryEntryDto>> history(
            @AuthenticationPrincipal String username) {

        return ResponseEntity.ok(matchService.getHistory(username));
    }

    // New: same data as /history, /personal-best and /achievements above,
    // but for any username — used by the Profile screen when viewing
    // someone else. The underlying service methods already take a plain
    // username (not tied to the JWT principal), so these just pass the
    // path variable through; being logged in at all is still required.
    @GetMapping("/history/{username}")
    public ResponseEntity<List<MatchHistoryEntryDto>> historyOf(@PathVariable String username) {
        return ResponseEntity.ok(matchService.getHistory(username));
    }

    @GetMapping("/personal-best/{username}")
    public ResponseEntity<PersonalBestDto> personalBestOf(@PathVariable String username) {
        return ResponseEntity.ok(matchService.getPersonalBest(username));
    }

    @GetMapping("/achievements/{username}")
    public ResponseEntity<List<AchievementDto>> achievementsOf(@PathVariable String username) {
        return ResponseEntity.ok(matchService.getAllAchievements(username));
    }

    // New: real lifetime totals (total matches, victories, kills, coins,
    // win rate) — see PlayerStatsDto. Same self/{username} pairing as
    // the other endpoints above.
    @GetMapping("/stats/{username}")
    public ResponseEntity<PlayerStatsDto> statsOf(@PathVariable String username) {
        return ResponseEntity.ok(matchService.getPlayerStats(username));
    }

    @GetMapping("/stats")
    public ResponseEntity<PlayerStatsDto> stats(@AuthenticationPrincipal String username) {
        return ResponseEntity.ok(matchService.getPlayerStats(username));
    }

    // New: fetch one match's saved "final moments" replay (raw JSON
    // string of position snapshots), if it has one.
    @GetMapping("/{matchId}/replay")
    public ResponseEntity<?> replay(@PathVariable Long matchId) {
        String data = matchService.getReplay(matchId);
        if (data == null) {
            return ResponseEntity.status(404).body(Map.of("error", "No replay saved for this match"));
        }
        return ResponseEntity.ok(Map.of("frames", data));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<LeaderboardEntryDto>> leaderboard() {
        return ResponseEntity.ok(matchService.getLeaderboard());
    }

    @GetMapping("/personal-best")
    public ResponseEntity<PersonalBestDto> personalBest(
            @AuthenticationPrincipal String username) {

        return ResponseEntity.ok(matchService.getPersonalBest(username));
    }

    @GetMapping("/achievements")
    public ResponseEntity<List<AchievementDto>> achievements(
            @AuthenticationPrincipal String username) {

        return ResponseEntity.ok(matchService.getAllAchievements(username));
    }
}