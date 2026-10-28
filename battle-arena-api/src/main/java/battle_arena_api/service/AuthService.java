package battle_arena_api.service;

import battle_arena_api.dto.*;
import battle_arena_api.entity.Player;
import battle_arena_api.repository.PlayerRepository;
import battle_arena_api.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final PlayerRepository playerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(PlayerRepository playerRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.playerRepository = playerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse register(RegisterRequest request) {
        if (playerRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken");
        }
        if (playerRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        Player player = new Player();
        player.setUsername(request.getUsername());
        player.setEmail(request.getEmail());
        player.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        player.setCoins(0);

        playerRepository.save(player);

        String token = jwtUtil.generateToken(player.getUsername());
        return new AuthResponse(token, player.getUsername(), player.getCoins());
    }

    public AuthResponse login(LoginRequest request) {
        Player player = playerRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), player.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(player.getUsername());
        return new AuthResponse(token, player.getUsername(), player.getCoins());
    }
}