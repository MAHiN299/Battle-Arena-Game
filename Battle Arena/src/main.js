import Phaser from "phaser";

import PreloadScene from './scenes/PreloadScene'; 
import TitleScreen from './scenes/TitleScreen';
import MenuScene from './scenes/MenuScene';
import Game from './scenes/Game';
import OptionScene from './scenes/OptionScene'; 
import PauseScene from './scenes/PauseScene';
import MapSelect from "./scenes/MapSelect";
import CharacterSelect from "./scenes/CharSelect";
import UIScene from './scenes/UIScene'; 

import WaveShopScene from './scenes/WaveShopScene';
import GameOver from './scenes/GameOver';
import LeaderboardScene from './scenes/LeaderboardScene';

// Newly Added 
import LoginScene from './scenes/LoginScene';
import ShopScene from './scenes/ShopScene';

import TDMScene from './scenes/TDMScene';
import LobbyScene from './scenes/LobbyScene';
import OnlineCharSelect from './scenes/OnlineCharSelect';
import ChatOverlayScene from './scenes/ChatOverlayScene';
import GlobalChatScene from './scenes/GlobalChatScene';
import FriendsScene from './scenes/FriendsScene';
import ProfileScene from './scenes/ProfileScene';
import DirectMessageScene from './scenes/DirectMessageScene';
import MatchReplayScene from './scenes/MatchReplayScene';

import api from './api/api';
// New: CSS for the DOM-based Friends screen and invite popup
import './ui/overlays.css';
// New: global direct-invite popup, works on top of any scene
import { initInviteOverlay } from './ui/InviteOverlay';

const config = {
    type: Phaser.AUTO,
    // Scale Manager for responsive viewport handling
    scale: {
        mode: Phaser.Scale.FIT, // যেকোনো স্ক্রিনে পারফেক্টলি ফিট হবে
        autoCenter: Phaser.Scale.CENTER_BOTH, // সব সময় স্ক্রিনের মাঝখানে থাকবে
        width: 1480, // 💡 একটি নির্দিষ্ট উইডথ (যেমন: 1280 বা 1920)
        height: 700  // 💡 একটি নির্দিষ্ট হাইট (যেমন: 720 বা 1080)
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1200 },
            debug: false
        }
    },
    input: {
        gamepad: true 
    },
    scene: [
        PreloadScene, TitleScreen, LoginScene, MenuScene, ShopScene,
        MapSelect, CharacterSelect, OnlineCharSelect, Game, GameOver, 
        LeaderboardScene, TDMScene, LobbyScene, WaveShopScene, FriendsScene,
        ProfileScene, DirectMessageScene, MatchReplayScene, OptionScene, PauseScene, UIScene,
        ChatOverlayScene, GlobalChatScene
    ]
};

const game = new Phaser.Game(config);

// New: exposed so InviteOverlay.js (a plain DOM module outside any
// scene) can start LobbyScene after the player accepts an invite
window.__battleArenaGame = game;

// New: one global popup for direct co-op invites, independent of
// whichever scene happens to be active when it arrives
initInviteOverlay();

// One centralized handler for the whole game: whenever any API
// call anywhere discovers the session has expired, force the
// player back to login with a clear message, rather than leaving
// them stuck on a screen that's silently failing piece by piece.
api.onSessionExpired(() => {
    const active = game.scene.getScenes(true)[0];
    if (!active) return;
    if (active.scene.key === 'LoginScene') return;   // already there
    active.scene.start('LoginScene', { sessionExpired: true });
});