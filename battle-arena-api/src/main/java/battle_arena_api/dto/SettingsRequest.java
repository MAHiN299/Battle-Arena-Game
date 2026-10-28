package battle_arena_api.dto;

public class SettingsRequest {
    private float masterVolume;
    private float musicVolume;

    public float getMasterVolume() { return masterVolume; }
    public void setMasterVolume(float masterVolume) { this.masterVolume = masterVolume; }
    public float getMusicVolume() { return musicVolume; }
    public void setMusicVolume(float musicVolume) { this.musicVolume = musicVolume; }
}