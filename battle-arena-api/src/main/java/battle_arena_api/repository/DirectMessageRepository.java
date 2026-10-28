package battle_arena_api.repository;

import battle_arena_api.entity.DirectMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {

    @Query("SELECT m FROM DirectMessage m WHERE " +
           "(m.senderId = :a AND m.receiverId = :b) OR " +
           "(m.senderId = :b AND m.receiverId = :a) " +
           "ORDER BY m.createdAt ASC")
    List<DirectMessage> findConversation(@Param("a") Long a, @Param("b") Long b);
}