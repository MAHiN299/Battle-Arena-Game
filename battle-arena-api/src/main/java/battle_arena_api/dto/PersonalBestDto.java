package battle_arena_api.dto;

public class PersonalBestDto {
    private int bestWave;
    private int durationSec;
    private boolean hasPlayed;

    public PersonalBestDto(int bestWave, int durationSec, boolean hasPlayed) {
        this.bestWave = bestWave;
        this.durationSec = durationSec;
        this.hasPlayed = hasPlayed;
    }

    public int getBestWave() { return bestWave; }
    public int getDurationSec() { return durationSec; }
    public boolean isHasPlayed() { return hasPlayed; }
}