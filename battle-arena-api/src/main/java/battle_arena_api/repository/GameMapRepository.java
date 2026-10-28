package battle_arena_api.repository;

import battle_arena_api.entity.GameMap;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GameMapRepository extends JpaRepository<GameMap, Long> {
    List<GameMap> findAllByOrderBySortOrderAsc();
    Optional<GameMap> findByCode(String code);
}