package battle_arena_api.repository;

import battle_arena_api.entity.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    Optional<Friendship> findByRequesterIdAndAddresseeId(Long requesterId, Long addresseeId);

    // Either direction, since a relationship could have been requested by either side
    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requesterId = :a AND f.addresseeId = :b) OR " +
           "(f.requesterId = :b AND f.addresseeId = :a)")
    Optional<Friendship> findBetween(@Param("a") Long a, @Param("b") Long b);

    @Query("SELECT f FROM Friendship f WHERE f.status = 'ACCEPTED' AND " +
           "(f.requesterId = :playerId OR f.addresseeId = :playerId)")
    List<Friendship> findAcceptedFor(@Param("playerId") Long playerId);

    List<Friendship> findByAddresseeIdAndStatus(Long addresseeId, Friendship.Status status);

    List<Friendship> findByRequesterIdAndStatus(Long requesterId, Friendship.Status status);
}