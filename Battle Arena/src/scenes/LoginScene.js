// Fully New

import Phaser from 'phaser';
import api from '../api/api';
import net from '../net/NetClient';
import audioManager from '../managers/AudioManager';

export default class LoginScene extends Phaser.Scene
{
    constructor() {
        super('LoginScene');
    }

    init(data)
    {
        this.arrivedFromExpiry = data && data.sessionExpired;
    }

    create()
    {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cameras.main.setBackgroundColor('#050505');

        this.statusText = this.add.text(width / 2, height * 0.85, '', {
            fontSize: '20px', fill: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        if (this.arrivedFromExpiry) {
            this.statusText.setText('Your session expired — please log in again').setColor('#ffcc44');
        }

        if (api.isLoggedIn()) {
            this.statusText.setText('Restoring session...');
            this.verifyExistingSession();
            return;
        }

        this.showForm();
    }

    async verifyExistingSession()
    {
        try {
            const profile = await api.getProfile();
            audioManager.applySettings(profile);
            this.goToMenu(profile.username);
        } catch (e) {
            api.logout();
            this.statusText.setText('');
            this.showForm();
        }
    }

    showForm()
    {
        this.isRegisterMode = false;

        this.overlay    = document.getElementById('auth-overlay');
        this.titleEl    = document.getElementById('auth-title');
        this.errorEl    = document.getElementById('auth-error');
        this.usernameEl = document.getElementById('auth-username');
        this.emailEl    = document.getElementById('auth-email');
        this.passwordEl = document.getElementById('auth-password');
        this.submitEl   = document.getElementById('auth-submit');
        this.toggleEl   = document.getElementById('auth-toggle');

        if (!this.overlay) {
            this.statusText.setText('Login form missing from index.html');
            return;
        }

        this.overlay.classList.add('visible');
        this.errorEl.textContent = '';
        this.usernameEl.value = '';
        this.emailEl.value = '';
        this.passwordEl.value = '';
        this.usernameEl.focus();

        this.onSubmit = () => this.handleSubmit();
        this.onToggle = () => this.toggleMode();
        this.onKeyDown = (e) => { if (e.key === 'Enter') this.handleSubmit(); };

        this.submitEl.addEventListener('click', this.onSubmit);
        this.toggleEl.addEventListener('click', this.onToggle);
        document.addEventListener('keydown', this.onKeyDown);

        this.events.once('shutdown', () => this.cleanup());
    }

    toggleMode()
    {
        this.isRegisterMode = !this.isRegisterMode;
        this.errorEl.textContent = '';

        if (this.isRegisterMode) {
            this.titleEl.textContent = 'REGISTER';
            this.emailEl.style.display = 'block';
            this.submitEl.textContent = 'CREATE ACCOUNT';
            this.toggleEl.textContent = 'Already have an account? Login';
            this.passwordEl.setAttribute('autocomplete', 'new-password');
        } else {
            this.titleEl.textContent = 'LOGIN';
            this.emailEl.style.display = 'none';
            this.submitEl.textContent = 'ENTER ARENA';
            this.toggleEl.textContent = 'No account? Register';
            this.passwordEl.setAttribute('autocomplete', 'current-password');
        }
    }

    async handleSubmit()
    {
        if (this.submitEl.disabled) return;

        const username = this.usernameEl.value.trim();
        const email    = this.emailEl.value.trim();
        const password = this.passwordEl.value;

        if (!username || !password) {
            this.errorEl.textContent = 'Username and password are required';
            return;
        }
        if (this.isRegisterMode && !email) {
            this.errorEl.textContent = 'Email is required';
            return;
        }

        this.submitEl.disabled = true;
        this.errorEl.textContent = '';
        const originalLabel = this.submitEl.textContent;
        this.submitEl.textContent = 'Please wait...';

        try {
            const res = this.isRegisterMode
                ? await api.register(username, email, password)
                : await api.login(username, password);

            try {
                const profile = await api.getProfile();
                audioManager.applySettings(profile);
            } catch (e) { /* not fatal — defaults are fine */ }

            this.goToMenu(res.username);
        } catch (err) {
            this.errorEl.textContent = err.message;
            this.submitEl.disabled = false;
            this.submitEl.textContent = originalLabel;
        }
    }

    goToMenu(username)
    {
        this.cleanup();
        this.statusText.setText('Welcome, ' + username);

        try {
            net.connect(username).then(() => {
                this.scene.launch('GlobalChatScene');
            });
        } catch (e) { /* offline is fine, chat just won't connect yet */ }

        this.time.delayedCall(400, () => this.scene.start('MenuScene'));
    }

    cleanup()
    {
        if (this.overlay) this.overlay.classList.remove('visible');
        if (this.submitEl) {
            this.submitEl.removeEventListener('click', this.onSubmit);
            this.submitEl.disabled = false;
        }
        if (this.toggleEl) this.toggleEl.removeEventListener('click', this.onToggle);
        document.removeEventListener('keydown', this.onKeyDown);
    }
}