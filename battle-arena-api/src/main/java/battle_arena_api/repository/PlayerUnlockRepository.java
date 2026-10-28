package battle_arena_api.repository;

import battle_arena_api.entity.PlayerUnlock;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlayerUnlockRepository extends JpaRepository<PlayerUnlock, Long> {
    List<PlayerUnlock> findByPlayerIdAndItemType(Long playerId, String itemType);
    boolean existsByPlayerIdAndItemTypeAndItemCode(Long playerId, String itemType, String itemCode);
}