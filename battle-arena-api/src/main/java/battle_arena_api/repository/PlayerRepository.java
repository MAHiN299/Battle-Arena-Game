package battle_arena_api.repository;

import battle_arena_api.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PlayerRepository extends JpaRepository<Player, Long> {
    Optional<Player> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    // New: friend search — up to 10 usernames containing the query (case-insensitive)
    List<Player> findTop10ByUsernameContainingIgnoreCaseOrderByUsernameAsc(String usernameFragment);
}