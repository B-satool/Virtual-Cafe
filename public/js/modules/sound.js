/**
 * Ambient Sound Management for Virtual Café
 * Uses Web Audio API to synthesize ambient sounds (no external files needed).
 * Handles playback, volume control, and preference persistence.
 */

// ============================================
// STATE
// ============================================
let audioContext = null;
const activeSounds = {};
let saveDebounceTimer = null;

const SOUND_TYPES = ['rain', 'cafe', 'fireplace'];

const DEFAULT_PREFS = {
    sound_preferences: { rain: false, cafe: false, fireplace: false },
    volume_settings: { rain: 50, cafe: 50, fireplace: 50 }
};

// ============================================
// WEB AUDIO API — SOUND GENERATORS
// ============================================

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

/**
 * Create a rain sound using filtered white noise
 */
function createRainSound(ctx, gainNode) {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Bandpass filter to shape white noise into rain-like sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;

    // Secondary filter for more natural rain texture
    const hiPass = ctx.createBiquadFilter();
    hiPass.type = 'highpass';
    hiPass.frequency.value = 200;

    source.connect(filter);
    filter.connect(hiPass);
    hiPass.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);
    return source;
}

/**
 * Create a café ambience sound using layered noise
 */
function createCafeSound(ctx, gainNode) {
    const bufferSize = 4 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Brownian noise for low rumble of café chatter
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Boost
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Bandpass to simulate muffled conversation
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.8;

    // Add subtle modulation with an LFO for more natural feel
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.3; // Slow modulation
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(0);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);
    return { source, lfo };
}

/**
 * Create a fireplace crackling sound using noise bursts
 */
function createFireplaceSound(ctx, gainNode) {
    const bufferSize = 3 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Mix of crackle-like bursts and warm low rumble
    for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        // Random crackling pops
        const crackle = Math.random() > 0.997 ? (Math.random() * 2 - 1) * 0.8 : 0;
        // Low warm rumble
        const rumble = (Math.random() * 2 - 1) * 0.05;
        // Combine with some smoothing
        data[i] = crackle + rumble;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Lowpass filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.5;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);
    return source;
}

// ============================================
// PLAYBACK CONTROL
// ============================================

/**
 * Start playing a sound type
 */
function startSound(type) {
    const ctx = getAudioContext();
    const gainNode = ctx.createGain();

    const saved = loadFromLocalStorage();
    const volume = (saved.volume_settings[type] ?? 50) / 100;
    gainNode.gain.value = volume;

    let sourceNodes;
    switch (type) {
        case 'rain':
            sourceNodes = { source: createRainSound(ctx, gainNode) };
            break;
        case 'cafe':
            sourceNodes = createCafeSound(ctx, gainNode);
            break;
        case 'fireplace':
            sourceNodes = { source: createFireplaceSound(ctx, gainNode) };
            break;
        default:
            return;
    }

    activeSounds[type] = {
        ...sourceNodes,
        gainNode
    };
}

/**
 * Stop playing a sound type
 */
function stopSound(type) {
    const sound = activeSounds[type];
    if (!sound) return;

    try {
        if (sound.source) sound.source.stop();
        if (sound.lfo) sound.lfo.stop();
        if (sound.gainNode) sound.gainNode.disconnect();
    } catch (e) {
        // Already stopped
    }

    delete activeSounds[type];
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Toggle a sound on/off
 * @param {string} type - 'rain', 'cafe', or 'fireplace'
 */
export function toggleSound(type) {
    const checkbox = document.getElementById(`${type}Sound`);
    if (!checkbox) return;

    const isOn = checkbox.checked;

    if (isOn) {
        startSound(type);
    } else {
        stopSound(type);
    }

    // Save immediately to localStorage, debounce to DB
    saveToLocalStorage();
    debounceSaveToDB();
}

/**
 * Update volume for a sound type
 * @param {string} type - 'rain', 'cafe', or 'fireplace'
 * @param {number|string} value - Volume 0-100
 */
export function updateSoundVolume(type, value) {
    const vol = parseInt(value, 10) / 100;
    const sound = activeSounds[type];
    if (sound && sound.gainNode) {
        sound.gainNode.gain.value = vol;
    }

    saveToLocalStorage();
    debounceSaveToDB();
}

// ============================================
// PERSISTENCE — LOCAL STORAGE
// ============================================

function getCurrentState() {
    const prefs = { ...DEFAULT_PREFS.sound_preferences };
    const vols = { ...DEFAULT_PREFS.volume_settings };

    for (const type of SOUND_TYPES) {
        const checkbox = document.getElementById(`${type}Sound`);
        if (checkbox) prefs[type] = checkbox.checked;

        const control = checkbox?.closest('.sound-control');
        const slider = control?.querySelector('input[type="range"]');
        if (slider) vols[type] = parseInt(slider.value, 10);
    }

    return { sound_preferences: prefs, volume_settings: vols };
}

function saveToLocalStorage() {
    const state = getCurrentState();
    localStorage.setItem('soundPreferences', JSON.stringify(state.sound_preferences));
    localStorage.setItem('volumeSettings', JSON.stringify(state.volume_settings));
}

function loadFromLocalStorage() {
    try {
        const prefs = JSON.parse(localStorage.getItem('soundPreferences'));
        const vols = JSON.parse(localStorage.getItem('volumeSettings'));
        return {
            sound_preferences: prefs || { ...DEFAULT_PREFS.sound_preferences },
            volume_settings: vols || { ...DEFAULT_PREFS.volume_settings }
        };
    } catch {
        return {
            sound_preferences: { ...DEFAULT_PREFS.sound_preferences },
            volume_settings: { ...DEFAULT_PREFS.volume_settings }
        };
    }
}

// ============================================
// PERSISTENCE — DATABASE
// ============================================

async function saveToDB() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const state = getCurrentState();

    try {
        await fetch('/api/user/sound-preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sound_preferences: state.sound_preferences,
                volume_settings: state.volume_settings
            })
        });
    } catch (err) {
        console.warn('[SOUND] Failed to save preferences to DB:', err.message);
    }
}

async function loadFromDB() {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
        const res = await fetch('/api/user/sound-preferences', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.success && data.result) {
            return {
                sound_preferences: data.result.sound_preferences || DEFAULT_PREFS.sound_preferences,
                volume_settings: data.result.volume_settings || DEFAULT_PREFS.volume_settings
            };
        }
    } catch (err) {
        console.warn('[SOUND] Failed to load preferences from DB:', err.message);
    }
    return null;
}

function debounceSaveToDB() {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => saveToDB(), 500);
}

// ============================================
// LOAD & RESTORE
// ============================================

/**
 * Apply saved preferences to UI checkboxes, sliders, and start sounds if needed.
 */
function applyPreferences(prefs) {
    for (const type of SOUND_TYPES) {
        const isOn = prefs.sound_preferences[type] || false;
        const volume = prefs.volume_settings[type] ?? 50;

        // Update checkbox
        const checkbox = document.getElementById(`${type}Sound`);
        if (checkbox) checkbox.checked = isOn;

        // Update slider
        const control = checkbox?.closest('.sound-control');
        const slider = control?.querySelector('input[type="range"]');
        if (slider) slider.value = volume;

        // Start or stop sounds
        if (isOn && !activeSounds[type]) {
            startSound(type);
        } else if (!isOn && activeSounds[type]) {
            stopSound(type);
        }

        // Update volume if already playing
        if (activeSounds[type] && activeSounds[type].gainNode) {
            activeSounds[type].gainNode.gain.value = volume / 100;
        }
    }
}

/**
 * Load sound preferences. Called when entering the room page.
 * Reads localStorage first (instant), then reconciles with DB.
 */
export async function loadSoundPreferences() {
    // Step 1: Apply localStorage prefs immediately
    const localPrefs = loadFromLocalStorage();
    applyPreferences(localPrefs);

    // Step 2: Fetch from DB and reconcile (DB wins)
    const dbPrefs = await loadFromDB();
    if (dbPrefs) {
        applyPreferences(dbPrefs);
        localStorage.setItem('soundPreferences', JSON.stringify(dbPrefs.sound_preferences));
        localStorage.setItem('volumeSettings', JSON.stringify(dbPrefs.volume_settings));
    }
}

/**
 * Stop all sounds. Called when leaving the room page.
 */
export function stopAllSounds() {
    for (const type of SOUND_TYPES) {
        stopSound(type);
    }
}
