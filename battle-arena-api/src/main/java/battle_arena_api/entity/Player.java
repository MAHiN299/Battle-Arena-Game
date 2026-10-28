package battle_arena_api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "players")
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String username;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private int coins = 0;

    @Column(name = "master_volume", nullable = false)
    private float masterVolume = 1.0f;

    @Column(name = "music_volume", nullable = false)
    private float musicVolume = 0.45f;

    // New: the one achievement badge this player has chosen to show on
    // their profile card. Null means none picked.
    @Column(name = "showcase_badge_code", length = 40)
    private String showcaseBadgeCode;

    // New: lifetime XP total, earned from match results (see
    // MatchService.recordMatch()). Level is never stored directly — it's
    // always derived from this via LevelUtil, so there's no way for the
    // two to drift out of sync.
    @Column(nullable = false)
    private long xp = 0;

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public int getCoins() { return coins; }
    public void setCoins(int coins) { this.coins = coins; }

    public float getMasterVolume() { return masterVolume; }
    public void setMasterVolume(float masterVolume) { this.masterVolume = masterVolume; }
    public float getMusicVolume() { return musicVolume; }
    public void setMusicVolume(float musicVolume) { this.musicVolume = musicVolume; }

    public String getShowcaseBadgeCode() { return showcaseBadgeCode; }
    public void setShowcaseBadgeCode(String showcaseBadgeCode) { this.showcaseBadgeCode = showcaseBadgeCode; }

    public long getXp() { return xp; }
    public void setXp(long xp) { this.xp = xp; }
}