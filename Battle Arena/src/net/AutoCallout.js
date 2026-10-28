import net from './NetClient';

// ============================================================
// The game announces its own events into chat, so both players
// stay informed without anyone typing.
// ============================================================

export default class AutoCallout
{
    constructor(scene)
    {
        this.scene = scene;
        this.wire();
    }

    wire()
    {
        const s = this.scene;

        s.events.on('waveStarted', (n) => {
            this.say(n === 10 ? 'FINAL WAVE — boss incoming' : 'Wave ' + n + ' incoming');
        });

        s.events.on('waveCleared', (n) => {
            this.say('Wave ' + n + ' cleared');
        });

        s.events.on('playerHealthChanged', (p) => {
            if (p.isDead && !p.calloutDown) {
                p.calloutDown = true;
                this.say((p.netName || 'Player') + ' is down');
            }
            else if (!p.isDead && p.calloutDown) {
                p.calloutDown = false;
                this.say((p.netName || 'Player') + ' is back up');
            }
            else if (!p.isDead && (p.hp / p.maxHp) <= 0.25 && !p.calloutLow) {
                p.calloutLow = true;
                this.say((p.netName || 'Player') + ' is critical');
            }
            else if ((p.hp / p.maxHp) > 0.4) {
                p.calloutLow = false;
            }
        });

        s.events.on('crateDestroyed', () => {
            this.say('Supply crate destroyed');
        });

        s.events.on('bombDefused', () => {
            this.say('Bomb defused');
        });
    }

    // Local only — the other client generates its own callouts
    // from the same events, so nothing crosses the network
    say(text)
    {
        net.emit('chat', {
            type: 'chat',
            from: '',
            text,
            system: true
        });
    }
}