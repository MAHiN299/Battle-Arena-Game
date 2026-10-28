// ============================================================
// Canonical color palette. One source of truth, so no screen
// drifts to a near-duplicate shade of gold/green/red picked
// independently. New UI should reference these rather than
// typing hex values directly.
// ============================================================

export const THEME = {
    font: 'Impact, sans-serif',

    gold:    '#ffcc00',   // primary accent — titles, coins, achievements
    white:   '#ffffff',   // primary body text
    grey:    '#888888',   // secondary/muted text
    dimGrey: '#666666',   // tertiary/disabled text

    good:    '#8cff9b',   // success, victory, positive stat
    bad:     '#ff5555',   // danger, defeat, warning
    warn:    '#ff9966',   // caution, in-between state

    red:     '#ff5555',   // team red / player 1
    blue:    '#5599ff',   // team blue / player 2

    black:   '#000000'
};