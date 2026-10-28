package battle_arena_api.service;

import battle_arena_api.dto.CharacterDto;
import battle_arena_api.dto.MapDto;
import battle_arena_api.entity.*;
import battle_arena_api.repository.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CatalogService {

    // Characters that actually have sprites loaded in PreloadScene
    private static final Set<String> PLAYABLE_CHARACTERS = Set.of("hero1", "hero2");

    private final GameCharacterRepository characterRepo;
    private final GameMapRepository mapRepo;
    private final PlayerUnlockRepository unlockRepo;
    private final PlayerRepository playerRepo;

    public CatalogService(GameCharacterRepository characterRepo,
                          GameMapRepository mapRepo,
                          PlayerUnlockRepository unlockRepo,
                          PlayerRepository playerRepo) {
        this.characterRepo = characterRepo;
        this.mapRepo = mapRepo;
        this.unlockRepo = unlockRepo;
        this.playerRepo = playerRepo;
    }

    // Every character, with per-player lock state
    public List<CharacterDto> getCharactersFor(String username) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        Set<String> owned = unlockRepo
                .findByPlayerIdAndItemType(player.getId(), "CHARACTER")
                .stream()
                .map(PlayerUnlock::getItemCode)
                .collect(Collectors.toSet());

        return characterRepo.findAllByOrderBySortOrderAsc().stream()
                .map(c -> {
                    boolean unlocked = c.isDefault() || owned.contains(c.getCode());
                    boolean playable = unlocked && PLAYABLE_CHARACTERS.contains(c.getCode());

                    return new CharacterDto(
                            c.getCode(),
                            c.getDisplayName(),
                            c.getAbilityText(),
                            c.getIconKey(),
                            c.getLargeImgKey(),
                            c.getUnlockCost(),
                            !unlocked,
                            playable
                    );
                })
                .toList();
    }

    // Only what the player can actually use — for CharSelect
    public List<CharacterDto> getOwnedCharactersFor(String username) {
        return getCharactersFor(username).stream()
                .filter(c -> !c.isLocked() && c.isPlayable())
                .toList();
    }

    // Everything not yet owned — for the shop
    public List<CharacterDto> getShopCharactersFor(String username) {
        return getCharactersFor(username).stream()
                .filter(CharacterDto::isLocked)
                .toList();
    }

    public List<MapDto> getMapsFor(String username) {
        Player player = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        Set<String> owned = unlockRepo
                .findByPlayerIdAndItemType(player.getId(), "MAP")
                .stream()
                .map(PlayerUnlock::getItemCode)
                .collect(Collectors.toSet());

        return mapRepo.findAllByOrderBySortOrderAsc().stream()
                .map(m -> {
                    boolean unlocked = m.getUnlockCost() == 0 || owned.contains(m.getCode());

                    return new MapDto(
                            m.getCode(),
                            m.getDisplayName(),
                            m.getBgKey(),
                            m.getUnlockCost(),
                            !unlocked,
                            m.isAvailable()
                    );
                })
                .toList();
    }

    public boolean isPlayable(String characterCode, String username) {
        return getCharactersFor(username).stream()
                .anyMatch(c -> c.getCode().equals(characterCode) && c.isPlayable());
    }
}