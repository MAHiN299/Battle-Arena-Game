import Phaser from 'phaser';
import api from '../api/api';
import net from '../net/NetClient';
import audioManager from '../managers/AudioManager';
import profileBgAsset from '../Assets/ui/profileBg.jpg';

// ============================================================
// Player Profile — full-screen CSS/DOM dashboard (not a popup),
// built from the layout/visual style the user supplied, with the
// user's own background photo behind translucent panels.
//
// Shows either YOUR OWN profile (badge picker, coins, Settings)
// or ANOTHER PLAYER's public profile (Add Friend / Message,
// read-only badges) depending on whether a target username was
// passed in. Match history refreshes live over the WebSocket the
// moment a new match is recorded, and matches with a saved
// "final moments" replay get a ▶ REPLAY button.
// ============================================================
export default class ProfileScene extends Phaser.Scene
{
    constructor() { super('ProfileScene'); }

    init(data)
    {
        this.targetUsername = (data && data.username) ? data.username : null;
    }

    create()
    {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.rectangle(0, 0, w, h, 0x08080a).setOrigin(0, 0);

        this.myUsername = (api.getUser() || {}).username || null;
        this.isSelf = !this.targetUsername || (this.myUsername && this.targetUsername === this.myUsername);
        this.viewUsername = this.isSelf ? this.myUsername : this.targetUsername;

        this.buildOverlay();
        this.loadAll();

        if (this.isSelf) {
            this.buildSettingsForms();

            // Your own run just got recorded somewhere (this tab or
            // another device) — pull fresh history + totals right away.
            this.onMatchRecorded = () => this.refreshMatchData(true);
            net.on('matchRecorded', this.onMatchRecorded);
        } else {
            // Viewing someone else — keep their online dot and relation
            // button live instead of frozen at whatever was true when
            // this screen opened.
            this.onFriendOnline = (msg) => this.onPresenceEvent(msg, true);
            this.onFriendOffline = (msg) => this.onPresenceEvent(msg, false);
            net.on('friendOnline', this.onFriendOnline);
            net.on('friendOffline', this.onFriendOffline);

            this.onRelationChanged = (msg) => {
                if (msg && msg.otherUsername === this.viewUsername) {
                    this.refreshRelation();
                }
            };
            this.relationEventTypes = ['friendRequestAccepted', 'friendRequestDeclined', 'friendRemoved'];
            this.relationEventTypes.forEach(t => net.on(t, this.onRelationChanged));
        }

        this.events.once('shutdown', () => {
            if (this.onMatchRecorded) net.off('matchRecorded', this.onMatchRecorded);
            if (this.onFriendOnline) net.off('friendOnline', this.onFriendOnline);
            if (this.onFriendOffline) net.off('friendOffline', this.onFriendOffline);
            if (this.onRelationChanged) this.relationEventTypes.forEach(t => net.off(t, this.onRelationChanged));
            this.destroyOverlay();
        });
    }

    // A friend of ours (or the person we're viewing) just connected or
    // disconnected. Only the online dot cares — update it in place
    // rather than re-fetching the whole profile.
    onPresenceEvent(msg, online)
    {
        if (!msg || msg.username !== this.viewUsername) return;
        if (this.profile) this.profile.online = online;
        const dot = this.overlayEl?.querySelector('.avatar .online-dot');
        if (dot) dot.classList.toggle('online', online);
    }

    // The friendship between us and the profile we're viewing just
    // changed (request accepted/declined, or unfriended) — refresh just
    // the relation field so the Add-Friend/Message buttons stay correct.
    async refreshRelation()
    {
        try {
            const fresh = await api.getPublicProfile(this.viewUsername);
            this.profile = fresh;
            this.renderCard();
        } catch (err) {
            // Non-critical — leave the last-known buttons on screen
        }
    }

    // ============================================================
    // DOM OVERLAY LIFECYCLE
    // ============================================================
    buildOverlay()
    {
        const el = document.createElement('div');
        el.id = 'profile-overlay';

        // Settings is a self-only thing — viewing someone else's
        // profile has no reason to show it
        const settingsNav = this.isSelf
            ? `<button class="nav-item" data-tab="settings"><span class="icon">⚙</span><span>Settings</span></button>`
            : '';
        const settingsSection = this.isSelf
            ? `
                <div class="card section" id="settingsSection">
                    <div class="section-title">
                        <div class="title-left"><span class="section-icon" style="color:#a8c1de">⚙</span><h2>SETTINGS</h2></div>
                    </div>
                    <div class="settings-groups" id="profile-settings-body"></div>
                </div>
            `
            : '';

        el.innerHTML = `
            <div class="bg-photo" style="background-image:url('${profileBgAsset}')"></div>
            <div class="bg-scrim"></div>

            <header class="topbar">
                <div class="brand">PROFILE<span>.</span></div>
                <button id="profile-back">&lsaquo;&nbsp; BACK</button>
            </header>

            <div class="layout">
                <aside class="sidebar">
                    <button class="nav-item active" data-tab="profile"><span class="icon">\u{1F464}</span><span>Profile</span></button>
                    <button class="nav-item" data-tab="achievements"><span class="icon">\u{1F3C6}</span><span>Achievements</span></button>
                    <button class="nav-item" data-tab="matches"><span class="icon">▣</span><span>Match History</span></button>
                    <button class="nav-item" data-tab="stats"><span class="icon">▮</span><span>Statistics</span></button>
                    ${settingsNav}
                </aside>

                <main class="content">
                    <div id="profile-flash"></div>
                    <div class="grid">
                        <section>
                            <div class="card profile-card" id="profile-card"></div>
                            <div class="stat-stack" id="profile-stat-stack"></div>
                        </section>

                        <section class="right">
                            <div class="card section" id="achievementSection">
                                <div class="section-title">
                                    <div class="title-left"><span class="section-icon">\u{1F3C6}</span><h2>ACHIEVEMENTS</h2></div>
                                </div>
                                <div class="achievements" id="profile-badges-grid"></div>
                            </div>

                            <div class="card section" id="statsSection">
                                <div class="section-title">
                                    <div class="title-left"><span class="section-icon" style="color:#53e6b0">▮</span><h2>STATISTICS</h2></div>
                                </div>
                                <div class="stats-detail-grid" id="profile-stats-detail"></div>
                            </div>

                            <div class="card section" id="historySection">
                                <div class="section-title">
                                    <div class="title-left">
                                        <span class="section-icon" style="color:#54dcff">◷</span>
                                        <h2>MATCH HISTORY</h2>
                                        <span class="live-dot" id="profile-live-dot"></span>
                                    </div>
                                </div>
                                <div class="rows" id="profile-match-list"></div>
                            </div>

                            ${settingsSection}
                        </section>
                    </div>
                </main>
            </div>
        `;
        document.body.appendChild(el);
        this.overlayEl = el;

        requestAnimationFrame(() => el.classList.add('visible'));

        el.querySelector('#profile-back').addEventListener('click', () => {
            this.scene.start('MenuScene');
        });

        el.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => this.onNavClick(btn));
        });
    }

    onNavClick(btn)
    {
        this.overlayEl.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.tab;
        const content = this.overlayEl.querySelector('.content');

        if (tab === 'achievements') {
            this.overlayEl.querySelector('#achievementSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (tab === 'matches') {
            this.overlayEl.querySelector('#historySection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (tab === 'stats') {
            this.overlayEl.querySelector('#statsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (tab === 'settings') {
            // Settings now lives inside this same overlay (volume
            // sliders + account details) instead of routing out to the
            // old OptionScene, which had no way back to a Profile that
            // was started fresh (start() tears a scene down completely,
            // so OptionScene's Back button — which only resumes a
            // paused scene — had nothing left to resume, leaving a
            // stuck black screen).
            const section = this.overlayEl.querySelector('#settingsSection');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            content.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    destroyOverlay()
    {
        if (this.overlayEl) {
            this.overlayEl.remove();
            this.overlayEl = null;
        }
    }

    // ============================================================
    // SETTINGS (self only) — volume sliders + change username /
    // email / password. Built once as real DOM (not routed out to the
    // old OptionScene, which had no working way back here).
    // ============================================================
    buildSettingsForms()
    {
        const body = this.overlayEl.querySelector('#profile-settings-body');
        if (!body) return;

        body.innerHTML = `
            <div class="settings-group">
                <h3>Audio</h3>
                <div class="settings-slider-row">
                    <label>Master Vol</label>
                    <input type="range" id="settings-master-vol" min="0" max="100" step="5" value="${Math.round(audioManager.masterVolume * 100)}">
                    <span class="settings-slider-val" id="settings-master-val">${Math.round(audioManager.masterVolume * 100)}%</span>
                </div>
                <div class="settings-slider-row">
                    <label>Music Vol</label>
                    <input type="range" id="settings-music-vol" min="0" max="100" step="5" value="${Math.round(audioManager.musicVolume * 100)}">
                    <span class="settings-slider-val" id="settings-music-val">${Math.round(audioManager.musicVolume * 100)}%</span>
                </div>
            </div>

            <hr class="settings-divider">

            <div class="settings-group">
                <h3>Change Username</h3>
                <div class="settings-row">
                    <input class="settings-input" id="settings-new-username" type="text" placeholder="New username" autocomplete="off">
                </div>
                <div class="settings-row">
                    <input class="settings-input" id="settings-username-password" type="password" placeholder="Current password" autocomplete="off">
                    <button class="settings-save-btn" id="settings-save-username">SAVE</button>
                </div>
                <div class="settings-msg" id="settings-username-msg"></div>
            </div>

            <hr class="settings-divider">

            <div class="settings-group">
                <h3>Change Email</h3>
                <div class="settings-row">
                    <input class="settings-input" id="settings-new-email" type="email" placeholder="New email" autocomplete="off">
                </div>
                <div class="settings-row">
                    <input class="settings-input" id="settings-email-password" type="password" placeholder="Current password" autocomplete="off">
                    <button class="settings-save-btn" id="settings-save-email">SAVE</button>
                </div>
                <div class="settings-msg" id="settings-email-msg"></div>
            </div>

            <hr class="settings-divider">

            <div class="settings-group">
                <h3>Change Password</h3>
                <div class="settings-row">
                    <input class="settings-input" id="settings-current-password" type="password" placeholder="Current password" autocomplete="off">
                </div>
                <div class="settings-row">
                    <input class="settings-input" id="settings-new-password" type="password" placeholder="New password (min 6 chars)" autocomplete="off">
                    <button class="settings-save-btn" id="settings-save-password">SAVE</button>
                </div>
                <div class="settings-msg" id="settings-password-msg"></div>
            </div>
        `;

        // ---- Audio sliders — live, same manager the rest of the game uses ----
        const masterSlider = body.querySelector('#settings-master-vol');
        const masterVal = body.querySelector('#settings-master-val');
        masterSlider.addEventListener('input', () => {
            const v = Number(masterSlider.value) / 100;
            audioManager.setMasterVolume(v);
            masterVal.textContent = masterSlider.value + '%';
        });

        const musicSlider = body.querySelector('#settings-music-vol');
        const musicVal = body.querySelector('#settings-music-val');
        musicSlider.addEventListener('input', () => {
            const v = Number(musicSlider.value) / 100;
            audioManager.setMusicVolume(v);
            musicVal.textContent = musicSlider.value + '%';
        });

        // ---- Change username ----
        body.querySelector('#settings-save-username').addEventListener('click', async () => {
            const newUsername = body.querySelector('#settings-new-username').value.trim();
            const password = body.querySelector('#settings-username-password').value;
            const msg = body.querySelector('#settings-username-msg');

            if (!newUsername || !password) {
                this.showSettingsMsg(msg, 'Enter a new username and your current password', '#ff7b7b');
                return;
            }
            try {
                const res = await api.changeUsername(newUsername, password);
                this.myUsername = res.username;
                this.viewUsername = res.username;
                this.showSettingsMsg(msg, 'Username updated to ' + res.username, '#8cff9b');
                body.querySelector('#settings-new-username').value = '';
                body.querySelector('#settings-username-password').value = '';
                const fresh = await api.getProfile();
                this.profile = fresh;
                this.renderCard();
            } catch (err) {
                this.showSettingsMsg(msg, err.message, '#ff7b7b');
            }
        });

        // ---- Change email ----
        body.querySelector('#settings-save-email').addEventListener('click', async () => {
            const newEmail = body.querySelector('#settings-new-email').value.trim();
            const password = body.querySelector('#settings-email-password').value;
            const msg = body.querySelector('#settings-email-msg');

            if (!newEmail || !password) {
                this.showSettingsMsg(msg, 'Enter a new email and your current password', '#ff7b7b');
                return;
            }
            try {
                await api.changeEmail(newEmail, password);
                this.showSettingsMsg(msg, 'Email updated', '#8cff9b');
                body.querySelector('#settings-new-email').value = '';
                body.querySelector('#settings-email-password').value = '';
            } catch (err) {
                this.showSettingsMsg(msg, err.message, '#ff7b7b');
            }
        });

        // ---- Change password ----
        body.querySelector('#settings-save-password').addEventListener('click', async () => {
            const currentPassword = body.querySelector('#settings-current-password').value;
            const newPassword = body.querySelector('#settings-new-password').value;
            const msg = body.querySelector('#settings-password-msg');

            if (!currentPassword || newPassword.length < 6) {
                this.showSettingsMsg(msg, 'Enter your current password and a new one (min 6 chars)', '#ff7b7b');
                return;
            }
            try {
                await api.changePassword(currentPassword, newPassword);
                this.showSettingsMsg(msg, 'Password updated', '#8cff9b');
                body.querySelector('#settings-current-password').value = '';
                body.querySelector('#settings-new-password').value = '';
            } catch (err) {
                this.showSettingsMsg(msg, err.message, '#ff7b7b');
            }
        });
    }

    showSettingsMsg(el, text, color)
    {
        el.textContent = text;
        el.style.color = color;
        el.style.opacity = '1';
        clearTimeout(this.settingsMsgTimer);
        this.settingsMsgTimer = setTimeout(() => { el.style.opacity = '0'; }, 3200);
    }

    // ============================================================
    // LOAD
    // ============================================================
    async loadAll()
    {
        if (!this.viewUsername) {
            this.flash('No profile to show', '#ff7b7b');
            return;
        }

        try {
            const [profile, achievements, history, best, stats] = await Promise.all([
                this.isSelf ? api.getProfile() : api.getPublicProfile(this.viewUsername),
                this.isSelf ? api.getAchievements() : api.getAchievementsOf(this.viewUsername),
                this.isSelf ? api.getMatchHistory() : api.getMatchHistoryOf(this.viewUsername),
                this.isSelf ? api.getPersonalBest() : api.getPersonalBestOf(this.viewUsername),
                this.isSelf ? api.getStats() : api.getStatsOf(this.viewUsername)
            ]);

            this.profile = profile;
            this.achievements = achievements || [];
            this.history = history || [];
            this.best = best;
            this.stats = stats;

            this.renderCard();
            this.renderStats();
            this.renderBadges();
            this.renderMatchHistory();
        } catch (err) {
            this.flash('Could not load profile — ' + err.message, '#ff7b7b');
        }
    }

    async refreshMatchData(pulse)
    {
        try {
            const [history, best, stats] = await Promise.all([
                this.isSelf ? api.getMatchHistory() : api.getMatchHistoryOf(this.viewUsername),
                this.isSelf ? api.getPersonalBest() : api.getPersonalBestOf(this.viewUsername),
                this.isSelf ? api.getStats() : api.getStatsOf(this.viewUsername)
            ]);
            this.history = history || [];
            this.best = best;
            this.stats = stats;
            this.renderStats();
            this.renderMatchHistory();

            if (pulse) {
                const dot = this.overlayEl?.querySelector('#profile-live-dot');
                if (dot) {
                    dot.classList.add('pulse');
                    setTimeout(() => dot.classList.remove('pulse'), 2000);
                }
            }
        } catch (err) {
            // Non-critical — leave the last-loaded data on screen
        }
    }

    // ============================================================
    // IDENTITY CARD (left column)
    // ============================================================
    renderCard()
    {
        const p = this.profile;
        const card = this.overlayEl.querySelector('#profile-card');
        const initial = (p.username || '?').charAt(0).toUpperCase();

        const memberSince = p.createdAt ? this.formatDate(p.createdAt) : '';
        const idLine = (p.id !== undefined && p.id !== null)
            ? `<div class="sub">ID #${this.escape(p.id)}</div>`
            : '';
        const rankLine = p.showcaseBadgeCode
            ? `<div class="rank">★ &nbsp; ${this.escape(p.showcaseBadgeName || p.showcaseBadgeCode)}</div>`
            : '';
        const coinsRow = this.isSelf
            ? `<div class="coins">\u{1FA99} &nbsp; $${p.coins || 0}</div>`
            : '';

        // New: level badge + XP progress bar. Cosmetic only — level is
        // derived server-side from lifetime XP (LevelUtil), shown on
        // both your own and any public profile, same spirit as the
        // showcase badge above.
        let levelRow = '';
        if (p.level !== undefined && p.level !== null) {
            const into = p.xpIntoLevel || 0;
            const span = p.xpForNextLevel || 1;
            const pct = span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100;
            levelRow = `
                <div class="level-row">
                    <div class="level-badge">LV ${this.escape(p.level)}</div>
                    <div class="xp-bar"><div class="xp-bar-fill" style="width:${pct}%"></div></div>
                    <div class="xp-label">${into} / ${span} XP</div>
                </div>
            `;
        }
        const onlineDot = !this.isSelf
            ? `<span class="online-dot${p.online ? ' online' : ''}"></span>`
            : '';

        let actionsHtml = '';
        if (!this.isSelf) {
            let friendBtn;
            if (p.relation === 'friends') {
                friendBtn = `<button class="profile-add-btn" disabled>FRIENDS</button>`;
            } else if (p.relation === 'pending_outgoing') {
                friendBtn = `<button class="profile-add-btn" disabled>REQUEST SENT</button>`;
            } else if (p.relation === 'pending_incoming') {
                friendBtn = `<button class="profile-add-btn" disabled>RESPOND IN FRIENDS</button>`;
            } else {
                friendBtn = `<button class="profile-add-btn" id="profile-add-friend">ADD FRIEND</button>`;
            }
            actionsHtml = `
                <div class="profile-actions">
                    ${friendBtn}
                    <button class="profile-message-btn" id="profile-message">MESSAGE</button>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="avatar">${initial}${onlineDot}</div>
            <div class="username">${this.escape(p.username)}</div>
            ${idLine}
            ${levelRow}
            <div class="date">▣ &nbsp; ${memberSince}</div>
            ${coinsRow}
            ${rankLine}
            ${actionsHtml}
        `;

        const addBtn = card.querySelector('#profile-add-friend');
        if (addBtn) addBtn.addEventListener('click', () => this.sendFriendRequest());

        const msgBtn = card.querySelector('#profile-message');
        if (msgBtn) msgBtn.addEventListener('click', () => {
            this.scene.start('DirectMessageScene', { friendUsername: this.viewUsername });
        });
    }

    async sendFriendRequest()
    {
        try {
            await api.sendFriendRequest(this.viewUsername);
            this.flash('Friend request sent to ' + this.viewUsername, '#8cff9b');
            const fresh = await api.getPublicProfile(this.viewUsername);
            this.profile = fresh;
            this.renderCard();
        } catch (err) {
            this.flash(err.message, '#ff7b7b');
        }
    }

    // ============================================================
    // STATS (stat-stack, under the identity card)
    // ============================================================
    renderStats()
    {
        const stack = this.overlayEl.querySelector('#profile-stat-stack');
        // Real lifetime totals from the server (every match ever
        // played), not derived from the last-10 history list — those
        // still update live via refreshMatchData() after every run.
        const s = this.stats || {};
        const bestWave = (this.best && this.best.hasPlayed) ? this.best.bestWave : (s.bestWave || 0);
        const totalMatches = s.totalMatches || 0;
        const victories = s.totalVictories || 0;
        const totalKills = s.totalKills || 0;
        const winRate = s.winRatePercent || 0;

        stack.innerHTML = `
            <div class="card stat cyan">
                <div class="stat-icon">〰</div>
                <div><div class="stat-number">${bestWave}</div><div class="stat-label">Best Wave</div></div>
            </div>
            <div class="card stat green">
                <div class="stat-icon">♛</div>
                <div><div class="stat-number">${totalMatches}</div><div class="stat-label">Total Matches</div></div>
            </div>
            <div class="card stat red">
                <div class="stat-icon">⚔</div>
                <div><div class="stat-number">${victories}</div><div class="stat-label">Victories (${winRate}%)</div></div>
            </div>
            <div class="card stat cyan">
                <div class="stat-icon">☠</div>
                <div><div class="stat-number">${totalKills}</div><div class="stat-label">Total Kills</div></div>
            </div>
        `;

        this.renderDetailedStats();
    }

    // ============================================================
    // STATISTICS (full breakdown, right column — the Statistics nav
    // item scrolls here)
    // ============================================================
    renderDetailedStats()
    {
        const grid = this.overlayEl.querySelector('#profile-stats-detail');
        if (!grid) return;

        const s = this.stats || {};
        const totalMatches = s.totalMatches || 0;
        const victories = s.totalVictories || 0;
        const defeats = Math.max(0, totalMatches - victories);
        const winRate = s.winRatePercent || 0;
        const totalKills = s.totalKills || 0;
        const bestWave = (this.best && this.best.hasPlayed) ? this.best.bestWave : (s.bestWave || 0);
        const avgKills = totalMatches > 0 ? Math.round(totalKills / totalMatches) : 0;

        const items = [
            ['Total Matches', totalMatches],
            ['Victories', victories],
            ['Defeats', defeats],
            ['Win Rate', winRate + '%'],
            ['Total Kills', totalKills],
            ['Avg Kills / Match', avgKills],
            ['Best Wave Reached', bestWave]
        ];

        if (this.isSelf) {
            items.push(['Coins Earned (Total)', s.totalCoinsEarned || 0]);
        }

        grid.innerHTML = items.map(([label, value]) => `
            <div class="stats-detail-item">
                <div class="stats-detail-value">${this.escape(value)}</div>
                <div class="stats-detail-label">${this.escape(label)}</div>
            </div>
        `).join('');
    }

    // ============================================================
    // ACHIEVEMENTS
    // ============================================================
    renderBadges()
    {
        const grid = this.overlayEl.querySelector('#profile-badges-grid');

        grid.innerHTML = this.achievements.map(a => {
            const unlocked = !!a.unlocked;
            const isShowcased = this.profile && this.profile.showcaseBadgeCode === a.code;
            const canPick = this.isSelf && unlocked;

            const classes = ['achievement'];
            if (!unlocked) classes.push('locked');
            if (isShowcased) classes.push('active');
            if (canPick && !isShowcased) classes.push('clickable');

            return `
                <div class="${classes.join(' ')}" data-code="${canPick ? a.code : ''}">
                    <div class="badge">${unlocked ? '★' : '\u{1F512}'}</div>
                    <div>
                        <strong>${this.escape(a.name)}${isShowcased ? ' — SHOWN' : ''}</strong>
                        <small>${this.escape(a.description)}</small>
                    </div>
                </div>
            `;
        }).join('');

        if (this.isSelf) {
            grid.querySelectorAll('.achievement.clickable').forEach(el => {
                el.addEventListener('click', () => this.chooseBadge(el.dataset.code));
            });
        }
    }

    async chooseBadge(code)
    {
        try {
            const fresh = await api.setShowcaseBadge(code);
            this.profile = fresh;
            this.renderCard();
            this.renderBadges();
        } catch (err) {
            this.flash(err.message, '#ff7b7b');
        }
    }

    // ============================================================
    // MATCH HISTORY + REPLAY
    // ============================================================
    renderMatchHistory()
    {
        const list = this.overlayEl.querySelector('#profile-match-list');

        if (this.history.length === 0) {
            list.innerHTML = '<div class="friends-empty">No matches played yet</div>';
            return;
        }

        list.innerHTML = this.history.map(m => {
            const victory = !!m.victory;
            const resultClass = victory ? 'victory' : '';
            const resultText = victory
                ? '<span class="victory-text">Victory</span>'
                : '<span class="defeat">Defeat</span>';
            const pillClass = victory ? 'pill victory-pill' : 'pill defeat-pill';
            const pillText = victory ? 'VICTORY' : 'DEFEAT';
            const mvp = m.wasMvp ? ' ★ MVP' : '';
            const replayBtn = m.hasReplay
                ? `<button class="match-replay-btn" data-id="${m.id}" data-map="${this.escape(m.mapCode || 'arena1')}">▶ REPLAY</button>`
                : '<span></span>';

            return `
                <div class="match ${resultClass}">
                    <span class="match-map">${this.escape(m.mapCode || 'Arena')} — ${resultText}${mvp}</span>
                    <span class="${pillClass}">${pillText}</span>
                    <span class="muted">Wave ${m.wavesReached}</span>
                    <span class="muted">${m.enemiesKilled} kills</span>
                    <span class="muted">${this.formatTime(m.durationSec)}</span>
                    ${replayBtn}
                </div>
            `;
        }).join('');

        list.querySelectorAll('.match-replay-btn').forEach(btn => {
            btn.addEventListener('click', () => this.watchReplay(btn.dataset.id, btn.dataset.map));
        });
    }

    async watchReplay(matchId, fallbackMapCode)
    {
        // Was silent while the fetch was in flight — clicking REPLAY gave
        // no feedback at all until the scene switched, which read as the
        // button/page being stuck ("buffering") on a slow connection.
        this.flash('Loading replay...', '#76d7ff');

        try {
            const res = await api.getMatchReplay(matchId);
            const parsed = JSON.parse(res.frames);

            // Replays are now saved as {mapCode, frames}, wrapping the
            // frame array so the actual arena background can be shown
            // behind the ghosts. Older saved replays are still a bare
            // frames array — fall back to the match row's own mapCode
            // (or arena1) for those.
            const isWrapped = parsed && !Array.isArray(parsed);
            const frames = isWrapped ? (parsed.frames || []) : parsed;
            const mapCode = isWrapped ? (parsed.mapCode || fallbackMapCode || 'arena1') : (fallbackMapCode || 'arena1');

            this.scene.start('MatchReplayScene', {
                frames,
                mapCode,
                returnScene: 'ProfileScene',
                returnData: { username: this.targetUsername }
            });
        } catch (err) {
            this.flash('Could not load replay — ' + err.message, '#ff7b7b');
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================
    formatDate(iso)
    {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? '' : 'Member since ' + d.toLocaleDateString();
    }

    formatTime(sec)
    {
        sec = sec || 0;
        return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    }

    flash(text, color)
    {
        const el = this.overlayEl?.querySelector('#profile-flash');
        if (!el) return;
        el.textContent = text;
        el.style.color = color;
        el.style.opacity = '1';
        clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(() => { el.style.opacity = '0'; }, 2400);
    }

    escape(str)
    {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }
}