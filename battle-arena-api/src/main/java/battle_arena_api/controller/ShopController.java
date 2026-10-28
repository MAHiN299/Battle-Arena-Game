package battle_arena_api.controller;

import battle_arena_api.dto.ConsumableDto;
import battle_arena_api.dto.ConsumableTradeResponse;
import battle_arena_api.dto.PurchaseResponse;
import battle_arena_api.service.ShopService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shop")
public class ShopController {

    private final ShopService shopService;

    public ShopController(ShopService shopService) {
        this.shopService = shopService;
    }

    @GetMapping("/balance")
    public ResponseEntity<Map<String, Integer>> getBalance(
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(Map.of("coins", shopService.getBalance(username)));
    }

    @PostMapping("/purchase/{code}")
    public ResponseEntity<PurchaseResponse> purchase(
            @AuthenticationPrincipal String username,
            @PathVariable String code) {
        return ResponseEntity.ok(shopService.purchaseCharacter(username, code));
    }

    @PostMapping("/purchase-map/{code}")
    public ResponseEntity<PurchaseResponse> purchaseMap(
            @AuthenticationPrincipal String username,
            @PathVariable String code) {
        return ResponseEntity.ok(shopService.purchaseMap(username, code));
    }

    // ============================================================
    // CONSUMABLES — Ammo Pack / Grenade / Health Kit. Buy/sell here
    // (coin economy), consume is what Game.js calls when the player
    // actually uses one during a boss fight (no coins involved).
    // ============================================================

    @GetMapping("/consumables")
    public ResponseEntity<List<ConsumableDto>> getConsumables(@AuthenticationPrincipal String username) {
        return ResponseEntity.ok(shopService.getConsumableCatalog(username));
    }

    // New: lightweight quantities-only fetch — what Game.js calls once
    // when a boss wave starts, since it doesn't need prices.
    @GetMapping("/consumables/inventory")
    public ResponseEntity<Map<String, Integer>> getConsumableInventory(@AuthenticationPrincipal String username) {
        return ResponseEntity.ok(shopService.getInventoryQuantities(username));
    }

    @PostMapping("/consumables/{code}/buy")
    public ResponseEntity<ConsumableTradeResponse> buyConsumable(
            @AuthenticationPrincipal String username,
            @PathVariable String code,
            @RequestBody Map<String, Integer> body) {
        int quantity = body.getOrDefault("quantity", 1);
        return ResponseEntity.ok(shopService.buyConsumable(username, code, quantity));
    }

    @PostMapping("/consumables/{code}/sell")
    public ResponseEntity<ConsumableTradeResponse> sellConsumable(
            @AuthenticationPrincipal String username,
            @PathVariable String code,
            @RequestBody Map<String, Integer> body) {
        int quantity = body.getOrDefault("quantity", 1);
        return ResponseEntity.ok(shopService.sellConsumable(username, code, quantity));
    }

    @PostMapping("/consumables/{code}/consume")
    public ResponseEntity<ConsumableTradeResponse> consumeConsumable(
            @AuthenticationPrincipal String username,
            @PathVariable String code,
            @RequestBody Map<String, Integer> body) {
        int quantity = body.getOrDefault("quantity", 1);
        return ResponseEntity.ok(shopService.consumeConsumable(username, code, quantity));
    }
}