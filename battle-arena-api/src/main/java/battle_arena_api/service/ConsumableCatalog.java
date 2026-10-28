package battle_arena_api.service;

import java.util.List;

// ============================================================
// The 3 consumables sold/bought/sold-back in the Shop's Supplies
// tab: Ammo Pack, Grenade, Health Kit. Each maps 1:1 to the effect
// the in-run Pickup of the same kind already applies (see
// Pickup.applyKindEffect on the frontend) — buying one just banks
// a unit of that same effect for later, instead of finding it on
// the ground. Fixed prices, no DB table needed for just 3 items.
// ============================================================
public class ConsumableCatalog {

    public static class Definition {
        public final String code;         // matches the frontend Pickup 'kind' (uppercased)
        public final String displayName;
        public final int buyPrice;
        public final int sellPrice;       // always less than buyPrice, so you can't farm coins by buy/sell-looping
        public final int maxStack;        // a sane per-item cap so nobody hoards 9999 of one thing

        public Definition(String code, String displayName, int buyPrice, int sellPrice, int maxStack) {
            this.code = code;
            this.displayName = displayName;
            this.buyPrice = buyPrice;
            this.sellPrice = sellPrice;
            this.maxStack = maxStack;
        }
    }

    public static final List<Definition> ALL = List.of(
        new Definition("AMMO",    "Ammo Pack",  40, 18, 20),
        new Definition("GRENADE", "Grenade",    70, 30, 10),
        new Definition("HEALTH",  "Health Kit", 60, 25, 10)
    );

    public static Definition find(String code) {
        return ALL.stream().filter(d -> d.code.equalsIgnoreCase(code)).findFirst().orElse(null);
    }
}