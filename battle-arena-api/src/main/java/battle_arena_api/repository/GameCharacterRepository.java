package battle_arena_api.repository;

import battle_arena_api.entity.GameCharacter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GameCharacterRepository extends JpaRepository<GameCharacter, Long> {
    List<GameCharacter> findAllByOrderBySortOrderAsc();
    Optional<GameCharacter> findByCode(String code);
}