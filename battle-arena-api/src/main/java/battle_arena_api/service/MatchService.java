package battle_arena_api.service;

import battle_arena_api.dto.AchievementDto;
import battle_arena_api.dto.LeaderboardEntryDto;
import battle_arena_api.dto.MatchHistoryEntryDto;
import battle_arena_api.dto.MatchResultRequest;
import battle_arena_api.dto.MatchResultResponse;
import battle_arena_api.dto.PersonalBestDto;
import battle_arena_api.dto.PlayerStatsDto;
import battle_arena_api.entity.MatchRecord;
import battle_arena_api.entity.Player;
import battle_arena_api.entity.PlayerUnlock;
import battle_arena_api.repository.MatchRepository;
import battle_arena_api.repository.PlayerRepository;
import battle_arena_api.repository.PlayerUnlockRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class MatchService {

    // The client reports its own results, so cap what it can claim.
    // A player cannot plausibly earn more than this per second of play.
    private static final int MAX_COINS_PER_SECOND = 25;
    private static final int MAX_COINS_ABSOLUTE   = 5000;

    // Waves are infinite now — this was left at 10 from when the
    // wave system had a fixed length, silently truncating any real
    // run past wave 10. Raised generously: high enough that no
    // genuine player's result gets clipped, low enough to reject
    // an obviously spoofed value.
    private static final int MAX_WAVES_REACHED = 60;

    // A rough plausibility bound on kills, same spirit as the coin
    // cap. Very generous — two-player co-op with sustained fire —
    // but a devtools-submitted "9999 kills in 20 seconds" gets caught.
    private static final double MAX_KILLS_PER_SECOND = 2.0;
    private static final int MAX_KILLS_ABSOLUTE = 3000;

    // A "final moments" replay is only ~4 seconds of position snapshots
    // — a few hundred KB at most in JSON. Anything wildly bigger than
    // that is not a real replay buffer, so drop it rather than store it.
    private static final int MAX_REPLAY_CHARS = 300_000;

    private final MatchRepository matchRepo;
    private final PlayerRepository playerRepo;
    private final PlayerUnlockRepository unlockRepo;

    // ============================================================
    // BROADCASTER CALLBACK
    // Broadcaster consumer to trigger WebSocket events (e.g., leaderboard updates)
    // ============================================================
    private java.util.function.Consumer<String> broadcaster = type -> {};

    public void setBroadcaster(java.util.function.Consumer<String> broadcaster) {
        this.broadcaster = broadcaster;
    }

    // New: push a real-time event to the ONE player whose match this
    // was (not everyone, unlike the leaderboard broadcaster above) —
    // lets an open Profile screen refresh its match history live the
    // moment a run finishes, instead of only on next visit. Wired by
    // GameSocketHandler at startup, same pattern as FriendService's
    // notifier.
    private java.util.function.Consumer<String> matchNotifier = username -> {};

    public void setMatchNotifier(java.util.function.Consumer<String> matchNotifier) {
        this.matchNotifier = matchNotifier;
    }

    public MatchService(MatchRepository matchRepo, PlayerRepository playerRepo,
                        PlayerUnlockRepository unlockRepo) {
        this.matchRepo = matchRepo;
        this.playerRepo = playerRepo;
        this.unlockRepo = unlockRepo;
    }

    @Transactional
    public MatchResultResponse recordMatch(String username, MatchResultRequest req) {

        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        int claimed = Math.max(0, req.getCoinsEarned());
        int allowed = computeCap(req.getDurationSec());

        int banked = Math.min(claimed, allowed);

        // Same defensive clamp as coins — the leaderboard's entire
        // sort order depends on these numbers, so they can't be trusted
        // unvalidated from the client
        int waves = Math.max(0, Math.min(req.getWavesReached(), MAX_WAVES_REACHED));

        int killCap = req.getDurationSec() > 0
                ? (int) Math.min(MAX_KILLS_ABSOLUTE, req.getDurationSec() * MAX_KILLS_PER_SECOND)
                : 0;
        int kills = Math.max(0, Math.min(req.getEnemiesKilled(), killCap));

        // Record the match
        MatchRecord record = new MatchRecord();
        record.setPlayerId(player.getId());
        record.setMapCode(req.getMapCode());
        record.setWavesReached(waves);
        record.setEnemiesKilled(kills);
        record.setCoinsEarned(banked);
        record.setDurationSec(req.getDurationSec());
        record.setCoOp(req.isCoOp());
        record.setVictory(req.isVictory());
        record.setWasMvp(req.isWasMvp());

        // New: store the "final moments" replay if one was attached and
        // isn't absurdly oversized
        String replay = req.getReplaySnapshot();
        if (replay != null && !replay.isBlank() && replay.length() <= MAX_REPLAY_CHARS) {
            record.setReplayData(replay);
        }

        matchRepo.save(record);

        // ============================================================
        // LEADERBOARD BROADCAST EVENT
        // Notify all WebSocket clients that leaderboard state changed
        // ============================================================
        broadcaster.accept("leaderboardChanged");

        // New: tell this specific player's own session (if open) that a
        // match just got recorded, so their Profile screen can refresh
        // its match history live instead of waiting for a manual reload
        matchNotifier.accept(username);

        // Credit the account
        player.setCoins(player.getCoins() + banked);

        // ---- XP / Level ----
        // Built from the same already-validated numbers as everything
        // else above (waves/kills clamped, banked coins capped) — no
        // separate anti-cheat check needed since a spoofed XP total
        // would require spoofing those first.
        int xpGained = (waves * 15) + (kills * 3)
                + (req.isVictory() ? 150 : 0)
                + (req.isWasMvp() ? 50 : 0);

        long xpBefore = player.getXp();
        int levelBefore = LevelUtil.levelForXp(xpBefore);

        long xpAfter = xpBefore + xpGained;
        int levelAfter = LevelUtil.levelForXp(xpAfter);

        player.setXp(xpAfter);
        playerRepo.save(player);

        // ---- Achievements ----
        long lifetimeMatches = matchRepo.countByPlayerId(player.getId());

        AchievementCatalog.MatchContext ctx = new AchievementCatalog.MatchContext();
        ctx.wavesReached  = waves;
        ctx.enemiesKilled = kills;
        ctx.coinsEarned   = banked;
        ctx.wasMvp        = req.isWasMvp();

        List<AchievementDto> newlyUnlocked = new ArrayList<>();

        for (AchievementCatalog.Definition def : AchievementCatalog.ALL) {
            boolean alreadyOwned = unlockRepo.existsByPlayerIdAndItemTypeAndItemCode(
                    player.getId(), "ACHIEVEMENT", def.code);
            if (alreadyOwned) continue;

            if (!def.condition.test(ctx, lifetimeMatches)) continue;

            unlockRepo.save(new PlayerUnlock(player.getId(), "ACHIEVEMENT", def.code));
            newlyUnlocked.add(new AchievementDto(def.code, def.name, def.description, true));
        }

        String message = (banked < claimed)
                ? "Result recorded (reward capped)"
                : "Result recorded";

        MatchResultResponse response = new MatchResultResponse(true, banked, player.getCoins(), message);
        response.setNewAchievements(newlyUnlocked);
        response.setXpGained(xpGained);
        response.setTotalXp(xpAfter);
        response.setLevel(levelAfter);
        response.setLeveledUp(levelAfter > levelBefore);
        return response;
    }

    private int computeCap(int durationSec) {
        if (durationSec <= 0) return 0;
        return Math.min(MAX_COINS_ABSOLUTE, durationSec * MAX_COINS_PER_SECOND);
    }

    public List<MatchHistoryEntryDto> getHistory(String username) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d, HH:mm");

        return matchRepo.findTop10ByPlayerIdOrderByPlayedAtDesc(player.getId())
                .stream()
                .map(m -> new MatchHistoryEntryDto(
                        m.getId(),
                        m.getMapCode(),
                        m.getWavesReached(),
                        m.getEnemiesKilled(),
                        m.getCoinsEarned(),
                        m.getDurationSec(),
                        m.isVictory(),
                        m.isCoOp(),
                        m.isWasMvp(),
                        m.getPlayedAt().format(fmt),
                        m.getReplayData() != null && !m.getReplayData().isBlank()
                ))
                .toList();
    }

    // New: fetch a single match's saved "final moments" replay JSON, if
    // it has one. No ownership check beyond being logged in — a replay
    // is just a short movement clip, same sensitivity as the stats
    // already shown on a public profile.
    public String getReplay(Long matchId) {
        return matchRepo.findById(matchId)
                .map(MatchRecord::getReplayData)
                .orElse(null);
    }

    public List<LeaderboardEntryDto> getLeaderboard() {
        List<MatchRecord> top = matchRepo.findTop20ByOrderByWavesReachedDescDurationSecAsc();

        return top.stream()
                .map(m -> {
                    String username = playerRepo.findById(m.getPlayerId())
                            .map(Player::getUsername)
                            .orElse("Unknown");

                    return new LeaderboardEntryDto(
                            username,
                            m.getWavesReached(),
                            m.getDurationSec(),
                            m.getEnemiesKilled(),
                            m.isVictory(),
                            m.isCoOp()
                    );
                })
                .toList();
    }

    public PersonalBestDto getPersonalBest(String username) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        return matchRepo.findTopByPlayerIdOrderByWavesReachedDesc(player.getId())
                .map(m -> new PersonalBestDto(m.getWavesReached(), m.getDurationSec(), true))
                .orElse(new PersonalBestDto(0, 0, false));
    }

    // New: real lifetime totals — queried straight from the matches
    // table, not derived from the last-10 history list, so these numbers
    // stay correct no matter how long someone has been playing.
    public PlayerStatsDto getPlayerStats(String username) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        long totalMatches = matchRepo.countByPlayerId(player.getId());
        long totalVictories = matchRepo.countByPlayerIdAndVictoryTrue(player.getId());
        long totalKills = matchRepo.sumEnemiesKilledByPlayerId(player.getId());
        long totalCoins = matchRepo.sumCoinsEarnedByPlayerId(player.getId());
        int bestWave = matchRepo.findTopByPlayerIdOrderByWavesReachedDesc(player.getId())
                .map(MatchRecord::getWavesReached)
                .orElse(0);
        int winRate = totalMatches > 0
                ? (int) Math.round(totalVictories * 100.0 / totalMatches)
                : 0;

        return new PlayerStatsDto(totalMatches, totalVictories, totalKills, totalCoins, bestWave, winRate);
    }

    public List<AchievementDto> getAllAchievements(String username) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        return AchievementCatalog.ALL.stream()
                .map(def -> new AchievementDto(
                        def.code, def.name, def.description,
                        unlockRepo.existsByPlayerIdAndItemTypeAndItemCode(player.getId(), "ACHIEVEMENT", def.code)
                ))
                .toList();
    }
}