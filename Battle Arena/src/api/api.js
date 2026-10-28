// Use whatever host the page itself was loaded from, so a second
// device on the LAN (which has its own "localhost") reaches the PC
// running the backend instead of itself — same fix already applied
// to the WebSocket URL in NetClient.js.
const API_BASE = 'http://' + (window.location.hostname || 'localhost') + ':8081';

const TOKEN_KEY = 'battleArenaToken';
const USER_KEY  = 'battleArenaUser';

class Api {

    constructor() {
        this.sessionExpiredHandlers = [];
    }

    onSessionExpired(handler) {
        this.sessionExpiredHandlers.push(handler);
    }

    notifySessionExpired() {
        this.sessionExpiredHandlers.forEach(h => {
            try { h(); } catch (e) {}
        });
    }

    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    getUser() {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    isLoggedIn() {
        return !!this.getToken();
    }

    saveSession(authResponse) {
        localStorage.setItem(TOKEN_KEY, authResponse.token);
        localStorage.setItem(USER_KEY, JSON.stringify({
            username: authResponse.username,
            coins: authResponse.coins
        }));
    }

    logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    async request(path, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

        const token = this.getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;

        let response;
        try {
            response = await fetch(API_BASE + path, { ...options, headers });
        } catch (networkError) {
            throw new Error('Cannot reach server. Is the backend running?');
        }

        if (response.status === 401) {
            this.logout();
            this.notifySessionExpired();
            throw new Error('Session expired. Please log in again.');
        }

        let body = null;
        try { body = await response.json(); } catch (e) { /* empty body is fine */ }

        if (!response.ok) {
            throw new Error((body && body.error) || 'Request failed (' + response.status + ')');
        }

        return body;
    }

    get(path) {
        return this.request(path, { method: 'GET' });
    }

    post(path, data) {
        return this.request(path, { method: 'POST', body: JSON.stringify(data) });
    }

    // ---- Auth ----
    async register(username, email, password) {
        const res = await this.post('/api/auth/register', { username, email, password });
        this.saveSession(res);
        return res;
    }

    async login(username, password) {
        const res = await this.post('/api/auth/login', { username, password });
        this.saveSession(res);
        return res;
    }

    getProfile() {
        return this.get('/api/profile');
    }

    updateSettings(masterVolume, musicVolume) {
        return this.request('/api/profile/settings', {
            method: 'PUT',
            body: JSON.stringify({ masterVolume, musicVolume })
        });
    }

    // ---- Account settings (Profile → Settings) ----
    // Each requires the current password as proof, same as any normal
    // account page. Changing the username returns a fresh token (the
    // JWT's subject IS the username) — saveStoredIdentity below updates
    // localStorage with both so the session doesn't get invalidated.
    async changeUsername(newUsername, currentPassword) {
        const res = await this.request('/api/profile/account/username', {
            method: 'PUT',
            body: JSON.stringify({ newUsername, currentPassword })
        });
        this.saveStoredIdentity(res.username, res.token);
        return res;
    }

    changeEmail(newEmail, currentPassword) {
        return this.request('/api/profile/account/email', {
            method: 'PUT',
            body: JSON.stringify({ newEmail, currentPassword })
        });
    }

    changePassword(currentPassword, newPassword) {
        return this.request('/api/profile/account/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    // New: after a username change, keep the locally-stored session in
    // sync — new token (old one's subject is now stale) and new
    // username, coins carried over from whatever was stored before.
    saveStoredIdentity(newUsername, newToken) {
        const user = this.getUser() || {};
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify({ ...user, username: newUsername }));
    }

    // ---- Catalogue ----
    getCharacters() {
        return this.get('/api/characters');
    }

    getMaps() {
        return this.get('/api/maps');
    }

    // ---- Shop ----
    getShopCharacters() {
        return this.get('/api/shop/characters');
    }

    getBalance() {
        return this.get('/api/shop/balance');
    }

    purchaseCharacter(code) {
        return this.post('/api/shop/purchase/' + code, {});
    }

    purchaseMap(code) {
        return this.post('/api/shop/purchase-map/' + code, {});
    }

    // ---- Consumables (Ammo Pack / Grenade / Health Kit) ----
    // Persistent, cross-run inventory — bought/sold with account coins
    // in the Shop's Supplies tab, and spent (no refund) during a boss
    // fight, since boss waves don't drop their own ammo/grenade/health.
    getShopConsumables() {
        return this.get('/api/shop/consumables');
    }

    // New: quantities only (no prices) — used by Game.js when a boss
    // wave starts, lighter than the full catalog fetch above.
    getConsumableInventory() {
        return this.get('/api/shop/consumables/inventory');
    }

    buyConsumable(code, quantity = 1) {
        return this.post('/api/shop/consumables/' + code + '/buy', { quantity });
    }

    sellConsumable(code, quantity = 1) {
        return this.post('/api/shop/consumables/' + code + '/sell', { quantity });
    }

    consumeConsumable(code, quantity = 1) {
        return this.post('/api/shop/consumables/' + code + '/consume', { quantity });
    }

    // ---- Leaderboard & Match Stats ----
    getLeaderboard() {
        return this.get('/api/match/leaderboard');
    }

    getMatchHistory() {
        return this.get('/api/match/history');
    }

    getPersonalBest() {
        return this.get('/api/match/personal-best');
    }

    getAchievements() {
        return this.get('/api/match/achievements');
    }

    // ---- Public profile (another player) ----
    getPublicProfile(username) {
        return this.get('/api/profile/' + username);
    }

    // New: save (or clear, with code=null) which unlocked achievement
    // shows on your own profile card
    setShowcaseBadge(code) {
        return this.post('/api/profile/showcase', { code });
    }

    getMatchHistoryOf(username) {
        return this.get('/api/match/history/' + username);
    }

    getPersonalBestOf(username) {
        return this.get('/api/match/personal-best/' + username);
    }

    getAchievementsOf(username) {
        return this.get('/api/match/achievements/' + username);
    }

    // New: real lifetime totals (all matches ever played, not just the
    // last 10 kept in history) — used by the Profile screen's stat cards.
    getStats() {
        return this.get('/api/match/stats');
    }

    getStatsOf(username) {
        return this.get('/api/match/stats/' + username);
    }

    // New: fetch a match's saved "final moments" replay (returns
    // { frames: "<json string>" }, or 404 if that match has none)
    getMatchReplay(matchId) {
        return this.get('/api/match/' + matchId + '/replay');
    }

    // ---- Friends ----
    getFriends() {
        return this.get('/api/friends');
    }

    getIncomingRequests() {
        return this.get('/api/friends/requests/incoming');
    }

    getOutgoingRequests() {
        return this.get('/api/friends/requests/outgoing');
    }

    // New: friend search by partial username — server returns up to 10
    // matches, each tagged with your current relation to them
    searchPlayers(query) {
        return this.get('/api/friends/search?q=' + encodeURIComponent(query));
    }

    sendFriendRequest(username) {
        return this.post('/api/friends/request/' + username, {});
    }

    acceptFriendRequest(id) {
        return this.post('/api/friends/requests/' + id + '/accept', {});
    }

    declineFriendRequest(id) {
        return this.post('/api/friends/requests/' + id + '/decline', {});
    }

    removeFriend(id) {
        return this.request('/api/friends/' + id, { method: 'DELETE' });
    }

    // ---- Direct Messages ----
    // Fetch direct message chat history with a specific user
    getConversation(username) {
        return this.get('/api/messages/' + username);
    }

    // Send a direct message to a specific user
    sendDirectMessage(username, text) {
        return this.post('/api/messages/' + username, { text });
    }

    // New: Fetch list of usernames that currently have unread direct messages sent to us
    getUnreadFrom() {
        return this.get('/api/messages/unread');
    }

    // New: Mark all direct messages from a specific sender as read
    markMessagesRead(username) {
        return this.post('/api/messages/' + username + '/read', {});
    }
}

const api = new Api();
export default api;