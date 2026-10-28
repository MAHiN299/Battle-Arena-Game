// ============================================================
// Preset messages for mid-fight communication, since typing
// during a wave is not realistic.
// ============================================================

export const QUICK_MESSAGES = [
    { key: '1', text: 'Need ammo!',     color: '#ffcc44', icon: '\u25AC' },
    { key: '2', text: 'Help me!',       color: '#ff5555', icon: '\u2757' },
    { key: '3', text: 'Covering you',   color: '#88ff9b', icon: '\u2713' },
    { key: '4', text: 'Push forward',   color: '#76d7ff', icon: '\u25B6' },
    { key: '5', text: 'Falling back',   color: '#ffaa66', icon: '\u25C0' },
    { key: '6', text: 'Nice shot!',     color: '#ffcc44', icon: '\u2605' }
];

export function findQuick(key)
{
    return QUICK_MESSAGES.find(m => m.key === key) || null;
}

// ============================================================
// Some of these same digit keys double as gameplay hotkeys elsewhere
// (boss-fight supplies use 1/2/3 for Ammo/Grenade/Health in Game.js).
// Both listeners are bound independently — ChatPanel on `document`,
// gameplay via Phaser's keyboard plugin — so without this, one
// keypress fired both a quick-chat line AND used a supply. Whoever
// owns the gameplay hotkey calls setKeysReservedForGameplay while its
// feature is active; ChatPanel checks isKeyReservedForGameplay before
// sending a quick message for that key.
// ============================================================
const reservedKeys = new Set();

export function setKeysReservedForGameplay(keys, reserved)
{
    keys.forEach(k => { if (reserved) reservedKeys.add(k); else reservedKeys.delete(k); });
}

export function isKeyReservedForGameplay(key)
{
    return reservedKeys.has(key);
}