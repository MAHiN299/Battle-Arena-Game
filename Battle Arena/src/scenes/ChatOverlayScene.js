import Phaser from 'phaser';
import ChatPanel from '../net/ChatPanel';
import net from '../net/NetClient';

// ============================================================
// Runs in parallel with LobbyScene, OnlineCharSelect, and Game.
// Launched once on connect, stopped once on disconnect — chat
// history and the open/closed state persist across all three.
// ============================================================

export default class ChatOverlayScene extends Phaser.Scene
{
    constructor() {
        super('ChatOverlayScene');
    }

    create()
    {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Anchored so the icon itself lands top-right, out of the play area
        this.chat = new ChatPanel(this, {
            x: w - 400, y: 90, width: 380, height: 260
        });

        this.onDisconnected = () => {
            if (this.scene.isActive()) this.scene.stop();
        };

        net.on('disconnected', this.onDisconnected);

        this.events.once('shutdown', () => {
            net.off('disconnected', this.onDisconnected);
        });
    }

    isCapturingInput()
    {
        return this.chat ? this.chat.isCapturingInput() : false;
    }
}