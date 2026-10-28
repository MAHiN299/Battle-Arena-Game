package battle_arena_api.repository;

import battle_arena_api.entity.PlayerConsumable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PlayerConsumableRepository extends JpaRepository<PlayerConsumable, Long> {
    List<PlayerConsumable> findByPlayerId(Long playerId);
    Optional<PlayerConsumable> findByPlayerIdAndItemCode(Long playerId, String itemCode);
}