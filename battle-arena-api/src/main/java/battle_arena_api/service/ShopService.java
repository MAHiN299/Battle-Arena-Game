package battle_arena_api.service;

import battle_arena_api.dto.ConsumableDto;
import battle_arena_api.dto.ConsumableTradeResponse;
import battle_arena_api.dto.PurchaseResponse;
import battle_arena_api.entity.GameCharacter;
import battle_arena_api.entity.GameMap;
import battle_arena_api.entity.Player;
import battle_arena_api.entity.PlayerConsumable;
import battle_arena_api.entity.PlayerUnlock;
import battle_arena_api.repository.GameCharacterRepository;
import battle_arena_api.repository.GameMapRepository;
import battle_arena_api.repository.PlayerConsumableRepository;
import battle_arena_api.repository.PlayerRepository;
import battle_arena_api.repository.PlayerUnlockRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import java.util.List;
import java.util.Map;

@Service
public class ShopService {

    private final PlayerRepository playerRepo;
    private final GameCharacterRepository characterRepo;
    private final GameMapRepository mapRepo;
    private final PlayerUnlockRepository unlockRepo;
    // New: stackable-quantity inventory for Ammo/Grenade/Health consumables
    private final PlayerConsumableRepository consumableRepo;

    public ShopService(PlayerRepository playerRepo,
                       GameCharacterRepository characterRepo,
                       GameMapRepository mapRepo,
                       PlayerUnlockRepository unlockRepo,
                       PlayerConsumableRepository consumableRepo) {
        this.playerRepo = playerRepo;
        this.characterRepo = characterRepo;
        this.mapRepo = mapRepo;
        this.unlockRepo = unlockRepo;
        this.consumableRepo = consumableRepo;
    }

    @Transactional
    public PurchaseResponse purchaseCharacter(String username, String characterCode) {

        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        GameCharacter character = characterRepo.findByCode(characterCode)
                .orElseThrow(() -> new IllegalArgumentException("Character not found"));

        if (character.isDefault()) {
            return new PurchaseResponse(false, "This character is already free",
                    characterCode, player.getCoins());
        }

        boolean alreadyOwned = unlockRepo.existsByPlayerIdAndItemTypeAndItemCode(
                player.getId(), "CHARACTER", characterCode);

        if (alreadyOwned) {
            return new PurchaseResponse(false, "You already own this character",
                    characterCode, player.getCoins());
        }

        if (player.getCoins() < character.getUnlockCost()) {
            int short_ = character.getUnlockCost() - player.getCoins();
            return new PurchaseResponse(false, "Not enough coins (need " + short_ + " more)",
                    characterCode, player.getCoins());
        }

        player.setCoins(player.getCoins() - character.getUnlockCost());
        playerRepo.save(player);

        try {
            unlockRepo.save(new PlayerUnlock(player.getId(), "CHARACTER", characterCode));
        } catch (DataIntegrityViolationException dup) {
            // Two near-simultaneous requests both passed the "already
            // owned" check before either committed — the unique
            // constraint is the real guard here. Roll back the coin
            // deduction from THIS request and report it cleanly
            // rather than let a raw 500 reach the client.
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            return new PurchaseResponse(false, "You already own this character",
                    characterCode, player.getCoins() + character.getUnlockCost());
        }

        return new PurchaseResponse(true, "Unlocked " + character.getDisplayName(),
                characterCode, player.getCoins());
    }

    @Transactional
    public PurchaseResponse purchaseMap(String username, String mapCode) {

        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        GameMap map = mapRepo.findByCode(mapCode)
                .orElseThrow(() -> new IllegalArgumentException("Map not found"));

        if (!map.isAvailable()) {
            return new PurchaseResponse(false, "This arena isn't ready yet",
                    mapCode, player.getCoins());
        }

        if (map.getUnlockCost() == 0) {
            return new PurchaseResponse(false, "This arena is already free",
                    mapCode, player.getCoins());
        }

        boolean alreadyOwned = unlockRepo.existsByPlayerIdAndItemTypeAndItemCode(
                player.getId(), "MAP", mapCode);

        if (alreadyOwned) {
            return new PurchaseResponse(false, "You already own this arena",
                    mapCode, player.getCoins());
        }

        if (player.getCoins() < map.getUnlockCost()) {
            int short_ = map.getUnlockCost() - player.getCoins();
            return new PurchaseResponse(false, "Not enough coins (need " + short_ + " more)",
                    mapCode, player.getCoins());
        }

        player.setCoins(player.getCoins() - map.getUnlockCost());
        playerRepo.save(player);

        try {
            unlockRepo.save(new PlayerUnlock(player.getId(), "MAP", mapCode));
        } catch (DataIntegrityViolationException dup) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            return new PurchaseResponse(false, "You already own this arena",
                    mapCode, player.getCoins() + map.getUnlockCost());
        }

        return new PurchaseResponse(true, "Unlocked " + map.getDisplayName(),
                mapCode, player.getCoins());
    }

    public int getBalance(String username) {
        return playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"))
                .getCoins();
    }

    // ============================================================
    // CONSUMABLES — Ammo Pack / Grenade / Health Kit.
    // Buy and sell go through the coin economy like characters/maps
    // above; consume (used during a boss fight, where no pickups drop)
    // just spends a unit with no refund. All three read-modify-write a
    // PlayerConsumable row, creating it on first purchase.
    // ============================================================

    private int ownedQuantity(Long playerId, String code) {
        return consumableRepo.findByPlayerIdAndItemCode(playerId, code)
                .map(PlayerConsumable::getQuantity)
                .orElse(0);
    }

    public List<ConsumableDto> getConsumableCatalog(String username) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        return ConsumableCatalog.ALL.stream()
                .map(def -> new ConsumableDto(
                        def.code, def.displayName, def.buyPrice, def.sellPrice, def.maxStack,
                        ownedQuantity(player.getId(), def.code)
                ))
                .toList();
    }

    // New: quantities only (no prices) — what Game.js fetches once when
    // a boss wave starts, so the player can use their stockpile there.
    public Map<String, Integer> getInventoryQuantities(String username) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        Map<String, Integer> result = new java.util.HashMap<>();
        for (ConsumableCatalog.Definition def : ConsumableCatalog.ALL) {
            result.put(def.code, ownedQuantity(player.getId(), def.code));
        }
        return result;
    }

    @Transactional
    public ConsumableTradeResponse buyConsumable(String username, String code, int quantity) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        ConsumableCatalog.Definition def = ConsumableCatalog.find(code);
        if (def == null) {
            return new ConsumableTradeResponse(false, "Unknown item", code, player.getCoins(), 0);
        }
        if (quantity <= 0) {
            return new ConsumableTradeResponse(false, "Quantity must be positive", code, player.getCoins(), ownedQuantity(player.getId(), def.code));
        }

        PlayerConsumable row = consumableRepo.findByPlayerIdAndItemCode(player.getId(), def.code).orElse(null);
        int currentQty = row != null ? row.getQuantity() : 0;

        if (currentQty + quantity > def.maxStack) {
            return new ConsumableTradeResponse(false,
                    "You can carry at most " + def.maxStack + " " + def.displayName + "s",
                    code, player.getCoins(), currentQty);
        }

        int cost = def.buyPrice * quantity;
        if (player.getCoins() < cost) {
            return new ConsumableTradeResponse(false,
                    "Not enough coins (need " + (cost - player.getCoins()) + " more)",
                    code, player.getCoins(), currentQty);
        }

        player.setCoins(player.getCoins() - cost);
        playerRepo.save(player);

        if (row == null) {
            row = new PlayerConsumable(player.getId(), def.code, quantity);
        } else {
            row.setQuantity(currentQty + quantity);
        }
        consumableRepo.save(row);

        return new ConsumableTradeResponse(true, "Bought " + quantity + "x " + def.displayName,
                code, player.getCoins(), row.getQuantity());
    }

    @Transactional
    public ConsumableTradeResponse sellConsumable(String username, String code, int quantity) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        ConsumableCatalog.Definition def = ConsumableCatalog.find(code);
        if (def == null) {
            return new ConsumableTradeResponse(false, "Unknown item", code, player.getCoins(), 0);
        }
        if (quantity <= 0) {
            return new ConsumableTradeResponse(false, "Quantity must be positive", code, player.getCoins(), ownedQuantity(player.getId(), def.code));
        }

        PlayerConsumable row = consumableRepo.findByPlayerIdAndItemCode(player.getId(), def.code).orElse(null);
        int currentQty = row != null ? row.getQuantity() : 0;

        if (currentQty < quantity) {
            return new ConsumableTradeResponse(false, "You don't have that many to sell", code, player.getCoins(), currentQty);
        }

        int refund = def.sellPrice * quantity;
        player.setCoins(player.getCoins() + refund);
        playerRepo.save(player);

        row.setQuantity(currentQty - quantity);
        consumableRepo.save(row);

        return new ConsumableTradeResponse(true, "Sold " + quantity + "x " + def.displayName + " for " + refund,
                code, player.getCoins(), row.getQuantity());
    }

    // New: spend a unit during a boss fight — no coins involved, just
    // decrements the stockpile. Clamped rather than rejected on a
    // mismatch (e.g. the client's local count drifted) since this is
    // gameplay, not a purchase — worst case it silently no-ops at 0.
    @Transactional
    public ConsumableTradeResponse consumeConsumable(String username, String code, int quantity) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        ConsumableCatalog.Definition def = ConsumableCatalog.find(code);
        if (def == null) {
            return new ConsumableTradeResponse(false, "Unknown item", code, player.getCoins(), 0);
        }

        PlayerConsumable row = consumableRepo.findByPlayerIdAndItemCode(player.getId(), def.code).orElse(null);
        int currentQty = row != null ? row.getQuantity() : 0;
        int used = Math.max(0, Math.min(quantity, currentQty));

        if (row != null && used > 0) {
            row.setQuantity(currentQty - used);
            consumableRepo.save(row);
        }

        return new ConsumableTradeResponse(true, "Used " + used + "x " + def.displayName,
                code, player.getCoins(), currentQty - used);
    }
}