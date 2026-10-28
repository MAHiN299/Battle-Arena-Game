package battle_arena_api.dto;

public class PurchaseResponse {

    private boolean success;
    private String message;
    private String characterCode;
    private int newBalance;

    public PurchaseResponse(boolean success, String message,
                            String characterCode, int newBalance) {
        this.success = success;
        this.message = message;
        this.characterCode = characterCode;
        this.newBalance = newBalance;
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public String getCharacterCode() { return characterCode; }
    public int getNewBalance() { return newBalance; }
}