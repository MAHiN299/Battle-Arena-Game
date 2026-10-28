package battle_arena_api.controller;

import battle_arena_api.dto.CharacterDto;
import battle_arena_api.dto.MapDto;
import battle_arena_api.service.CatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

       @GetMapping("/characters")
    public ResponseEntity<List<CharacterDto>> getCharacters(
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(catalogService.getOwnedCharactersFor(username));
    }

    @GetMapping("/shop/characters")
    public ResponseEntity<List<CharacterDto>> getShopCharacters(
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(catalogService.getShopCharactersFor(username));
    }

    @GetMapping("/maps")
    public ResponseEntity<List<MapDto>> getMaps(
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(catalogService.getMapsFor(username));
    }
}