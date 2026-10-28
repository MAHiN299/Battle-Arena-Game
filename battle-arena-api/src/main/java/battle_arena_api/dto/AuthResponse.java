package battle_arena_api.dto;

public class AuthResponse {

    private String token;
    private String username;
    private int coins;

    public AuthResponse(String token, String username, int coins) {
        this.token = token;
        this.username = username;
        this.coins = coins;
    }

    public String getToken() { return token; }
    public String getUsername() { return username; }
    public int getCoins() { return coins; }
}