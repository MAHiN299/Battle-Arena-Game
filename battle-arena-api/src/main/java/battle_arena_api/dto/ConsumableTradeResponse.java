package battle_arena_api.dto;

// New: response for buy/sell/consume on a consumable — like
// PurchaseResponse, but also reports the item's new owned quantity
// (not just the coin balance) so the Shop card and in-run supply HUD
// can update without a full re-fetch.
public class ConsumableTradeResponse {
    private boolean success;
    private String message;
    private String code;
    private int newBalance;
    private int newQuantity;

    public ConsumableTradeResponse(boolean success, String message, String code, int newBalance, int newQuantity) {
        this.success = success;
        this.message = message;
        this.code = code;
        this.newBalance = newBalance;
        this.newQuantity = newQuantity;
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public String getCode() { return code; }
    public int getNewBalance() { return newBalance; }
    public int getNewQuantity() { return newQuantity; }
}