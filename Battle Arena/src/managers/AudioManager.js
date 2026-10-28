// 💡 গেমের সমস্ত সাউন্ড এবং মিউজিক এখান থেকে কন্ট্রোল হবে
class AudioManager {
    constructor() {
        if (AudioManager.instance) {
            return AudioManager.instance;
        }
        AudioManager.instance = this;
        
        this.masterVolume = 1.0;
        this.musicVolume = 0.45;
        this.currentMusic = null;
        this.scene = null;
        this.saveTimer = null;
    }

    // গেম স্টার্ট হলে বা সিন চেঞ্জ হলে এটি কল করতে হবে
    init(scene) {
        this.scene = scene;
        this.scene.sound.volume = this.masterVolume;
    }

    playMusic(key) {
        if (!this.scene) return;
        
        // আগের মিউজিক চললে সেটা বন্ধ করে নতুনটা চালাবে
        if (this.currentMusic) {
            this.currentMusic.stop();
        }
        
        this.currentMusic = this.scene.sound.add(key, { loop: true, volume: this.musicVolume });
        this.currentMusic.play();
    }

    setMasterVolume(vol) {
        this.masterVolume = vol;
        if (this.scene) {
            this.scene.sound.volume = vol; // Phaser এর গ্লোবাল ভলিউম সেট করে
        }
        this.saveSettings();
    }

    setMusicVolume(vol) {
        this.musicVolume = vol;
        if (this.currentMusic) {
            this.currentMusic.setVolume(vol); // শুধুমাত্র রানিং মিউজিকের সাউন্ড সেট করে
        }
        this.saveSettings();
    }

    // অ্যাকাউন্ট থেকে পাওয়া সেটিং অ্যাপ্লাই করবে (কোনো সেভ লুপ ট্রিগার না করে) 
    // মিউজিক চালু হওয়ার আগে লগইনের সময় এটি একবার ব্যবহার করা হয়
    applySettings(settings) {
        if (typeof settings.masterVolume === 'number') this.masterVolume = settings.masterVolume;
        if (typeof settings.musicVolume === 'number')  this.musicVolume = settings.musicVolume;
        if (this.scene) this.scene.sound.volume = this.masterVolume;
        if (this.currentMusic) this.currentMusic.setVolume(this.musicVolume);
    }

    // ডিবউন্সড সেভিং — অপশন স্ক্রিন থেকে প্রতি ক্লিকে এটি কল হলেও, 
    // স্লাইডার ঘোরানো থামলে ৫২০ms পর নেটওয়ার্কে মাত্র একটি রিকোয়েস্ট পাঠাবে
    saveSettings() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(async () => {
            try {
                const api = (await import('../api/api')).default;
                await api.updateSettings(this.masterVolume, this.musicVolume);
            } catch (e) { /* অফলাইন থাকলে সমস্যা নেই, শুধু এই সেশনের জন্য সেভ হবে না */ }
        }, 500);
    }
}

const audioManager = new AudioManager();
export default audioManager;