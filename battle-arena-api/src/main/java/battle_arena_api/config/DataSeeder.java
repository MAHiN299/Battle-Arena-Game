package battle_arena_api.config;

import battle_arena_api.entity.GameCharacter;
import battle_arena_api.entity.GameMap;
import battle_arena_api.repository.GameCharacterRepository;
import battle_arena_api.repository.GameMapRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final GameCharacterRepository characterRepo;
    private final GameMapRepository mapRepo;

    public DataSeeder(GameCharacterRepository characterRepo, GameMapRepository mapRepo) {
        this.characterRepo = characterRepo;
        this.mapRepo = mapRepo;
    }

    @Override
    public void run(String... args) {
        if (characterRepo.count() == 0) seedCharacters();
        if (mapRepo.count() == 0) seedMaps();
    }

    private void seedCharacters() {
        characterRepo.save(character("hero1", "HERO ONE", "+10% HEALTH",
                "heroPP_1", "heroBg_1", 0, true, 1));

        characterRepo.save(character("hero2", "HERO TWO", "+10% SPEED",
                "heroPP_2", "heroBg_2", 0, true, 2));

        int[] costs = { 500, 750, 1000, 1500, 2000, 3000 };
        for (int i = 0; i < 6; i++) {
            characterRepo.save(character(
                    "hero" + (i + 3),
                    "LOCKED",
                    "",
                    null, null,
                    costs[i],
                    false,
                    i + 3));
        }
    }

    private void seedMaps() {
        mapRepo.save(map("arena1", "Ninja Academy", "arenaBg", 0, true, 1));
        mapRepo.save(map("arena2", "Ocean View Park", "arena2Bg", 0, false, 2));
    }

    private GameCharacter character(String code, String name, String ability,
                                   String icon, String largeImg,
                                   int cost, boolean isDefault, int order) {
        GameCharacter c = new GameCharacter();
        c.setCode(code);
        c.setDisplayName(name);
        c.setAbilityText(ability);
        c.setIconKey(icon);
        c.setLargeImgKey(largeImg);
        c.setUnlockCost(cost);
        c.setDefault(isDefault);
        c.setSortOrder(order);
        return c;
    }

    private GameMap map(String code, String name, String bgKey,
                        int cost, boolean available, int order) {
        GameMap m = new GameMap();
        m.setCode(code);
        m.setDisplayName(name);
        m.setBgKey(bgKey);
        m.setUnlockCost(cost);
        m.setAvailable(available);
        m.setSortOrder(order);
        return m;
    }
}