package battle_arena_api.repository;

import battle_arena_api.entity.MessageReadState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MessageReadStateRepository extends JpaRepository<MessageReadState, Long> {
    Optional<MessageReadState> findByViewerIdAndOtherId(Long viewerId, Long otherId);
}