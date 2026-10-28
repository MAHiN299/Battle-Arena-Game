import Phaser from 'phaser';
import api from '../api/api';
import net from '../net/NetClient';

// New: the Friends screen is now a real CSS/DOM panel (like the login
// screen) instead of hand-drawn Phaser canvas rows — search, friend
// list and requests all live in Battle Arena/src/ui/overlays.css.
// The Phaser scene itself just dims the background and owns the
// overlay's lifecycle (build on create, tear down on shutdown).
export default class FriendsScene extends Phaser.Scene
{
    constructor() { super('FriendsScene'); }

    create()
    {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.rectangle(0, 0, w, h, 0x08080a).setOrigin(0, 0);

        this.searchDebounce = null;
        this.buildOverlay();
        this.loadAll();

        // Server pushes one of these the moment someone sends, accepts,
        // declines, or removes a request, or sends a direct message — so
        // this screen refreshes itself live to show new events and unread
        // tags. (Direct-invite events are handled globally by InviteOverlay.)
        this.friendEventTypes = [
            'friendRequestReceived', 'friendRequestAccepted',
            'friendRequestDeclined', 'friendRemoved', 'directMessage'
        ];
        this.onFriendEvent = () => this.loadAll();
        this.friendEventTypes.forEach(t => net.on(t, this.onFriendEvent));

        this.events.once('shutdown', () => {
            this.friendEventTypes.forEach(t => net.off(t, this.onFriendEvent));
            clearTimeout(this.searchDebounce);
            this.destroyOverlay();
        });
    }

    // ============================================================
    // DOM OVERLAY LIFECYCLE
    // ============================================================
    buildOverlay()
    {
        const el = document.createElement('div');
        el.id = 'friends-overlay';
        el.innerHTML = `
            <div id="friends-panel">
                <div id="friends-header">
                    <h2>FRIENDS</h2>
                    <button id="friends-back">&lt; BACK</button>
                </div>
                <div id="friends-search-row">
                    <input id="friends-search-input" type="text" placeholder="Search by username..." autocomplete="off">
                </div>
                <div id="friends-search-results"></div>
                <div id="friends-flash"></div>
                <div id="friends-section-incoming"></div>
                <div id="friends-section-list"></div>
                <div id="friends-section-outgoing"></div>
            </div>
        `;
        document.body.appendChild(el);
        this.overlayEl = el;

        requestAnimationFrame(() => el.classList.add('visible'));

        el.querySelector('#friends-back').addEventListener('click', () => {
            this.scene.start('MenuScene');
        });

        const searchInput = el.querySelector('#friends-search-input');
        searchInput.addEventListener('input', () => {
            clearTimeout(this.searchDebounce);
            const q = searchInput.value.trim();
            if (q.length < 2) {
                el.querySelector('#friends-search-results').innerHTML = '';
                return;
            }
            this.searchDebounce = setTimeout(() => this.runSearch(q), 300);
        });
    }

    destroyOverlay()
    {
        if (this.overlayEl) {
            this.overlayEl.remove();
            this.overlayEl = null;
        }
    }

    // ============================================================
    // SEARCH
    // ============================================================
    async runSearch(query)
    {
        const box = this.overlayEl.querySelector('#friends-search-results');
        try {
            const results = await api.searchPlayers(query);
            if (results.length === 0) {
                box.innerHTML = '<div class="friends-empty">No players found</div>';
                return;
            }

            box.innerHTML = results.map(r => {
                let actionHtml;
                if (r.relation === 'friends') {
                    actionHtml = '<span class="pending-label">Already friends</span>';
                } else if (r.relation === 'pending_outgoing') {
                    actionHtml = '<span class="pending-label">Request sent</span>';
                } else if (r.relation === 'pending_incoming') {
                    actionHtml = '<span class="pending-label">Sent you a request</span>';
                } else {
                    actionHtml = `<button class="friend-action-btn add" data-username="${r.username}">ADD</button>`;
                }
                return `<div class="friend-row">
                            <span class="friend-name clickable" data-username="${this.escape(r.username)}">${this.escape(r.username)}</span>
                            ${actionHtml}
                        </div>`;
            }).join('');

            box.querySelectorAll('.friend-action-btn.add').forEach(btn => {
                btn.addEventListener('click', () => this.sendRequestTo(btn.dataset.username));
            });
            box.querySelectorAll('.friend-name.clickable').forEach(el => {
                el.addEventListener('click', () => {
                    this.scene.start('ProfileScene', { username: el.dataset.username });
                });
            });
        } catch (err) {
            box.innerHTML = '<div class="friends-empty">' + this.escape(err.message) + '</div>';
        }
    }

    async sendRequestTo(username)
    {
        try {
            await api.sendFriendRequest(username);
            this.flash('Request sent to ' + username, '#8cff9b');
            this.runSearch(this.overlayEl.querySelector('#friends-search-input').value.trim());
            this.loadAll();
        } catch (err) {
            this.flash(err.message, '#ff7b7b');
        }
    }

    // ============================================================
    // FRIENDS / REQUESTS LIST
    // ============================================================
    async loadAll()
    {
        if (!this.overlayEl) return;

        try {
            const [friends, incoming, outgoing, unread] = await Promise.all([
                api.getFriends(), api.getIncomingRequests(), api.getOutgoingRequests(), api.getUnreadFrom()
            ]);
            const unreadSet = new Set(unread);

            this.renderIncoming(incoming);
            this.renderFriends(friends, unreadSet);
            this.renderOutgoing(outgoing);
        } catch (err) {
            this.flash('Could not load — ' + err.message, '#ff7b7b');
        }
    }

    renderIncoming(incoming)
    {
        const el = this.overlayEl.querySelector('#friends-section-incoming');
        if (incoming.length === 0) { el.innerHTML = ''; return; }

        el.innerHTML = '<div class="friends-section-title">INCOMING REQUESTS</div>' +
            incoming.map(r => `
                <div class="friend-row">
                    <span class="friend-name">${this.escape(r.username)}</span>
                    <button class="friend-action-btn accept" data-id="${r.friendshipId}">ACCEPT</button>
                    <button class="friend-action-btn decline" data-id="${r.friendshipId}">DECLINE</button>
                </div>
            `).join('');

        el.querySelectorAll('.friend-action-btn.accept').forEach(btn => {
            btn.addEventListener('click', () => this.respond(btn.dataset.id, true));
        });
        el.querySelectorAll('.friend-action-btn.decline').forEach(btn => {
            btn.addEventListener('click', () => this.respond(btn.dataset.id, false));
        });
    }

    async respond(friendshipId, accept)
    {
        try {
            if (accept) await api.acceptFriendRequest(friendshipId);
            else await api.declineFriendRequest(friendshipId);
            this.loadAll();
        } catch (err) {
            this.flash(err.message, '#ff7b7b');
        }
    }

    renderFriends(friends, unreadSet)
    {
        const el = this.overlayEl.querySelector('#friends-section-list');
        const title = `<div class="friends-section-title">FRIENDS (${friends.length})</div>`;

        if (friends.length === 0) {
            el.innerHTML = title + '<div class="friends-empty">No friends yet — search above to add one</div>';
            return;
        }

        el.innerHTML = title + friends.map(f => {
            const newTag = unreadSet.has(f.username) ? '<span class="new-tag">NEW</span>' : '';
            // Only an online friend can be invited directly into a room
            const inviteBtn = f.online
                ? `<button class="friend-action-btn invite" data-username="${f.username}">INVITE</button>`
                : '';
            return `
                <div class="friend-row">
                    <span class="online-dot${f.online ? ' online' : ''}"></span>
                    <span class="friend-name clickable" data-username="${this.escape(f.username)}">${this.escape(f.username)}</span>
                    ${newTag}
                    ${inviteBtn}
                    <button class="friend-action-btn message" data-username="${f.username}">MESSAGE</button>
                    <button class="friend-action-btn remove" data-id="${f.friendshipId}">REMOVE</button>
                </div>
            `;
        }).join('');

        el.querySelectorAll('.friend-name.clickable').forEach(nameEl => {
            nameEl.addEventListener('click', () => {
                this.scene.start('ProfileScene', { username: nameEl.dataset.username });
            });
        });
        el.querySelectorAll('.friend-action-btn.invite').forEach(btn => {
            btn.addEventListener('click', () => this.inviteFriend(btn.dataset.username));
        });
        el.querySelectorAll('.friend-action-btn.message').forEach(btn => {
            btn.addEventListener('click', () => {
                this.scene.start('DirectMessageScene', { friendUsername: btn.dataset.username });
            });
        });
        el.querySelectorAll('.friend-action-btn.remove').forEach(btn => {
            btn.addEventListener('click', () => this.removeFriend(btn.dataset.id));
        });
    }

    // New: send a direct co-op invite over the WebSocket — the friend
    // gets an accept/decline popup wherever they currently are, no room
    // code needed on either side.
    inviteFriend(username)
    {
        net.sendDirectInvite(username);
        this.flash('Invite sent to ' + username, '#76d7ff');
    }

    async removeFriend(friendshipId)
    {
        try {
            await api.removeFriend(friendshipId);
            this.loadAll();
        } catch (err) {
            this.flash(err.message, '#ff7b7b');
        }
    }

    renderOutgoing(outgoing)
    {
        const el = this.overlayEl.querySelector('#friends-section-outgoing');
        if (outgoing.length === 0) { el.innerHTML = ''; return; }

        el.innerHTML = '<div class="friends-section-title">PENDING (sent by you)</div>' +
            outgoing.map(r => `
                <div class="friend-row">
                    <span class="friend-name">${this.escape(r.username)}</span>
                    <span class="pending-label">waiting for response</span>
                </div>
            `).join('');
    }

    // ============================================================
    // HELPERS
    // ============================================================
    flash(text, color)
    {
        const el = this.overlayEl?.querySelector('#friends-flash');
        if (!el) return;
        el.textContent = text;
        el.style.color = color;
        el.style.opacity = '1';
        clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
    }

    escape(str)
    {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}