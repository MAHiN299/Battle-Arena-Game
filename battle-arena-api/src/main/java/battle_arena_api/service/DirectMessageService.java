package battle_arena_api.service;

import battle_arena_api.dto.DirectMessageDto;
import battle_arena_api.entity.DirectMessage;
import battle_arena_api.entity.Friendship;
import battle_arena_api.entity.MessageReadState;
import battle_arena_api.entity.Player;
import battle_arena_api.repository.DirectMessageRepository;
import battle_arena_api.repository.FriendshipRepository;
import battle_arena_api.repository.MessageReadStateRepository;
import battle_arena_api.repository.PlayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class DirectMessageService {

    @FunctionalInterface
    public interface DirectMessageNotifier {
        void notify(String toUsername, String fromUsername, String text, String createdAt);
    }

    private final PlayerRepository playerRepo;
    private final FriendshipRepository friendRepo;
    private final DirectMessageRepository messageRepo;
    private final MessageReadStateRepository readStateRepo;

    private DirectMessageNotifier notifier = (to, from, text, createdAt) -> {};

    public DirectMessageService(PlayerRepository playerRepo, FriendshipRepository friendRepo,
                                 DirectMessageRepository messageRepo, MessageReadStateRepository readStateRepo) {
        this.playerRepo = playerRepo;
        this.friendRepo = friendRepo;
        this.messageRepo = messageRepo;
        this.readStateRepo = readStateRepo;
    }

    public void setNotifier(DirectMessageNotifier notifier) {
        this.notifier = notifier;
    }

    @Transactional
    public DirectMessageDto sendMessage(String username, String targetUsername, String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Message can't be empty");
        }
        String trimmed = text.trim();
        if (trimmed.length() > 500) {
            trimmed = trimmed.substring(0, 500);
        }

        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));
        Player target = playerRepo.findByUsername(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("No player with that username"));

        requireFriends(me, target);

        DirectMessage m = new DirectMessage();
        m.setSenderId(me.getId());
        m.setReceiverId(target.getId());
        m.setText(trimmed);
        messageRepo.save(m);

        String createdAtIso = m.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        notifier.notify(target.getUsername(), me.getUsername(), trimmed, createdAtIso);

        return new DirectMessageDto(m.getId(), me.getUsername(), target.getUsername(), trimmed, m.getCreatedAt());
    }

    @Transactional
    public List<DirectMessageDto> getConversation(String username, String targetUsername) {
        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));
        Player target = playerRepo.findByUsername(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("No player with that username"));

        requireFriends(me, target);

        List<DirectMessageDto> result = messageRepo.findConversation(me.getId(), target.getId()).stream()
                .map(m -> {
                    String from = m.getSenderId().equals(me.getId()) ? me.getUsername() : target.getUsername();
                    String to = m.getSenderId().equals(me.getId()) ? target.getUsername() : me.getUsername();
                    return new DirectMessageDto(m.getId(), from, to, m.getText(), m.getCreatedAt());
                })
                .toList();

        // Opening the conversation counts as reading it
        upsertReadState(me.getId(), target.getId());

        return result;
    }

    @Transactional
    public void markRead(String username, String targetUsername) {
        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));
        Player target = playerRepo.findByUsername(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("No player with that username"));

        requireFriends(me, target);
        upsertReadState(me.getId(), target.getId());
    }

    public List<String> getUnreadFromUsernames(String username) {
        Player me = playerRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        List<Friendship> accepted = friendRepo.findAcceptedFor(me.getId());
        List<String> unreadFrom = new ArrayList<>();

        for (Friendship f : accepted) {
            Long otherId = f.getRequesterId().equals(me.getId()) ? f.getAddresseeId() : f.getRequesterId();

            List<DirectMessage> convo = messageRepo.findConversation(me.getId(), otherId);
            if (convo.isEmpty()) continue;

            DirectMessage last = convo.get(convo.size() - 1);
            if (!last.getSenderId().equals(otherId)) continue;

            MessageReadState state = readStateRepo.findByViewerIdAndOtherId(me.getId(), otherId).orElse(null);
            boolean unread = state == null || last.getCreatedAt().isAfter(state.getLastReadAt());

            if (unread) {
                Player other = playerRepo.findById(otherId).orElse(null);
                if (other != null) unreadFrom.add(other.getUsername());
            }
        }

        return unreadFrom;
    }

    private void upsertReadState(Long viewerId, Long otherId) {
        MessageReadState state = readStateRepo.findByViewerIdAndOtherId(viewerId, otherId)
                .orElseGet(MessageReadState::new);
        state.setViewerId(viewerId);
        state.setOtherId(otherId);
        state.setLastReadAt(LocalDateTime.now());
        readStateRepo.save(state);
    }

    private void requireFriends(Player me, Player target) {
        Friendship f = friendRepo.findBetween(me.getId(), target.getId()).orElse(null);
        if (f == null || f.getStatus() != Friendship.Status.ACCEPTED) {
            throw new IllegalArgumentException("You can only message friends");
        }
    }
}