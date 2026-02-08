import { initJam } from './modules/jam.js';

/**
 * JODIFY - Music Player Application
 * Version: 1.0.5
 * Features: Queue, Equalizer, Keyboard Shortcuts, Offline Mode Fix
 */

let isChangingTrack = false;

// =========================================
// ICONS CONSTANTS
// =========================================
const ICONS = {
    LOADING: `<svg class="spin" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" opacity="0.3"/><path d="M12 2c5.523 0 10 4.477 10 10" stroke="currentColor"/></svg>`,
    SUCCESS: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#00FF88" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    ERROR: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#FF3366" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    WARNING: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#FFB800" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>`,
    VOLUME: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
    VOLUME_MUTE: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`,
    SUN: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.07l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`,
    MOON: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    HEART_F: `<svg viewBox="0 0 24 24" width="22" height="22" fill="#FF0080"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    HEART_E: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    DOWNLOAD: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    PLUS: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    EYE: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    EYE_OFF: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
};

const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
notificationSound.volume = 0.25;

// =========================================
// APP STATE
// =========================================
const appState = {
    offlineMode: false,
    db: null,
    currentUserRole: null,
    playlist: [],
    queue: [],
    likedIds: JSON.parse(localStorage.getItem("likedSongs")) || [],
    downloadedIds: [],
    currentTab: "global",
    currentIndex: -1,
    lyrics: [],
    currentLine: -1,
    audioCtx: null,
    analyser: null,
    source: null,
    eqFilters: [],
    searchTerm: "",
    currentSort: "recent",
    isShuffle: false,
    isLoop: false,
    isUploading: false,
    currentFilteredList: [],
    activeUploads: {},
    usuarioActual: localStorage.getItem("currentUserName") || "",
    heartbeatInterval: null,
    currentBlobUrl: null,
    availableUsers: [],
    userFilter: "all",
    previousVolume: 1,
    isMuted: false,
    userVolume: parseFloat(localStorage.getItem("userVolume")) || 0.5,
    fadeEnabled: localStorage.getItem("fadeEnabled") === "true",
    fadeDuration: parseInt(localStorage.getItem("fadeDuration"), 10) || 4,
    focusMode: localStorage.getItem("focusMode") === "true",
    isFading: false,
    playCount: parseInt(localStorage.getItem("playCount")) || 0,
    discord: JSON.parse(localStorage.getItem("discordProfile")) || null,
    jamActive: localStorage.getItem("jamActive") === "true",
    jamCode: localStorage.getItem("jamCode") || "",
    jamHost: localStorage.getItem("jamHost") === "true",
    jamChannel: null,
    jamUsers: [],
    jamSyncInProgress: false,
    fadePending: false,
    jamSessionId: localStorage.getItem("jamSessionId") || null,
    jamMembersInterval: null,
    jamSessionInterval: null,
    lastJamSongId: null,
    sessionSeconds: 0,
    sessionInterval: null,
    sleepTimer: {
        endAt: null,
        mode: "off",
        timeoutId: null,
        intervalId: null,
        triggered: false,
        durationMinutes: null
    }
};

// =========================================
// EQUALIZER PRESETS
// =========================================
const EQ_PRESETS = {
    flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
    treble: [0, 0, 0, 0, 0, 2, 4, 5, 6, 6],
    vocal: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
    rock: [4, 3, 1, 0, -1, 0, 2, 3, 4, 4],
    electronic: [5, 4, 1, 0, -2, 0, 1, 4, 5, 5]
};

// =========================================
// INITIALIZATION
// =========================================
window.onload = async () => {
    const savedVolume = parseFloat(localStorage.getItem("userVolume")) || 0.5;
    appState.userVolume = savedVolume;
    setAppVolume(savedVolume);
    
    const savedTheme = localStorage.getItem("theme") || "dark";
    applyTheme(savedTheme);
    
    const disableVis = localStorage.getItem('disableVisualizer') === 'true';
    const disableBg = localStorage.getItem('disableDynamicBg') === 'true';
    document.body.classList.toggle('no-visual', disableVis);
    document.body.classList.toggle('no-dynamic-bg', disableBg);
    document.body.classList.toggle('focus-mode', appState.focusMode);
    
    const disableVisualizer = document.getElementById("disableVisualizer");
    const disableDynamicBg = document.getElementById("disableDynamicBg");
    const enableFocusMode = document.getElementById("enableFocusMode");
    const enableFade = document.getElementById("enableFade");
    const fadeDuration = document.getElementById("fadeDuration");
    const fadeDurationValue = document.getElementById("fadeDurationValue");
    if (disableVisualizer) disableVisualizer.checked = disableVis;
    if (disableDynamicBg) disableDynamicBg.checked = disableBg;
    if (enableFocusMode) enableFocusMode.checked = appState.focusMode;
    if (enableFade) enableFade.checked = appState.fadeEnabled;
    if (fadeDuration) fadeDuration.value = appState.fadeDuration;
    if (fadeDurationValue) fadeDurationValue.textContent = `${appState.fadeDuration}s`;

    restoreSleepTimerFromStorage();
    startSessionTimer();
    updateQueueIndicator();
    updateSmartMixAvailability();
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts();
    
    // Show shortcut hint
    showShortcutHint();
    
    checkSavedSession();
    if (appState.usuarioActual) {
        startHeartbeat(appState.usuarioActual);
        initApp();
    } else {
        document.getElementById("loginScreen").style.display = "flex";
    }

    jam.initJamFromStorage();
    
    console.log(`JodiFy v2.0 - Volume: ${Math.round(savedVolume * 100)}%`);
};

// =========================================
// INDEXED DB SETUP
// =========================================
const dbRequest = indexedDB.open("MusicOfflineDB", 1);
dbRequest.onupgradeneeded = (e) => {
    appState.db = e.target.result;
    if (!appState.db.objectStoreNames.contains("songs")) {
        appState.db.createObjectStore("songs", { keyPath: "id" });
    }
};
dbRequest.onsuccess = (e) => {
    appState.db = e.target.result;
    console.log("IndexedDB ready for offline mode");
};
dbRequest.onerror = (e) => {
    console.error("IndexedDB error:", e);
};

// =========================================
// DOM ELEMENTS
// =========================================
const audio = document.getElementById("audio");
const fileInput = document.getElementById("fileInput");
const lyricsBox = document.getElementById("lyricsBox");
const songList = document.getElementById("songList");
const progress = document.getElementById("progress");
const volume = document.getElementById("volume");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const songTitle = document.getElementById("songTitle");
const cover = document.getElementById("cover");
const dynamicBg = document.getElementById("dynamic-bg");
const searchInput = document.getElementById("searchInput");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const shuffleBtn = document.getElementById("shuffle");
const loopBtn = document.getElementById("repeat");
const themeToggle = document.getElementById("themeToggle");

const btnGlobal = document.getElementById("btnGlobal");
const btnPersonal = document.getElementById("btnPersonal");
const uploadModal = document.getElementById("uploadModal");
const uploadList = document.getElementById("uploadList");
const closeModal = document.getElementById("closeModal");
const uploadBadge = document.getElementById("uploadBadge");
const badgeText = document.getElementById("badgeText");
const sortOptions = document.getElementById("sortOptions");
const addSongContainer = document.querySelector(".add-song");
const addActions = document.querySelector(".add-actions");
const playlistEl = document.querySelector('.playlist');
const btnOpenPlaylist = document.getElementById('btnOpenPlaylist');
const btnOpenRegister = document.getElementById("btnOpenRegister");
const registerModal = document.getElementById("registerModal");
const closeRegisterBtn = document.getElementById("closeRegisterBtn");
const smartMixBtn = document.getElementById("smartMixBtn");
const sessionTimeEl = document.getElementById("sessionTime");
const sleepTimerBadge = document.getElementById("sleepTimerBadge");
const queueCount = document.getElementById("queueCount");
const sleepTimerSelect = document.getElementById("sleepTimerSelect");
const applySleepTimerBtn = document.getElementById("applySleepTimer");
const sleepTimerStatus = document.getElementById("sleepTimerStatus");
const toastContainer = document.getElementById("toastContainer");
const openLinkModalBtn = document.getElementById("openLinkModal");
const openLinkModalFooterBtn = document.getElementById("openLinkModalFooter");
const linkModal = document.getElementById("linkModal");
const closeLinkModalBtn = document.getElementById("closeLinkModal");
const linkCancelBtn = document.getElementById("linkCancelBtn");
const linkImportBtn = document.getElementById("linkImportBtn");
const linkInput = document.getElementById("linkInput");
const linkImportStatus = document.getElementById("linkImportStatus");

// Queue elements
const queueBtn = document.getElementById("queueBtn");
const queueDrawer = document.getElementById("queueDrawer");
const queueOverlay = document.getElementById("queueOverlay");
const queueList = document.getElementById("queueList");
const closeQueue = document.getElementById("closeQueue");

// Equalizer elements
const eqBtn = document.getElementById("eqBtn");
const equalizerModal = document.getElementById("equalizerModal");
const closeEq = document.getElementById("closeEq");

// Shortcuts elements
const shortcutsModal = document.getElementById("shortcutsModal");
const closeShortcuts = document.getElementById("closeShortcuts");
const shortcutHint = document.getElementById("shortcutHint");

const jam = initJam({
    appState,
    supabaseClient,
    audio,
    playSong,
    playOfflineSongById
});

// Audio events for Electron
audio.addEventListener('play', () => {
    if (window.electronAPI && window.electronAPI.updateThumbar) {
        window.electronAPI.updateThumbar(true);
    }
    if (appState.jamActive && appState.jamHost && !appState.jamSyncInProgress) {
        jam.broadcastJamState('jam-play');
    }
});

audio.addEventListener('pause', () => {
    if (window.electronAPI && window.electronAPI.updateThumbar) {
        window.electronAPI.updateThumbar(false);
    }
    if (appState.jamActive && appState.jamHost && !appState.jamSyncInProgress) {
        jam.broadcastJamState('jam-pause');
    }
});

audio.addEventListener('seeked', () => {
    if (appState.jamActive && appState.jamHost && !appState.jamSyncInProgress) {
        jam.broadcastJamState('jam-seek');
    }
});

document.getElementById("volumeIcon").innerHTML = ICONS.VOLUME;

// =========================================
// KEYBOARD SHORTCUTS
// =========================================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        const key = e.key.toLowerCase();
        
        switch(key) {
            case ' ':
                e.preventDefault();
                togglePlay();
                break;
            case 'n':
                handleNextSong();
                break;
            case 'p':
                handlePrevSong();
                break;
            case 'l':
                if (appState.currentIndex >= 0) {
                    toggleLike(null, appState.playlist[appState.currentIndex].id);
                }
                break;
            case 'm':
                toggleMute();
                break;
            case 'arrowup':
                e.preventDefault();
                adjustVolume(0.05);
                break;
            case 'arrowdown':
                e.preventDefault();
                adjustVolume(-0.05);
                break;
            case 'arrowright':
                e.preventDefault();
                seekAudio(10);
                break;
            case 'arrowleft':
                e.preventDefault();
                seekAudio(-10);
                break;
            case 's':
                toggleShuffle();
                break;
            case 'r':
                toggleRepeat();
                break;
            case 't':
                toggleTheme();
                break;
            case 'q':
                toggleQueue();
                break;
            case 'e':
                toggleEqualizer();
                break;
            case '?':
            case '/':
                toggleShortcutsModal();
                break;
            case 'escape':
                closeAllModals();
                break;
        }
    });
}

function showShortcutHint() {
    setTimeout(() => {
        shortcutHint.classList.add('show');
        setTimeout(() => {
            shortcutHint.classList.remove('show');
        }, 4000);
    }, 3000);
}

function togglePlay() {
    if (appState.jamActive && !appState.jamHost && !appState.jamSyncInProgress) {
        alert("Solo el host puede controlar la reproducción en una Jam.");
        return;
    }
    if (audio.paused) {
        audio.play();
        updatePlayIcon(true);
    } else {
        audio.pause();
        updatePlayIcon(false);
    }
}

function toggleMute() {
    if (appState.isMuted) {
        setAppVolume(appState.previousVolume);
        appState.isMuted = false;
    } else {
        appState.previousVolume = audio.volume;
        setAppVolume(0);
        appState.isMuted = true;
    }
    updateVolumeIcon();
}

function adjustVolume(delta) {
    const newVolume = Math.max(0, Math.min(1, audio.volume + delta));
    setAppVolume(newVolume);
    if (newVolume > 0) appState.isMuted = false;
}

function seekAudio(seconds) {
    if (audio.duration) {
        audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
    }
}

function toggleShuffle() {
    appState.isShuffle = !appState.isShuffle;
    shuffleBtn.classList.toggle("active", appState.isShuffle);
}

function toggleRepeat() {
    appState.isLoop = !appState.isLoop;
    loopBtn.classList.toggle("active", appState.isLoop);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
}

function toggleShortcutsModal() {
    shortcutsModal.classList.toggle('open');
}

function closeAllModals() {
    shortcutsModal.classList.remove('open');
    equalizerModal.classList.remove('open');
    jamModal.classList.remove('open');
    queueDrawer.classList.remove('open');
    queueOverlay.classList.remove('active');
    settingsModal.style.display = 'none';
    uploadModal.style.display = 'none';
    registerModal.style.display = 'none';
    if (linkModal) linkModal.style.display = 'none';
    toggleMobilePlaylist(false);
}

function showToast(message, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startSessionTimer() {
    if (appState.sessionInterval) clearInterval(appState.sessionInterval);
    const startedAt = Date.now();
    appState.sessionInterval = setInterval(() => {
        appState.sessionSeconds = Math.floor((Date.now() - startedAt) / 1000);
        if (sessionTimeEl) sessionTimeEl.textContent = formatDuration(appState.sessionSeconds);
    }, 1000);
}

function updateQueueIndicator() {
    if (queueCount) queueCount.textContent = appState.queue.length.toString();
}

function updateSmartMixAvailability() {
    if (!smartMixBtn) return;
    const list = appState.currentFilteredList?.length ? appState.currentFilteredList : appState.playlist;
    smartMixBtn.disabled = !list || list.length === 0;
}

function updateSleepTimerUI() {
    if (!sleepTimerBadge && !sleepTimerStatus) return;
    if (appState.sleepTimer.mode === "off") {
        if (sleepTimerBadge) sleepTimerBadge.textContent = "Off";
        if (sleepTimerStatus) sleepTimerStatus.textContent = "Sin temporizador activo";
        if (sleepTimerSelect) sleepTimerSelect.value = "0";
        return;
    }
    if (appState.sleepTimer.mode === "end") {
        if (sleepTimerBadge) sleepTimerBadge.textContent = "Fin canción";
        if (sleepTimerStatus) sleepTimerStatus.textContent = "Se detendrá al finalizar la canción";
        if (sleepTimerSelect) sleepTimerSelect.value = "end";
        return;
    }
    if (appState.sleepTimer.mode === "timer" && appState.sleepTimer.endAt) {
        const remaining = Math.max(0, Math.floor((appState.sleepTimer.endAt - Date.now()) / 1000));
        const formatted = formatDuration(remaining);
        if (sleepTimerBadge) sleepTimerBadge.textContent = formatted;
        if (sleepTimerStatus) sleepTimerStatus.textContent = `Quedan ${formatted}`;
        if (sleepTimerSelect && appState.sleepTimer.durationMinutes) {
            sleepTimerSelect.value = String(appState.sleepTimer.durationMinutes);
        }
    }
}

function clearSleepTimer(options = { silent: false }) {
    if (appState.sleepTimer.timeoutId) clearTimeout(appState.sleepTimer.timeoutId);
    if (appState.sleepTimer.intervalId) clearInterval(appState.sleepTimer.intervalId);
    appState.sleepTimer = { endAt: null, mode: "off", timeoutId: null, intervalId: null, triggered: false, durationMinutes: null };
    localStorage.removeItem("sleepTimerData");
    updateSleepTimerUI();
    if (!options.silent) showToast("Temporizador desactivado", "warning");
}

function triggerSleepTimer(message) {
    appState.sleepTimer.triggered = true;
    if (!audio.paused) audio.pause();
    clearSleepTimer({ silent: true });
    showToast(message, "warning");
}

function scheduleSleepTimer(endAt, durationMinutes = null) {
    if (!endAt) return;
    appState.sleepTimer.endAt = endAt;
    appState.sleepTimer.mode = "timer";
    appState.sleepTimer.durationMinutes = durationMinutes;
    appState.sleepTimer.triggered = false;
    if (appState.sleepTimer.intervalId) clearInterval(appState.sleepTimer.intervalId);
    appState.sleepTimer.intervalId = setInterval(updateSleepTimerUI, 1000);
    if (appState.sleepTimer.timeoutId) clearTimeout(appState.sleepTimer.timeoutId);
    appState.sleepTimer.timeoutId = setTimeout(() => {
        triggerSleepTimer("Tiempo de sueño alcanzado");
    }, Math.max(0, endAt - Date.now()));
    updateSleepTimerUI();
    localStorage.setItem("sleepTimerData", JSON.stringify({ mode: "timer", endAt, durationMinutes }));
}

function restoreSleepTimerFromStorage() {
    const saved = localStorage.getItem("sleepTimerData");
    if (!saved) {
        updateSleepTimerUI();
        return;
    }
    try {
        const parsed = JSON.parse(saved);
        if (parsed.mode === "end") {
            appState.sleepTimer.mode = "end";
            updateSleepTimerUI();
            return;
        }
        if (parsed.mode === "timer" && parsed.endAt) {
            if (parsed.endAt > Date.now()) {
                scheduleSleepTimer(parsed.endAt, parsed.durationMinutes);
                return;
            }
        }
    } catch (e) {
        console.warn("Sleep timer restore failed", e);
    }
    clearSleepTimer({ silent: true });
}

function setSleepTimerFromSelection(value) {
    if (!value || value === "0") {
        clearSleepTimer();
        return;
    }
    if (value === "end") {
        clearSleepTimer({ silent: true });
        appState.sleepTimer.mode = "end";
        appState.sleepTimer.durationMinutes = null;
        appState.sleepTimer.triggered = false;
        localStorage.setItem("sleepTimerData", JSON.stringify({ mode: "end" }));
        updateSleepTimerUI();
        showToast("Se detendrá al finalizar la canción actual", "success");
        return;
    }
    const minutes = parseInt(value, 10);
    if (Number.isNaN(minutes) || minutes <= 0) return;
    const endAt = Date.now() + minutes * 60 * 1000;
    scheduleSleepTimer(endAt, minutes);
    showToast(`Temporizador activado: ${minutes} min`, "success");
}

function createSmartMix() {
    const list = appState.currentFilteredList?.length ? appState.currentFilteredList : appState.playlist;
    if (!list || list.length === 0) {
        showToast("No hay canciones para mezclar", "warning");
        return;
    }
    const currentId = appState.playlist[appState.currentIndex]?.id;
    const existingIds = new Set(appState.queue.map(song => song.id));
    const candidates = list.filter(song => song.id !== currentId && !existingIds.has(song.id));
    if (!candidates.length) {
        showToast("Tu cola ya tiene todas las canciones disponibles", "warning");
        return;
    }
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const size = Math.min(12, shuffled.length);
    appState.queue.push(...shuffled.slice(0, size));
    renderQueue();
    updateQueueIndicator();
    showToast(`Smart Mix listo: ${size} canciones a la cola`, "success");
}

// =========================================
// QUEUE SYSTEM
// =========================================
function toggleQueue() {
    queueDrawer.classList.toggle('open');
    queueOverlay.classList.toggle('active');
    if (queueDrawer.classList.contains('open')) {
        renderQueue();
    }
}

function renderQueue() {
    queueList.innerHTML = '';
    const currentSong = appState.playlist[appState.currentIndex];
    const upcoming = appState.queue.length
        ? [currentSong, ...appState.queue].filter(Boolean)
        : appState.currentFilteredList.slice(
            appState.currentFilteredList.findIndex(s => 
                appState.playlist[appState.currentIndex]?.id === s.id
            )
        );
    
    upcoming.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = `queue-item ${index === 0 ? 'current' : ''}`;
        item.setAttribute('data-testid', `queue-item-${song.id}`);
        item.innerHTML = `
            <img class="queue-item-cover" src="assets/default-cover.png" id="queue-cover-${song.id}">
            <div class="queue-item-info">
                <div class="queue-item-title">${formatDisplayName(song.name)}</div>
            </div>
            ${index > 0 ? `
                <button class="queue-item-remove" onclick="removeFromQueue(${song.id})" data-testid="queue-remove-${song.id}">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            ` : ''}
        `;
        
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.queue-item-remove')) {
                if (appState.offlineMode) {
                    playOfflineSongById(song.id, { fadeOutMs: getFadeDurationMs() / 2, fadeInMs: getFadeDurationMs() / 2 });
                } else {
                    const masterIdx = appState.playlist.findIndex(s => s.id === song.id);
                    playSong(masterIdx, { fadeOutMs: getFadeDurationMs() / 2, fadeInMs: getFadeDurationMs() / 2 });
                }
            }
        });
        
        queueList.appendChild(item);
        loadMetadata(song.url, `queue-cover-${song.id}`);
    });
    updateQueueIndicator();
}

window.removeFromQueue = (songId) => {
    if (appState.queue.length) {
        const index = appState.queue.findIndex(s => s.id === songId);
        if (index >= 0) {
            appState.queue.splice(index, 1);
            renderQueue();
        }
        updateQueueIndicator();
        return;
    }
    const index = appState.currentFilteredList.findIndex(s => s.id === songId);
    if (index > 0) {
        appState.currentFilteredList.splice(index, 1);
        renderQueue();
    }
    updateQueueIndicator();
};

window.addToQueue = (event, songId) => {
    event?.stopPropagation();
    const song = appState.playlist.find(s => s.id === songId);
    if (!song) return;
    const exists = appState.queue.some(s => s.id === songId);
    if (!exists) {
        appState.queue.push(song);
        updateQueueIndicator();
        if (queueDrawer.classList.contains('open')) {
            renderQueue();
        }
    }
};

if (queueBtn) queueBtn.onclick = toggleQueue;
if (closeQueue) closeQueue.onclick = toggleQueue;
if (queueOverlay) queueOverlay.onclick = toggleQueue;
if (smartMixBtn) smartMixBtn.onclick = createSmartMix;
if (applySleepTimerBtn) {
    applySleepTimerBtn.onclick = () => {
        setSleepTimerFromSelection(sleepTimerSelect?.value);
    };
}

// =========================================
// EQUALIZER SYSTEM
// =========================================
function toggleEqualizer() {
    equalizerModal.classList.toggle('open');
}

function initEqualizer() {
    if (!appState.audioCtx) return;
    const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
    appState.eqFilters = frequencies.map((freq, i) => {
        const filter = appState.audioCtx.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === frequencies.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
    });
    
    appState.eqFilters.reduce((prev, curr) => {
        prev.connect(curr);
        return curr;
    });
    
    if (appState.source && appState.analyser) {
        appState.source.disconnect();
        appState.source.connect(appState.eqFilters[0]);
        appState.eqFilters[appState.eqFilters.length - 1].connect(appState.analyser);
    }
}

function applyEQPreset(preset) {
    const values = EQ_PRESETS[preset] || EQ_PRESETS.flat;
    const sliders = document.querySelectorAll('.eq-band input');
    
    sliders.forEach((slider, i) => {
        slider.value = values[i];
        if (appState.eqFilters[i]) {
            appState.eqFilters[i].gain.value = values[i];
        }
    });
    
    // Update active button
    document.querySelectorAll('.eq-preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
    });
    
    localStorage.setItem('eqPreset', preset);
}

// EQ event listeners
if (eqBtn) eqBtn.onclick = toggleEqualizer;
if (closeEq) closeEq.onclick = toggleEqualizer;

document.querySelectorAll('.eq-preset-btn').forEach(btn => {
    btn.onclick = () => applyEQPreset(btn.dataset.preset);
});

document.querySelectorAll('.eq-band input').forEach((slider, i) => {
    slider.oninput = (e) => {
        if (appState.eqFilters[i]) {
            appState.eqFilters[i].gain.value = parseFloat(e.target.value);
        }
    };
});

// Shortcuts modal listeners
if (closeShortcuts) closeShortcuts.onclick = toggleShortcutsModal;

// =========================================
// VOLUME & THEME
// =========================================
function setAppVolume(value) {
    const vol = Math.max(0, Math.min(1, parseFloat(value)));
    audio.volume = vol;
    volume.value = vol;
    appState.userVolume = vol;
    localStorage.setItem("userVolume", vol);
    updateVolumeIcon();
}

function updateVolumeIcon() {
    const volumeIcon = document.getElementById("volumeIcon");
    if (volumeIcon) {
        volumeIcon.innerHTML = audio.volume === 0 ? ICONS.VOLUME_MUTE : ICONS.VOLUME;
        volumeIcon.style.opacity = audio.volume === 0 ? "0.5" : "1";
    }
}

function getFadeDurationMs() {
    return Math.max(1, appState.fadeDuration) * 1000;
}

function shouldUseFade() {
    return appState.fadeEnabled && !appState.isMuted;
}

function rampVolume(target, durationMs) {
    const clampedTarget = Math.max(0, Math.min(1, target));
    if (durationMs <= 0) {
        audio.volume = clampedTarget;
        return Promise.resolve();
    }
    appState.isFading = true;
    const startVolume = audio.volume;
    const startTime = performance.now();
    return new Promise((resolve) => {
        const step = (now) => {
            const progress = Math.min((now - startTime) / durationMs, 1);
            audio.volume = startVolume + (clampedTarget - startVolume) * progress;
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                appState.isFading = false;
                resolve();
            }
        };
        requestAnimationFrame(step);
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    if (themeToggle) themeToggle.innerHTML = theme === "dark" ? ICONS.MOON : ICONS.SUN;
}

themeToggle.onclick = toggleTheme;

// =========================================
// LOGIN SYSTEM
// =========================================
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

window.switchDevPanel = (panelId) => {
    document.querySelectorAll('.dev-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dev-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');
    event.currentTarget.classList.add('active');
};

window.loadUsersList = async () => {
    const tbody = document.getElementById("usersListBody");
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center">${ICONS.LOADING}</td></tr>`;

    const { data, error } = await supabaseClient.from('users_access').select('id, username, role');
    if (error) {
        tbody.innerHTML = "<tr><td colspan='3'>Error al cargar datos</td></tr>";
        return;
    }

    tbody.innerHTML = "";
    data.forEach(user => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${user.username}</td>
            <td><small class="badge-${user.role}">${user.role}</small></td>
            <td>
                <button class="btn-delete-small" onclick="deleteUserRecord(${user.id}, '${user.role}', '${user.username}')">Borrar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

function checkSavedSession() {
    const sessionActive = localStorage.getItem("jodify_session_active");
    const savedRole = localStorage.getItem("jodify_user_role");
    const savedUser = localStorage.getItem("currentUserName");

    if (sessionActive === "true" && savedRole && savedUser) {
        appState.usuarioActual = savedUser;
        appState.currentUserRole = savedRole;
        document.getElementById("loginScreen").style.display = "none";
        configurarInterfazPorRol(savedRole);
        return true;
    }
    return false;
}

function configurarInterfazPorRol(role) {
    if (role === 'dev' || role === 'admin') {
        if (addSongContainer) addSongContainer.style.display = "flex";
        if (addActions) addActions.style.display = "flex";
        if (openLinkModalBtn) openLinkModalBtn.style.display = "inline-flex";
        if (openLinkModalFooterBtn) openLinkModalFooterBtn.style.display = "inline-flex";
        if (btnOpenRegister) btnOpenRegister.style.display = "flex";
        if (fileInput) fileInput.disabled = false;
    } else {
        if (addSongContainer) addSongContainer.style.display = "none";
        if (addActions) addActions.style.display = "none";
        if (openLinkModalBtn) openLinkModalBtn.style.display = "none";
        if (openLinkModalFooterBtn) openLinkModalFooterBtn.style.display = "none";
        if (btnOpenRegister) btnOpenRegister.style.display = "none";
        if (fileInput) fileInput.disabled = true;
    }
}

// =========================================
// HEARTBEAT (ONLINE STATUS)
// =========================================
async function startHeartbeat(username) {
    if (appState.heartbeatInterval) clearInterval(appState.heartbeatInterval);

    const sendPulse = async () => {
        if (!navigator.onLine) return;
        try {
            await supabaseClient
                .from('users_access')
                .update({
                    last_seen: new Date().toISOString(),
                    is_online: 1
                })
                .eq('username', username);
        } catch (e) {
            console.warn("Heartbeat error:", e);
        }
    };

    sendPulse();
    appState.heartbeatInterval = setInterval(sendPulse, 30000);
}

// =========================================
// NETWORK STATUS
// =========================================
window.addEventListener('online', () => {
    console.log("Connection restored");
    appState.offlineMode = false;
    if (btnGlobal) btnGlobal.style.display = "flex";
    document.body.classList.remove('offline-mode-active');
    fetchSongs();
});

window.addEventListener('offline', () => {
    console.log("Offline mode detected");
    showOfflineModal();
});

function showOfflineModal() {
    const modal = document.getElementById('offlineModal');
    if (modal) modal.style.display = 'flex';
}

window.enableOfflineMode = async () => {
    const modal = document.getElementById('offlineModal');
    if (modal) modal.style.display = 'none';
    
    appState.offlineMode = true;
    appState.currentTab = "personal";
    
    if (btnGlobal) btnGlobal.style.display = "none";
    if (btnPersonal) {
        btnPersonal.classList.add("active");
        btnGlobal.classList.remove("active");
    }
    
    document.body.classList.add('offline-mode-active');
    
    // Load songs from IndexedDB
    await loadOfflineSongs();
    renderPlaylist();
    
    console.log("Offline mode enabled with", appState.downloadedIds.length, "songs");
};

async function loadOfflineSongs() {
    return new Promise((resolve) => {
        if (!appState.db) return resolve();
        
        const transaction = appState.db.transaction(["songs"], "readonly");
        const store = transaction.objectStore("songs");
        const request = store.getAll();
        
        request.onsuccess = () => {
            const offlineSongs = request.result || [];
            appState.downloadedIds = offlineSongs.map(s => s.id);
            
            // Merge offline songs into playlist if not already there
            offlineSongs.forEach(song => {
                if (!appState.playlist.find(s => s.id === song.id)) {
                    appState.playlist.push(song);
                }
            });
            
            resolve();
        };
        request.onerror = () => resolve();
    });
}

// =========================================
// SYSTEM LOGS
// =========================================
async function addSystemLog(type, message) {
    const adminName = appState.usuarioActual || "System";

    try {
        await supabaseClient
            .from('system_logs')
            .insert([{
                event_type: type,
                message: message,
                admin_user: adminName
            }]);
    } catch (err) {
        console.error("Error saving log:", err);
    }
}

window.fetchLogs = async () => {
    const logsBody = document.getElementById("logsBody");
    if (!logsBody) return;

    logsBody.innerHTML = `
        <div class="log-line info">
            <span class="log-prefix">❯</span>
            <span class="log-msg">Conectando...</span>
        </div>`;

    const { data, error } = await supabaseClient
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        logsBody.innerHTML = `
            <div class="log-line error">
                <span class="log-prefix">❯</span>
                <span class="log-badge">ERROR</span>
                <span class="log-msg">${error.message}</span>
            </div>`;
        return;
    }

    logsBody.innerHTML = "";
    data.forEach(log => {
        const date = new Date(log.created_at).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });

        const div = document.createElement("div");
        const typeLower = log.event_type.toLowerCase();
        div.className = `log-line ${typeLower}`;
        div.innerHTML = `
            <span class="log-prefix">❯</span>
            <span class="log-time">${date}</span>
            <span class="log-badge">${typeLower.toUpperCase()}</span>
            <span class="log-msg"><strong>@${log.admin_user || 'system'}:</strong> ${log.message}</span>
        `;
        logsBody.appendChild(div);
    });
};

window.clearLogs = () => {
    const logsBody = document.getElementById("logsBody");
    logsBody.style.opacity = "0";
    setTimeout(() => {
        logsBody.innerHTML = `<div class="log-line info"><span class="log-prefix">❯</span> Consola limpia.</div>`;
        logsBody.style.opacity = "1";
    }, 200);
};

window.deleteUserRecord = async (id, role, name) => {
    if (role.toLowerCase() === 'dev') {
        alert("No se puede eliminar usuarios dev.");
        return;
    }

    if (!confirm(`¿Eliminar a "${name}"?`)) return;

    try {
        const { error } = await supabaseClient.from('users_access').delete().eq('id', id);
        if (error) throw error;
        addSystemLog('warn', `Eliminó al usuario: ${name}`);
        window.loadUsersList();
    } catch (err) {
        alert("Error: " + err.message);
    }
};

// =========================================
// PASSWORD TOGGLE
// =========================================
if (passwordInput && togglePassword) {
    togglePassword.innerHTML = ICONS.EYE;

    passwordInput.addEventListener("input", () => {
        togglePassword.style.display = passwordInput.value.length > 0 ? "flex" : "none";
    });

    togglePassword.addEventListener("click", () => {
        const isPassword = passwordInput.getAttribute("type") === "password";
        passwordInput.setAttribute("type", isPassword ? "text" : "password");
        togglePassword.innerHTML = isPassword ? ICONS.EYE_OFF : ICONS.EYE;
    });
}

// =========================================
// LOCAL ADMIN USERS (No requiere conexión a Supabase)
// =========================================
const LOCAL_USERS = {
    'user': { password: 'user123', role: 'user', username: 'user' }
};

function validateLocalUser(username, password) {
    const user = LOCAL_USERS[username.toLowerCase()];
    if (user && user.password === password) {
        return { ...user };
    }
    return null;
}

// =========================================
// LOGIN FORM
// =========================================
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();

        const userIn = document.getElementById("username").value.trim();
        const passIn = passwordInput.value;
        const submitBtn = loginForm.querySelector('button');
        const keepSession = document.getElementById("keepSession")?.checked;

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Verificando...";
        loginError.style.display = "none";

        try {
            // Primero intentar validación local
            const localUser = validateLocalUser(userIn, passIn);
            
            if (localUser) {
                // Usuario local válido
                console.log("Login local exitoso:", localUser.username);
                localStorage.setItem("currentUserName", localUser.username);
                appState.usuarioActual = localUser.username;

                if (keepSession) {
                    localStorage.setItem("jodify_session_active", "true");
                    localStorage.setItem("jodify_user_role", localUser.role);
                }

                handleLoginSuccess(localUser.role);
                return;
            }

            // Si no es usuario local, intentar con Supabase (si hay conexión)
            if (!navigator.onLine) {
                throw new Error("Sin conexión. Usa un usuario local: admin/admin123");
            }

            const { data, error } = await supabaseClient
                .from('users_access')
                .select('*')
                .eq('username', userIn)
                .eq('password', passIn)
                .single();

            if (error || !data) throw new Error("Usuario o contraseña incorrectos");

            localStorage.setItem("currentUserName", data.username);
            appState.usuarioActual = data.username;

            if (keepSession) {
                localStorage.setItem("jodify_session_active", "true");
                localStorage.setItem("jodify_user_role", data.role);
            }

            handleLoginSuccess(data.role);
        } catch (err) {
            loginError.textContent = err.message;
            loginError.style.display = "block";
            passwordInput.value = "";
            togglePassword.style.display = "none";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    };
}

// =========================================
// LOGOUT
// =========================================
const btnLogout = document.getElementById("btnLogout");
const logoutLoading = document.getElementById("logoutLoading");

if (btnLogout) {
    btnLogout.onclick = async () => {
        if (!confirm("¿Cerrar sesión?")) return;

        logoutLoading.style.display = "flex";

        try {
            if (appState.usuarioActual && navigator.onLine) {
                await supabaseClient
                    .from('users_access')
                    .update({ is_online: 0 })
                    .eq('username', appState.usuarioActual);

                await addSystemLog('info', `Cerró sesión.`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));

            if (appState.heartbeatInterval) clearInterval(appState.heartbeatInterval);
            audio.pause();
            audio.src = "";

            localStorage.removeItem("jodify_session_active");
            localStorage.removeItem("jodify_user_role");
            localStorage.removeItem("currentUserName");

            appState.usuarioActual = "";
            appState.currentUserRole = null;
            appState.playlist = [];

            document.getElementById("loginScreen").style.display = "flex";
            const loginForm = document.getElementById("loginForm");
            if (loginForm) loginForm.reset();
            if (songList) songList.innerHTML = "";

            if (addSongContainer) addSongContainer.style.display = "none";
            if (addActions) addActions.style.display = "none";
            if (openLinkModalBtn) openLinkModalBtn.style.display = "none";
            if (openLinkModalFooterBtn) openLinkModalFooterBtn.style.display = "none";
            if (btnOpenRegister) btnOpenRegister.style.display = "none";
        } catch (err) {
            console.error("Logout error:", err);
            location.reload();
        } finally {
            logoutLoading.style.display = "none";
        }
    };
}

// =========================================
// REGISTER FORM
// =========================================
const registerForm = document.getElementById("registerForm");

function handleLoginSuccess(role) {
    appState.currentUserRole = role;
    document.getElementById("loginScreen").style.display = "none";

    if (addSongContainer) addSongContainer.style.display = "none";
    if (addActions) addActions.style.display = "none";
    if (openLinkModalBtn) openLinkModalBtn.style.display = "none";
    if (openLinkModalFooterBtn) openLinkModalFooterBtn.style.display = "none";
    if (btnOpenRegister) btnOpenRegister.style.display = "none";

    if (role === 'dev') {
        if (addSongContainer) addSongContainer.style.display = "flex";
        if (addActions) addActions.style.display = "flex";
        if (openLinkModalBtn) openLinkModalBtn.style.display = "inline-flex";
        if (openLinkModalFooterBtn) openLinkModalFooterBtn.style.display = "inline-flex";
        if (btnOpenRegister) btnOpenRegister.style.display = "flex";
        if (fileInput) fileInput.disabled = false;
    } else if (role === 'admin') {
        if (addSongContainer) addSongContainer.style.display = "flex";
        if (addActions) addActions.style.display = "flex";
        if (openLinkModalBtn) openLinkModalBtn.style.display = "inline-flex";
        if (openLinkModalFooterBtn) openLinkModalFooterBtn.style.display = "inline-flex";
        if (fileInput) fileInput.disabled = false;
    } else {
        if (fileInput) fileInput.disabled = true;
    }

    startHeartbeat(appState.usuarioActual);
    initApp();
}

if (btnOpenRegister) {
    btnOpenRegister.onclick = () => {
        registerModal.style.display = "flex";
        window.switchDevPanel('panel-register');
    };
}

if (closeRegisterBtn) {
    closeRegisterBtn.onclick = () => {
        registerModal.style.display = "none";
    };
}

if (registerForm) {
    registerForm.onsubmit = async (e) => {
        e.preventDefault();

        const msg = document.getElementById("regMessage");
        const submitBtn = registerForm.querySelector('button[type="submit"]');

        const userValue = document.getElementById("regUsername").value.trim();
        const passValue = document.getElementById("regPassword").value;
        const roleValue = document.getElementById("regRole").value;

        if (!userValue || !passValue) {
            msg.style.color = "#FF3366";
            msg.textContent = "Completa todos los campos.";
            return;
        }

        submitBtn.disabled = true;
        msg.textContent = "";

        try {
            const { error } = await supabaseClient
                .from('users_access')
                .insert([{ username: userValue, password: passValue, role: roleValue }]);

            if (error) throw error;
            msg.style.color = "#00FF88";
            msg.innerHTML = `${ICONS.SUCCESS} ¡Usuario creado!`;
            registerForm.reset();

            setTimeout(() => {
                registerModal.style.display = "none";
                msg.textContent = "";
            }, 2000);
        } catch (err) {
            msg.style.color = "#FF3366";
            msg.textContent = "Error: " + err.message;
        } finally {
            submitBtn.disabled = false;
        }
    };
}

// =========================================
// APP INITIALIZATION
// =========================================
async function initApp() {
    await syncDownloadedSongs();

    // Electron controls
    if (window.electronAPI && window.electronAPI.onControlCommand) {
        window.electronAPI.onControlCommand((command) => {
            switch (command) {
                case 'play': togglePlay(); break;
                case 'next': handleNextSong(); break;
                case 'prev': handlePrevSong(); break;
            }
        });
    }

    if (!navigator.onLine) {
        showOfflineModal();
    } else {
        fetchSongs();
    }
}

async function syncDownloadedSongs() {
    return new Promise((resolve) => {
        if (!appState.db) return resolve();
        const transaction = appState.db.transaction(["songs"], "readonly");
        const store = transaction.objectStore("songs");
        const request = store.getAllKeys();
        request.onsuccess = () => {
            appState.downloadedIds = request.result || [];
            resolve();
        };
        request.onerror = () => resolve();
    });
}

// =========================================
// UTILITIES
// =========================================
function sanitizeFileName(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, "_").replace(/\.{2,}/g, ".").replace(/_{2,}/g, "_");
}

function formatDisplayName(name) {
    return name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
}

async function getGradientColors(imgElement) {
    return new Promise((resolve) => {
        const analyze = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 10; canvas.height = 10;
                ctx.drawImage(imgElement, 0, 0, 10, 10);
                const data = ctx.getImageData(0, 0, 10, 10).data;
                const colors = [];
                for (let i = 0; i < data.length; i += 120) {
                    colors.push(`rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`);
                }
                resolve(`linear-gradient(90deg, ${colors[0]}, ${colors[1] || colors[0]}, ${colors[2] || colors[0]})`);
            } catch (e) {
                resolve('var(--gradient-primary)');
            }
        };
        if (imgElement.complete) analyze(); else imgElement.onload = analyze;
    });
}

// =========================================
// UPLOAD SYSTEM
// =========================================
function toggleModal(show) {
    uploadModal.style.display = show ? "flex" : "none";
}

function toggleLinkModal(show) {
    if (!linkModal) return;
    linkModal.style.display = show ? "flex" : "none";
    if (!show && linkImportStatus) {
        linkImportStatus.textContent = "";
    }
}

async function startUploadSession(files) {
    if (!files.length) return;

    appState.isUploading = true;
    uploadBadge.style.display = "flex";
    toggleModal(true);

    const modalHeader = uploadModal.querySelector('.modal-header');
    uploadList.innerHTML = `<div id="itemsScrollContainer"></div>`;
    const scrollContainer = document.getElementById("itemsScrollContainer");

    modalHeader.innerHTML = `
        <div class="header-flex">
            <h3 id="modalTitle">Subiendo canciones...</h3>
            <div class="upload-counter">
                <div class="stat">Total: <span id="totalCount" class="count-total">0</span></div>
                <div class="stat">Éxito: <span id="successCount" class="count-success">0</span></div>
                <div class="stat">Aviso: <span id="errorCount" class="count-error">0</span></div>
            </div>
        </div>
        <button id="closeModalBtn" class="close-btn">&times;</button>
    `;

    document.getElementById("closeModalBtn").onclick = () => toggleModal(false);

    let stats = { success: 0, error: 0, total: files.length };
    document.getElementById("totalCount").textContent = stats.total;

    for (const file of files) {
        if (!file.type.startsWith('audio/')) {
            stats.error++;
            document.getElementById("errorCount").textContent = stats.error;
            continue;
        }

        await processAndUpload(file, scrollContainer, (status) => {
            if (status === 'success') {
                stats.success++;
                addSystemLog('info', `Subió: "${formatDisplayName(file.name)}"`);
            } else {
                stats.error++;
            }
            document.getElementById("successCount").textContent = stats.success;
            document.getElementById("errorCount").textContent = stats.error;
            if (badgeText) {
                badgeText.innerHTML = `<span class="spin-mini">${ICONS.LOADING}</span> ${stats.success + stats.error}/${stats.total}`;
            }
        });

        scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }

    document.getElementById("modalTitle").innerHTML = `${ICONS.SUCCESS} Completado`;
    if (badgeText) badgeText.innerHTML = `${ICONS.SUCCESS} Listo`;

    appState.isUploading = false;
    if (stats.success > 0) {
        notificationSound.play().catch(() => {});
        fetchSongs();
    }

    setTimeout(() => {
        if (!appState.isUploading) uploadBadge.style.display = "none";
    }, 5000);
}

if (uploadBadge) {
    uploadBadge.onclick = () => {
        if (appState.currentUserRole === 'admin' || appState.currentUserRole === 'dev') {
            toggleModal(true);
        }
    };
}

if (closeModal) {
    closeModal.onclick = () => toggleModal(false);
}

if (openLinkModalBtn) {
    openLinkModalBtn.onclick = () => {
        if (appState.currentUserRole === 'admin' || appState.currentUserRole === 'dev') {
            toggleLinkModal(true);
        } else {
            showToast("Solo admins o devs pueden importar enlaces", "warning");
        }
    };
}

if (openLinkModalFooterBtn) {
    openLinkModalFooterBtn.onclick = () => {
        if (appState.currentUserRole === 'admin' || appState.currentUserRole === 'dev') {
            toggleLinkModal(true);
        } else {
            showToast("Solo admins o devs pueden importar enlaces", "warning");
        }
    };
}

if (closeLinkModalBtn) {
    closeLinkModalBtn.onclick = () => toggleLinkModal(false);
}

if (linkCancelBtn) {
    linkCancelBtn.onclick = () => toggleLinkModal(false);
}

fileInput.onchange = async (e) => {
    if (appState.currentUserRole !== 'admin' && appState.currentUserRole !== 'dev') return;

    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    await startUploadSession(files);
};

function extractFilenameFromHeader(header) {
    if (!header) return null;
    const match = /filename="(.+?)"/.exec(header);
    if (match?.[1]) return match[1];
    const fallbackMatch = /filename=(.+)/.exec(header);
    return fallbackMatch?.[1] || null;
}

async function importFromLink() {
    if (appState.currentUserRole !== 'admin' && appState.currentUserRole !== 'dev') {
        showToast("Solo admins o devs pueden importar enlaces", "warning");
        return;
    }
    if (window.location.protocol === 'file:') {
        if (linkImportStatus) linkImportStatus.textContent = "Necesitas ejecutar el backend para importar enlaces.";
        showToast("Importación disponible solo con servidor activo", "warning");
        return;
    }
    const url = linkInput?.value.trim();
    if (!url) {
        if (linkImportStatus) linkImportStatus.textContent = "Ingresa un enlace válido.";
        return;
    }
    if (linkImportStatus) linkImportStatus.textContent = "Descargando audio...";
    if (linkImportBtn) linkImportBtn.disabled = true;
    if (linkInput) linkInput.disabled = true;

    try {
        const response = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        if (!response.ok) {
            let detail = "No se pudo importar el enlace.";
            try {
                const data = await response.json();
                detail = data?.detail || detail;
            } catch (e) {
                detail = detail;
            }
            throw new Error(detail);
        }
        const blob = await response.blob();
        const contentType = response.headers.get('content-type') || 'audio/mpeg';
        const disposition = response.headers.get('content-disposition');
        const filename = extractFilenameFromHeader(disposition) || `import-${Date.now()}.mp3`;
        const file = new File([blob], filename, { type: contentType });
        if (linkImportStatus) linkImportStatus.textContent = "Subiendo a la biblioteca...";
        await startUploadSession([file]);
        if (linkInput) linkInput.value = "";
        toggleLinkModal(false);
        showToast("Importación iniciada", "success");
    } catch (err) {
        if (linkImportStatus) linkImportStatus.textContent = err.message;
        showToast("No se pudo importar el enlace", "error");
    } finally {
        if (linkImportBtn) linkImportBtn.disabled = false;
        if (linkInput) linkInput.disabled = false;
    }
}

if (linkImportBtn) {
    linkImportBtn.onclick = importFromLink;
}

async function processAndUpload(file, container, updateStats) {
    const sanitizedName = sanitizeFileName(file.name);
    const itemId = `up-${Math.random().toString(36).substr(2, 9)}`;
    const controller = new AbortController();
    appState.activeUploads[itemId] = controller;

    const itemDiv = document.createElement("div");
    itemDiv.className = "upload-item";
    itemDiv.innerHTML = `
        <img src="assets/default-cover.png" id="img-${itemId}" class="modal-preview-img" crossorigin="anonymous">
        <div class="upload-info">
            <p>${formatDisplayName(file.name)}</p>
            <div class="progress-container"><div class="progress-bar" id="bar-${itemId}"></div></div>
            <small id="txt-${itemId}">Analizando...</small>
        </div>
        <div class="status-icon" id="icon-${itemId}">
            <button class="cancel-btn" onclick="cancelUpload('${itemId}')">Cancelar</button>
        </div>
    `;
    container.appendChild(itemDiv);

    const bar = document.getElementById(`bar-${itemId}`);
    const imgEl = document.getElementById(`img-${itemId}`);
    const txt = document.getElementById(`txt-${itemId}`);
    const icon = document.getElementById(`icon-${itemId}`);

    await new Promise(res => {
        jsmediatags.read(file, {
            onSuccess: async (tag) => {
                const img = tag.tags.picture;
                if (img) {
                    let b64 = "";
                    for (let i = 0; i < img.data.length; i++) b64 += String.fromCharCode(img.data[i]);
                    imgEl.src = `data:${img.format};base64,${window.btoa(b64)}`;
                    bar.style.background = await getGradientColors(imgEl);
                } else {
                    bar.style.background = "var(--gradient-primary)";
                }
                res();
            },
            onError: () => { bar.style.background = "var(--gradient-primary)"; res(); }
        });
    });

    try {
        const { data: existing } = await supabaseClient.from('songs').select('id').eq('name', sanitizedName);
        if (existing?.length > 0) throw new Error("EXISTE");

        txt.textContent = "Subiendo...";
        bar.style.width = "50%";

        const finalPath = `${Date.now()}_${sanitizedName}`;
        const { error: upErr } = await supabaseClient.storage.from('Canciones').upload(finalPath, file, {
            abortSignal: controller.signal
        });
        if (upErr) throw upErr;

        const { data: urlData } = supabaseClient.storage.from('Canciones').getPublicUrl(finalPath);

        const { error: insErr } = await supabaseClient.from('songs').insert([{
            name: sanitizedName,
            url: urlData.publicUrl,
            likes: 0,
            added_by: appState.usuarioActual || "Anónimo"
        }]);

        if (insErr) throw insErr;

        bar.style.width = "100%";
        bar.style.background = "var(--success)";
        txt.textContent = "¡Completado!";
        icon.innerHTML = ICONS.SUCCESS;
        updateStats('success');
    } catch (e) {
        if (e.name === 'AbortError') {
            txt.textContent = "Cancelado";
            bar.style.background = "var(--text-muted)";
        } else if (e.message === "EXISTE") {
            txt.textContent = "Ya existe";
            bar.style.background = "var(--warning)";
            icon.innerHTML = ICONS.WARNING;
        } else {
            txt.textContent = "Error";
            bar.style.background = "var(--error)";
            icon.innerHTML = ICONS.ERROR;
        }
        updateStats('error');
    } finally {
        delete appState.activeUploads[itemId];
    }
}

window.cancelUpload = (id) => {
    if (appState.activeUploads[id]) appState.activeUploads[id].abort();
};

// =========================================
// PLAYLIST & DATA
// =========================================
async function fetchSongs() {
    try {
        const { data, error } = await supabaseClient.from('songs').select('*').order('id', { ascending: false });
        
        if (error) {
            console.error("Fetch error:", error);
            showOfflineModal();
            return;
        }
        
        appState.playlist = data || [];
        appState.availableUsers = [...new Set(data.map(s => s.added_by).filter(Boolean))];
        
        if (sortOptions) {
            sortOptions.innerHTML = `
                <option value="recent">Recientes</option>
                <option value="old">Antiguos</option>
                <option value="popular">Más Populares</option>
                ${appState.availableUsers.map(u => `<option value="user-${u}">${u}</option>`).join('')}
            `;
        }
        
        renderPlaylist();
    } catch (e) {
        console.error("Fetch songs error:", e);
        showOfflineModal();
    }
}

function getFilteredList() {
    let list;
    
    if (appState.offlineMode) {
        // In offline mode, get songs from IndexedDB
        list = appState.playlist.filter(s => appState.downloadedIds.includes(s.id));
    } else {
        list = appState.currentTab === "global" 
            ? [...appState.playlist] 
            : appState.playlist.filter(s => appState.likedIds.includes(s.id));
    }
    
    // Apply search filter
    if (appState.searchTerm) {
        list = list.filter(s => formatDisplayName(s.name).toLowerCase().includes(appState.searchTerm));
    }
    
    // Apply sorting
    switch (appState.currentSort) {
        case 'old':
            list.sort((a, b) => a.id - b.id);
            break;
        case 'popular':
            list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        default:
            list.sort((a, b) => b.id - a.id);
    }
    
    // Apply user filter
    if (appState.userFilter !== 'all') {
        list = list.filter(s => s.added_by === appState.userFilter);
    }
    
    return list;
}

function createSongElement(song, isCurrent, isDownloaded) {
    const li = document.createElement("li");
    const imgId = `img-list-${song.id}`;

    if (isCurrent) li.classList.add("active");

    li.innerHTML = `
        <div class="song-container" data-testid="song-item-${song.id}">
            <img src="assets/default-cover.png" id="${imgId}" class="playlist-cover" alt="${formatDisplayName(song.name)}">
            <div class="song-info">
                <span class="song-name">${formatDisplayName(song.name)}</span>
                <div class="song-metadatos">
                    <span class="song-artist">${appState.offlineMode ? 'Offline' : (song.likes || 0) + ' Likes'}</span>
                    <span class="separator">|</span>
                    <span class="added-by-tag">Por: <strong>${song.added_by || 'System'}</strong></span>
                </div>
            </div>
            <div class="song-actions">
                <button class="queue-add-btn" 
                        onclick="addToQueue(event, ${song.id})" 
                        title="Añadir a la cola"
                        data-testid="queue-add-${song.id}"
                        aria-label="Añadir a la cola">
                    ${ICONS.PLUS}
                </button>
                ${!appState.offlineMode ? `
                    <button class="like-btn ${appState.likedIds.includes(song.id) ? 'active' : ''}" 
                            onclick="toggleLike(event, ${song.id})" 
                            data-testid="like-btn-${song.id}"
                            aria-label="${appState.likedIds.includes(song.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
                        ${appState.likedIds.includes(song.id) ? ICONS.HEART_F : ICONS.HEART_E}
                    </button>
                    ${isDownloaded ? `
                        <button class="download-btn downloaded" 
                                onclick="deleteDownload(event, ${song.id})" 
                                title="Eliminar descarga"
                                data-testid="delete-download-${song.id}">
                            ${ICONS.SUCCESS}
                        </button>
                    ` : `
                        <button class="download-btn" 
                                onclick="downloadSong(event, ${song.id})"
                                data-testid="download-btn-${song.id}">
                            ${ICONS.DOWNLOAD}
                        </button>
                    `}
                ` : ''}
            </div>
        </div>`;

    // Load cover art
    if (isDownloaded && song.blob) {
        extractCoverFromBlob(song.blob, imgId);
    } else if (song.url) {
        loadMetadata(song.url, imgId);
    }

    li.onclick = (e) => {
        if (e.target.closest('button')) return;
        
        if (appState.offlineMode) {
            playOfflineSongById(song.id);
        } else {
            const masterIndex = appState.playlist.findIndex(s => s.id === song.id);
            playSong(masterIndex);
        }
    };
    
    return li;
}

async function playOfflineSongById(songId, options = {}) {
    if (!appState.db) return;
    if (appState.jamActive && !appState.jamHost && !appState.jamSyncInProgress) {
        alert("Solo el host puede cambiar la canción en una Jam.");
        return;
    }
    
    const transaction = appState.db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.get(songId);
    
    request.onsuccess = async () => {
        const song = request.result;
        if (song && song.blob) {
            if (appState.currentBlobUrl) {
                URL.revokeObjectURL(appState.currentBlobUrl);
            }
            const blobUrl = URL.createObjectURL(song.blob);
            appState.currentBlobUrl = blobUrl;
            
            if (isChangingTrack) return;
            isChangingTrack = true;
            appState.currentIndex = appState.playlist.findIndex(s => s.id === song.id);
            songTitle.textContent = formatDisplayName(song.name);
            
            try {
                await startSongPlayback(song, blobUrl, options);
            } finally {
                isChangingTrack = false;
            }
            if (appState.jamActive && appState.jamHost && !appState.jamSyncInProgress) {
                jam.broadcastJamState('jam-play');
            }
            
            loadMetadata(blobUrl, "cover", true);
            renderPlaylist();
            updateLikeBtn();
        }
    };
}

async function renderPlaylist() {
    songList.innerHTML = "";
    const list = getFilteredList();
    appState.currentFilteredList = list;
    const currentPlayingSong = appState.playlist[appState.currentIndex];

    list.forEach(song => {
        const isDownloaded = appState.downloadedIds.includes(song.id);
        const isCurrent = currentPlayingSong && song.id === currentPlayingSong.id;
        const li = createSongElement(song, isCurrent, isDownloaded);
        songList.appendChild(li);
    });
    updateSmartMixAvailability();
}

window.deleteDownload = async (event, songId) => {
    event.stopPropagation();
    if (!confirm("¿Eliminar esta descarga?")) return;
    
    if (!appState.db) return;
    
    const transaction = appState.db.transaction(["songs"], "readwrite");
    const store = transaction.objectStore("songs");
    
    store.delete(songId);
    
    transaction.oncomplete = async () => {
        await syncDownloadedSongs();
        renderPlaylist();
    };
};

function extractCoverFromBlob(blob, imgElementId) {
    jsmediatags.read(blob, {
        onSuccess: (tag) => {
            const pic = tag.tags.picture;
            if (pic) {
                const base64String = pic.data.map(char => String.fromCharCode(char)).join("");
                const el = document.getElementById(imgElementId);
                if (el) el.src = `data:${pic.format};base64,${window.btoa(base64String)}`;
            }
        },
        onError: () => {}
    });
}

window.downloadSong = async (event, songId) => {
    event.stopPropagation();
    
    if (!appState.db) {
        alert("Base de datos no disponible");
        return;
    }
    
    const song = appState.playlist.find(s => s.id === songId);
    if (!song) return;

    const btn = event.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<span class="spin">${ICONS.LOADING}</span>`;
    btn.disabled = true;

    try {
        const response = await fetch(song.url);
        if (!response.ok) throw new Error("Network error");
        
        const blob = await response.blob();

        const transaction = appState.db.transaction(["songs"], "readwrite");
        const store = transaction.objectStore("songs");

        await new Promise((resolve, reject) => {
            const putReq = store.put({ ...song, blob: blob });
            putReq.onsuccess = resolve;
            putReq.onerror = reject;
        });
        
        addSystemLog('info', `Descargó: "${formatDisplayName(song.name)}"`);
        notificationSound.play().catch(() => {});
        await syncDownloadedSongs();
        renderPlaylist();
    } catch (err) {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        alert("Error al descargar: " + err.message);
    }
};

// =========================================
// PLAYBACK CONTROLS
// =========================================
async function startSongPlayback(song, sourceUrl, options = {}) {
    const useFade = shouldUseFade() && audio.src && !audio.paused;
    const fadeOutMs = useFade ? options.fadeOutMs ?? getFadeDurationMs() / 2 : 0;
    const fadeInMs = useFade ? options.fadeInMs ?? getFadeDurationMs() / 2 : 0;
    const targetVolume = appState.userVolume ?? audio.volume ?? 1;

    if (useFade) {
        await rampVolume(0, fadeOutMs);
    }

    audio.src = sourceUrl;
    try {
        await audio.play();
        startVisualizer();
        updatePlayIcon(true);
    } catch (e) {
        console.error("Play error:", e);
    }

    if (useFade) {
        await rampVolume(targetVolume, fadeInMs);
    }
    appState.fadePending = false;
}

async function playSong(index, options = {}) {
    if (index < 0 || index >= appState.playlist.length) return;
    if (isChangingTrack) return;
    if (appState.jamActive && !appState.jamHost && !appState.jamSyncInProgress) {
        alert("Solo el host puede cambiar la canción en una Jam.");
        return;
    }
    
    isChangingTrack = true;
    appState.currentIndex = index;
    const song = appState.playlist[index];
    
    try {
        await startSongPlayback(song, song.url, options);
        // Incrementar contador de reproducción
        appState.playCount++;
        localStorage.setItem("playCount", appState.playCount);
        updateProfileStats();
        updateListeningActivity(song);
        if (appState.jamActive && appState.jamHost && !appState.jamSyncInProgress) {
            jam.broadcastJamState('jam-play');
        }
    } finally {
        isChangingTrack = false;
    }
    
    songTitle.textContent = formatDisplayName(song.name);
    loadMetadata(song.url, "cover", true);
    loadLRC(song.name);
    renderPlaylist();
    
    if (window.innerWidth <= 768) {
        setTimeout(() => toggleMobilePlaylist(false), 300);
    }
    
    updateLikeBtn();
}

async function handleNextSong(options = {}) {
    if (appState.currentFilteredList.length === 0) return;
    
    let next;
    if (appState.queue.length > 0) {
        next = appState.queue.shift();
        renderQueue();
    } else {
        const currentId = appState.playlist[appState.currentIndex]?.id;
        const idx = appState.currentFilteredList.findIndex(s => s.id === currentId);
        if (appState.isShuffle) {
            next = appState.currentFilteredList[Math.floor(Math.random() * appState.currentFilteredList.length)];
        } else {
            next = appState.currentFilteredList[(idx + 1) % appState.currentFilteredList.length];
        }
    }
    
    if (appState.offlineMode) {
        playOfflineSongById(next.id, options);
    } else {
        const masterIdx = appState.playlist.findIndex(s => s.id === next.id);
        playSong(masterIdx, options);
    }
}

async function handlePrevSong() {
    if (appState.currentFilteredList.length === 0) return;
    
    const currentId = appState.playlist[appState.currentIndex]?.id;
    const idx = appState.currentFilteredList.findIndex(s => s.id === currentId);
    const prevIdx = (idx - 1 + appState.currentFilteredList.length) % appState.currentFilteredList.length;
    const fadeOptions = { fadeOutMs: getFadeDurationMs() / 2, fadeInMs: getFadeDurationMs() / 2 };
    
    if (appState.offlineMode) {
        playOfflineSongById(appState.currentFilteredList[prevIdx].id, fadeOptions);
    } else {
        const masterIdx = appState.playlist.findIndex(s => s.id === appState.currentFilteredList[prevIdx].id);
        playSong(masterIdx, fadeOptions);
    }
}

audio.onended = () => {
    if (appState.fadePending) {
        return;
    }
    if (appState.sleepTimer.mode === "end") {
        triggerSleepTimer("Sleep timer completado");
        return;
    }
    if (appState.sleepTimer.triggered) {
        return;
    }
    if (!appState.isLoop) {
        handleNextSong();
    }
};

function loadMetadata(url, elId, isMain = false) {
    jsmediatags.read(url, {
        onSuccess: (tag) => {
            const img = tag.tags.picture;
            if (img) {
                let b64 = "";
                for (let i = 0; i < img.data.length; i++) b64 += String.fromCharCode(img.data[i]);
                const dataUrl = `data:${img.format};base64,${window.btoa(b64)}`;
                const el = document.getElementById(elId);
                if (el) el.src = dataUrl;
                if (isMain) {
                    cover.src = dataUrl;
                    dynamicBg.style.backgroundImage = `url(${dataUrl})`;
                }
            }
        },
        onError: () => {}
    });
}

async function loadLRC(name) {
    lyricsBox.innerHTML = "<p>Buscando letra...</p>";
    appState.lyrics = [];
    appState.currentLine = -1;
    
    try {
        const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(formatDisplayName(name))}`);
        const data = await res.json();
        
        if (data?.[0]?.syncedLyrics) {
            lyricsBox.innerHTML = "";
            data[0].syncedLyrics.split("\n").forEach(line => {
                const m = line.match(/\[(\d+):(\d+\.?\d*)\](.*)/);
                if (m) {
                    const time = parseInt(m[1]) * 60 + parseFloat(m[2]);
                    const p = document.createElement("p");
                    p.textContent = m[3].trim() || "•••";
                    p.onclick = () => audio.currentTime = time;
                    lyricsBox.appendChild(p);
                    appState.lyrics.push({ time, element: p });
                }
            });
        } else {
            lyricsBox.innerHTML = "<p>Letra no disponible</p>";
        }
    } catch {
        lyricsBox.innerHTML = "<p>Error de conexión</p>";
    }
}

// =========================================
// VISUALIZER
// =========================================
async function startVisualizer() {
    if (appState.audioCtx) return;
    
    try {
        appState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        appState.analyser = appState.audioCtx.createAnalyser();
        appState.source = appState.audioCtx.createMediaElementSource(audio);
        
        appState.source.connect(appState.analyser);
        appState.analyser.connect(appState.audioCtx.destination);
        appState.analyser.fftSize = 64;
        
        // Initialize equalizer
        initEqualizer();
        
        // Load saved EQ preset
        const savedPreset = localStorage.getItem('eqPreset') || 'flat';
        applyEQPreset(savedPreset);
        
        const bufferLength = appState.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        function draw() {
            requestAnimationFrame(draw);
            appState.analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, '#7F00FF');
            gradient.addColorStop(0.5, '#00F0FF');
            gradient.addColorStop(1, '#FF0080');
            ctx.fillStyle = gradient;
            
            let x = 0;
            const barWidth = (canvas.width / bufferLength) * 1.5;
            for (let i = 0; i < bufferLength; i++) {
                const h = (dataArray[i] / 255) * canvas.height;
                ctx.fillRect(x, canvas.height - h, barWidth - 1, h);
                x += barWidth;
            }
        }
        draw();
    } catch (e) {
        console.error("Visualizer error:", e);
    }
}

// =========================================
// TIME UPDATE (with progress fill)
// =========================================
audio.ontimeupdate = () => {
    // Update progress bar fill
    const progressBar = document.getElementById('progress');
    if (progressBar && audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.style.setProperty('--progress-percent', `${percent}%`);
    }

    if (audio.duration && shouldUseFade() && !appState.isLoop && !isChangingTrack && !audio.paused && !appState.fadePending) {
        const remaining = audio.duration - audio.currentTime;
        if (remaining > 0 && remaining <= appState.fadeDuration) {
            appState.fadePending = true;
            handleNextSong({
                fadeOutMs: Math.max(0, remaining * 1000),
                fadeInMs: getFadeDurationMs() / 2
            });
            return;
        }
    }
    
    if (appState.isLoop && audio.duration > 0 && audio.currentTime > audio.duration - 0.5) {
        audio.currentTime = 0;
        audio.play();
        return;
    }
    
    progress.value = audio.currentTime;
    progress.max = audio.duration || 0;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);

    // Lyrics sync
    if (appState.lyrics.length > 0) {
        const line = appState.lyrics.findLast(l => audio.currentTime >= l.time);
        if (line && line.element !== appState.lyrics[appState.currentLine]?.element) {
            if (appState.currentLine !== -1 && appState.lyrics[appState.currentLine]) {
                appState.lyrics[appState.currentLine].element.classList.remove("active");
            }
            appState.currentLine = appState.lyrics.indexOf(line);
            line.element.classList.add("active");
            line.element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }
};

function formatTime(t) {
    if (!t || isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function updatePlayIcon(isPlaying) {
    const playIconElement = document.getElementById("playIcon");
    if (playIconElement) {
        playIconElement.innerHTML = isPlaying
            ? `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`
            : `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    }
}

// =========================================
// EVENT LISTENERS
// =========================================
playBtn.onclick = togglePlay;
nextBtn.onclick = handleNextSong;
prevBtn.onclick = handlePrevSong;

progress.oninput = () => {
    if (appState.jamActive && !appState.jamHost && !appState.jamSyncInProgress) {
        alert("Solo el host puede adelantar la canción en una Jam.");
        return;
    }
    audio.currentTime = progress.value;
};
volume.oninput = (e) => setAppVolume(e.target.value);

btnGlobal.onclick = () => {
    appState.currentTab = "global";
    btnGlobal.classList.add("active");
    btnPersonal.classList.remove("active");
    renderPlaylist();
};

btnPersonal.onclick = () => {
    appState.currentTab = "personal";
    btnPersonal.classList.add("active");
    btnGlobal.classList.remove("active");
    renderPlaylist();
};

searchInput.oninput = (e) => {
    appState.searchTerm = e.target.value.toLowerCase();
    renderPlaylist();
};

shuffleBtn.onclick = toggleShuffle;
loopBtn.onclick = toggleRepeat;

function updateLikeBtn() {
    const likeBtn = document.getElementById("likeBtn");
    if (likeBtn && appState.currentIndex >= 0 && appState.playlist[appState.currentIndex]) {
        const isLiked = appState.likedIds.includes(appState.playlist[appState.currentIndex].id);
        likeBtn.innerHTML = isLiked ? ICONS.HEART_F : ICONS.HEART_E;
        likeBtn.classList.toggle('liked', isLiked);
    }
}

window.toggleLike = async (e, id) => {
    if (e) e.stopPropagation();
    
    const song = appState.playlist.find(s => s.id === id);
    if (!song) return;
    
    const wasLiked = appState.likedIds.includes(id);
    
    if (wasLiked) {
        appState.likedIds = appState.likedIds.filter(likedId => likedId !== id);
        song.likes = Math.max(0, (song.likes || 1) - 1);
    } else {
        appState.likedIds.push(id);
        song.likes = (song.likes || 0) + 1;
    }
    
    localStorage.setItem("likedSongs", JSON.stringify(appState.likedIds));
    renderPlaylist();
    updateLikeBtn();
    
    if (!wasLiked) {
        const likeBtn = document.getElementById("likeBtn");
        if (likeBtn) {
            likeBtn.classList.add('animate-like');
            setTimeout(() => likeBtn.classList.remove('animate-like'), 500);
        }
    }
    
    if (!appState.offlineMode) {
        try {
            await supabaseClient.from('songs').update({ likes: song.likes }).eq('id', id);
        } catch (e) {
            console.error("Like sync error:", e);
        }
    }
};

const likeBtn = document.getElementById("likeBtn");
if (likeBtn) {
    likeBtn.onclick = () => {
        if (appState.currentIndex >= 0) {
            toggleLike(null, appState.playlist[appState.currentIndex].id);
        }
    };
}

if (sortOptions) {
    sortOptions.onchange = (e) => {
        const value = e.target.value;
        if (value.startsWith('user-')) {
            appState.userFilter = value.split('-')[1];
            appState.currentSort = 'recent';
        } else {
            appState.currentSort = value;
            appState.userFilter = 'all';
        }
        renderPlaylist();
    };
}

// =========================================
// MOBILE PLAYLIST
// =========================================
const overlay = document.createElement('div');

document.body.appendChild(overlay);

function toggleMobilePlaylist(show) {
    playlistEl.classList.toggle('show', show);
    overlay.classList.toggle('active', show);
    document.body.style.overflow = show ? 'hidden' : '';
}

if (btnOpenPlaylist) btnOpenPlaylist.onclick = () => toggleMobilePlaylist(true);
overlay.onclick = () => toggleMobilePlaylist(false);

// =========================================
// FILTER LOGS
// =========================================
window.filterLogs = () => {
    const term = document.getElementById("logSearchInput").value.toLowerCase();
    const lines = document.querySelectorAll(".log-line");
    lines.forEach(line => {
        const text = line.textContent.toLowerCase();
        line.style.display = text.includes(term) ? "flex" : "none";
    });
};

// =========================================
// MODAL CLICK OUTSIDE
// =========================================
window.onclick = (e) => {
    if (e.target === uploadModal) toggleModal(false);
    if (e.target === registerModal) registerModal.style.display = "none";
    if (e.target === equalizerModal) equalizerModal.classList.remove('open');
    if (e.target === shortcutsModal) shortcutsModal.classList.remove('open');
    if (e.target === linkModal) toggleLinkModal(false);
};

// =========================================
// SETTINGS
// =========================================
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsModal = document.getElementById("closeSettingsModal");
const disableVisualizer = document.getElementById("disableVisualizer");
const disableDynamicBg = document.getElementById("disableDynamicBg");
const enableFocusMode = document.getElementById("enableFocusMode");
const enableFade = document.getElementById("enableFade");
const fadeDurationInput = document.getElementById("fadeDuration");
const fadeDurationValue = document.getElementById("fadeDurationValue");

if (settingsBtn) {
    settingsBtn.onclick = () => {
        settingsModal.style.display = 'flex';
    };
}

if (closeSettingsModal) {
    closeSettingsModal.onclick = () => {
        settingsModal.style.display = 'none';
    };
}

if (fadeDurationInput) {
    fadeDurationInput.oninput = (e) => {
        const value = parseInt(e.target.value, 10);
        if (fadeDurationValue) fadeDurationValue.textContent = `${value}s`;
    };
}

window.saveSettings = () => {
    const disableVis = disableVisualizer.checked;
    const disableBg = disableDynamicBg.checked;
    const focusMode = enableFocusMode?.checked ?? false;
    const fadeEnabled = enableFade?.checked ?? false;
    const fadeDuration = parseInt(fadeDurationInput?.value, 10) || 4;
    localStorage.setItem('disableVisualizer', disableVis);
    localStorage.setItem('disableDynamicBg', disableBg);
    localStorage.setItem('focusMode', focusMode);
    localStorage.setItem('fadeEnabled', fadeEnabled);
    localStorage.setItem('fadeDuration', fadeDuration);
    document.body.classList.toggle('no-visual', disableVis);
    document.body.classList.toggle('no-dynamic-bg', disableBg);
    document.body.classList.toggle('focus-mode', focusMode);
    appState.focusMode = focusMode;
    appState.fadeEnabled = fadeEnabled;
    appState.fadeDuration = fadeDuration;
    settingsModal.style.display = 'none';
};

// =========================================
// CLEANUP
// =========================================
function cleanupBeforeExit() {
    try {
        if (appState.heartbeatInterval) clearInterval(appState.heartbeatInterval);
        if (appState.sessionInterval) clearInterval(appState.sessionInterval);
        if (appState.sleepTimer.timeoutId) clearTimeout(appState.sleepTimer.timeoutId);
        if (appState.sleepTimer.intervalId) clearInterval(appState.sleepTimer.intervalId);
        if (appState.audioCtx) {
            appState.audioCtx.close();
            appState.audioCtx = null;
        }
        if (audio) {
            audio.pause();
            audio.src = "";
        }
        if (appState.currentBlobUrl) {
            URL.revokeObjectURL(appState.currentBlobUrl);
        }
        if (appState.usuarioActual && navigator.onLine) {
            supabaseClient
                .from('users_access')
                .update({ is_online: 0 })
                .eq('username', appState.usuarioActual);
        }
    } catch (e) {
        console.warn("Cleanup error:", e);
    }
}

if (window.electronAPI?.onAppClose) {
    window.electronAPI.onAppClose(() => cleanupBeforeExit());
}

// DOMContentLoaded for session recovery
document.addEventListener("DOMContentLoaded", () => {
    const sessionActive = localStorage.getItem("jodify_session_active");
    const savedRole = localStorage.getItem("jodify_user_role");
    const savedUser = localStorage.getItem("currentUserName");

    if (sessionActive === "true" && savedUser) {
        appState.usuarioActual = savedUser;
        startHeartbeat(appState.usuarioActual);
        handleLoginSuccess(savedRole);
    }
});

console.log("JodiFy v2.0 loaded - Press ? for keyboard shortcuts");

// =========================================
// PROFILE SYSTEM
// =========================================
const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const closeProfileBtn = document.getElementById("closeProfileBtn");

async function openProfileModal() {
    if (profileModal) {
        profileModal.classList.add('open');
        
        // First load user data from Supabase to get saved discord_id
        if (navigator.onLine && appState.usuarioActual && !appState.discord) {
            try {
                const { data, error } = await supabaseClient
                    .from('users_access')
                    .select('discord_id, discord_username, total_likes, total_played, total_downloads')
                    .eq('username', appState.usuarioActual)
                    .single();
                
                if (!error && data && data.discord_id) {
                    // User has a discord_id saved, fetch their real Discord profile
                    try {
                        const discordUser = await fetchDiscordUser(data.discord_id);
                        appState.discord = discordUser;
                        localStorage.setItem('discordProfile', JSON.stringify(discordUser));
                    } catch (e) {
                        console.warn('Could not fetch Discord profile:', e.message);
                    }
                }
            } catch (e) {
                console.warn('Error loading user data:', e);
            }
        }
        
        updateProfileUI();
        updateProfileStats();
    }
}

function closeProfileModal() {
    if (profileModal) {
        profileModal.classList.remove('open');
    }
}

function updateProfileUI() {
    const username = appState.usuarioActual || 'Usuario';
    const role = appState.currentUserRole || 'user';
    const initial = username.charAt(0).toUpperCase();
    
    // Update button
    const avatarInitial = document.getElementById('avatarInitial');
    const profileUsername = document.getElementById('profileUsername');
    if (avatarInitial) avatarInitial.textContent = initial;
    if (profileUsername) profileUsername.textContent = username;
    
    // Update modal
    const avatarInitialLarge = document.getElementById('avatarInitialLarge');
    const profileUsernameLarge = document.getElementById('profileUsernameLarge');
    const profileRoleText = document.getElementById('profileRoleText');
    const profileRole = document.getElementById('profileRole');
    
    if (avatarInitialLarge) avatarInitialLarge.textContent = initial;
    if (profileUsernameLarge) profileUsernameLarge.textContent = username;
    if (profileRoleText) {
        const roleNames = { admin: 'Administrador', dev: 'Developer', user: 'Usuario' };
        profileRoleText.textContent = roleNames[role] || 'Usuario';
    }
    if (profileRole) {
        profileRole.className = `profile-role ${role}`;
    }
    
    // Update avatar if Discord is linked
    if (appState.discord && appState.discord.avatar) {
        updateAvatarWithDiscord();
    }
    
    // Update Discord section
    updateDiscordUI();
}

function updateProfileStats() {
    const statLikes = document.getElementById('statLikes');
    const statPlayed = document.getElementById('statPlayed');
    const statDownloads = document.getElementById('statDownloads');
    
    if (statLikes) statLikes.textContent = appState.likedIds.length;
    if (statPlayed) statPlayed.textContent = appState.playCount;
    if (statDownloads) statDownloads.textContent = appState.downloadedIds.length;
    
    // Save stats to Supabase for real-time community display
    if (navigator.onLine && appState.usuarioActual) {
        supabaseClient
            .from('users_access')
            .update({ 
                total_likes: appState.likedIds.length,
                total_played: appState.playCount,
                total_downloads: appState.downloadedIds.length
            })
            .eq('username', appState.usuarioActual)
            .then(() => console.log('Stats updated in Supabase'))
            .catch(e => console.warn('Error updating stats:', e));
    }
}

function updateListeningActivity(song) {
    const activity = document.getElementById('listeningActivity');
    const activityTitle = document.getElementById('activityTitle');
    const activityCover = document.getElementById('activityCover');
    
    if (activity && song) {
        activity.style.display = 'block';
        if (activityTitle) activityTitle.textContent = formatDisplayName(song.name);
        if (activityCover && song.url) {
            loadMetadata(song.url, 'activityCover');
        }
        
        // Update current song in Supabase so others can see what we're listening to
        if (navigator.onLine && appState.usuarioActual) {
            const songName = formatDisplayName(song.name);
            (async () => {
                const { error } = await supabaseClient
                    .from('users_access')
                    .update({ 
                        current_song: songName,
                        current_song_time: new Date().toISOString()
                    })
                    .eq('username', appState.usuarioActual);
                if (error) {
                    console.warn('Error updating now playing:', error);
                } else {
                    console.log('Now playing updated:', songName);
                }
            })();
        }
    }
}

// Clear listening activity when audio stops
audio.addEventListener('pause', async () => {
    if (navigator.onLine && appState.usuarioActual) {
        const { error } = await supabaseClient
            .from('users_access')
            .update({ current_song: null })
            .eq('username', appState.usuarioActual);
        if (error) {
            console.warn('Error clearing now playing:', error);
        }
    }
});

audio.addEventListener('ended', () => {
    // current_song will be updated when next song plays
});

// Ensure profile button event listener is attached after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const profileBtnElement = document.getElementById("profileBtn");
    const closeProfileBtnElement = document.getElementById("closeProfileBtn");
    
    if (profileBtnElement) {
        profileBtnElement.addEventListener('click', openProfileModal);
        console.log('Profile button event listener attached');
    }
    if (closeProfileBtnElement) {
        closeProfileBtnElement.addEventListener('click', closeProfileModal);
    }
});

// Fallback for already loaded DOM
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (profileBtn) profileBtn.onclick = openProfileModal;
    if (closeProfileBtn) closeProfileBtn.onclick = closeProfileModal;
}

// =========================================
// DISCORD INTEGRATION
// =========================================
const DISCORD_CLIENT_ID = '1234567890'; // Replace with actual Discord app ID

function updateDiscordUI() {
    const notLinked = document.getElementById('discordNotLinked');
    const linked = document.getElementById('discordLinked');
    
    if (appState.discord) {
        if (notLinked) notLinked.style.display = 'none';
        if (linked) linked.style.display = 'flex';
        
        const discordAvatar = document.getElementById('discordAvatar');
        const discordName = document.getElementById('discordName');
        const discordTag = document.getElementById('discordTag');
        
        if (discordAvatar && appState.discord.avatar) {
            discordAvatar.src = appState.discord.avatar;
        }
        if (discordName) discordName.textContent = appState.discord.username || 'Usuario';
        if (discordTag) discordTag.textContent = appState.discord.discriminator ? `#${appState.discord.discriminator}` : '';
    } else {
        if (notLinked) notLinked.style.display = 'block';
        if (linked) linked.style.display = 'none';
    }
}

function updateAvatarWithDiscord() {
    if (!appState.discord || !appState.discord.avatar) return;
    
    // Update profile button avatar
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
        profileAvatar.innerHTML = `<img src="${appState.discord.avatar}" alt="">`;
    }
    
    // Update large avatar in modal
    const profileAvatarLarge = document.getElementById('profileAvatarLarge');
    if (profileAvatarLarge) {
        const onlineIndicator = profileAvatarLarge.querySelector('.online-indicator');
        profileAvatarLarge.innerHTML = `<img src="${appState.discord.avatar}" alt="">`;
        if (onlineIndicator) profileAvatarLarge.appendChild(onlineIndicator);
    }
}

// =========================================
// DISCORD MODAL & LINKING
// =========================================
const discordLinkModal = document.getElementById('discordLinkModal');
const discordUserIdInput = document.getElementById('discordUserIdInput');

window.openDiscordModal = () => {
    if (discordLinkModal) {
        discordLinkModal.classList.add('open');
        if (discordUserIdInput) {
            discordUserIdInput.value = '';
            discordUserIdInput.focus();
        }
        document.getElementById('discordPreview').style.display = 'none';
        document.getElementById('discordLinkError').textContent = '';
    }
};

window.closeDiscordModal = () => {
    if (discordLinkModal) {
        discordLinkModal.classList.remove('open');
    }
};

// Fetch Discord user by ID using Lanyard API (REAL DATA)
async function fetchDiscordUser(userId) {
    try {
        // Use Lanyard API to get real Discord user data
        const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('Usuario no encontrado en Lanyard. Asegúrate de estar en el servidor de Lanyard Discord.');
        }
        
        const discordUser = data.data.discord_user;
        const discordStatus = data.data.discord_status;
        
        // Build avatar URL
        let avatarUrl;
        if (discordUser.avatar) {
            const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
            avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${discordUser.avatar}.${ext}?size=256`;
        } else {
            // Default avatar based on discriminator or user id
            const defaultNum = discordUser.discriminator === '0' 
                ? (BigInt(userId) >> 22n) % 6n 
                : parseInt(discordUser.discriminator) % 5;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
        }
        
        return {
            id: userId,
            username: discordUser.global_name || discordUser.username,
            discriminator: discordUser.discriminator,
            avatar: avatarUrl,
            status: discordStatus,
            activities: data.data.activities || []
        };
    } catch (error) {
        console.error('Error fetching Discord user:', error);
        throw new Error('No se pudo obtener el perfil de Discord. Asegúrate de que el usuario esté en el servidor de Lanyard (discord.gg/lanyard).');
    }
}

// Preview Discord user when typing
if (discordUserIdInput) {
    let debounceTimer;
    discordUserIdInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const userId = e.target.value.trim();
        const preview = document.getElementById('discordPreview');
        const error = document.getElementById('discordLinkError');
        
        if (userId.length < 17) {
            preview.style.display = 'none';
            error.textContent = userId.length > 0 ? 'El User ID debe tener al menos 17 dígitos' : '';
            return;
        }
        
        if (!/^\d+$/.test(userId)) {
            preview.style.display = 'none';
            error.textContent = 'El User ID solo debe contener números';
            return;
        }
        
        error.textContent = '';
        
        debounceTimer = setTimeout(async () => {
            try {
                const user = await fetchDiscordUser(userId);
                preview.style.display = 'flex';
                document.getElementById('discordPreviewAvatar').src = user.avatar;
                document.getElementById('discordPreviewName').textContent = user.username;
                document.getElementById('discordPreviewId').textContent = `#${user.discriminator}`;
            } catch (e) {
                preview.style.display = 'none';
                error.textContent = 'No se pudo obtener información del usuario';
            }
        }, 500);
    });
}

window.confirmLinkDiscord = async () => {
    const userId = discordUserIdInput?.value.trim();
    const error = document.getElementById('discordLinkError');
    const btn = document.getElementById('btnConfirmDiscord');
    
    if (!userId || userId.length < 17) {
        error.textContent = 'Ingresa un User ID válido';
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = `${ICONS.LOADING} Vinculando...`;
    
    try {
        const user = await fetchDiscordUser(userId);
        
        appState.discord = user;
        localStorage.setItem('discordProfile', JSON.stringify(user));
        
        // Update user in Supabase if online
        if (navigator.onLine) {
            await supabaseClient
                .from('users_access')
                .update({ discord_id: userId, discord_username: user.username })
                .eq('username', appState.usuarioActual);
        }
        
        updateDiscordUI();
        updateAvatarWithDiscord();
        closeDiscordModal();
        notificationSound.play().catch(() => {});
        
    } catch (e) {
        error.textContent = 'Error al vincular: ' + e.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.36-.698.772-1.362 1.225-1.993a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.098.246-.198.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> Vincular`;
    }
};

window.linkDiscord = async () => {
    openDiscordModal();
};

window.unlinkDiscord = () => {
    if (!confirm('¿Desvincular tu cuenta de Discord?')) return;
    
    appState.discord = null;
    localStorage.removeItem('discordProfile');
    
    // Reset avatars
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
        profileAvatar.innerHTML = `<span id="avatarInitial">${appState.usuarioActual.charAt(0).toUpperCase()}</span>`;
    }
    
    const profileAvatarLarge = document.getElementById('profileAvatarLarge');
    if (profileAvatarLarge) {
        profileAvatarLarge.innerHTML = `
            <span id="avatarInitialLarge">${appState.usuarioActual.charAt(0).toUpperCase()}</span>
            <span class="online-indicator"></span>
        `;
    }
    
    // Update Supabase
    if (navigator.onLine) {
        supabaseClient
            .from('users_access')
            .update({ discord_id: null, discord_username: null })
            .eq('username', appState.usuarioActual);
    }
    
    updateDiscordUI();
};

// =========================================
// COMMUNITY SYSTEM
// =========================================
const communityModal = document.getElementById('communityModal');
const userDetailModal = document.getElementById('userDetailModal');
let communityTab = 'online';
let communityUsers = [];

window.openCommunityModal = async () => {
    if (communityModal) {
        communityModal.classList.add('open');
        await loadCommunityUsers();
    }
};

window.closeCommunityModal = () => {
    if (communityModal) {
        communityModal.classList.remove('open');
    }
};

window.switchCommunityTab = (tab) => {
    communityTab = tab;
    document.querySelectorAll('.community-tab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('onclick').includes(tab));
    });
    renderCommunityUsers();
};

async function loadCommunityUsers() {
    const list = document.getElementById('communityList');
    list.innerHTML = `<div class="community-loading"><div class="spinner-log"></div><p>Cargando usuarios...</p></div>`;
    
    try {
        // Fetch REAL data from Supabase
        if (navigator.onLine) {
            const { data, error } = await supabaseClient
                .from('users_access')
                .select('*')
                .order('is_online', { ascending: false });
            
            if (!error && data) {
                // Use REAL data from database
                communityUsers = data.map(u => ({
                    ...u,
                    likes: u.total_likes || 0,
                    played: u.total_played || 0,
                    downloads: u.total_downloads || 0,
                    currentSong: u.current_song ? { name: u.current_song, time: '' } : null
                }));
                
                // Also fetch Discord avatars for users with discord_id
                for (const user of communityUsers) {
                    if (user.discord_id) {
                        try {
                            const discordData = await fetchDiscordUserSilent(user.discord_id);
                            if (discordData) {
                                user.discord_avatar = discordData.avatar;
                                user.discord_username = discordData.username;
                            }
                        } catch (e) {
                            // Silently fail for individual users
                        }
                    }
                }
                
                renderCommunityUsers();
                return;
            }
        }
        
        // Fallback to local users for offline mode
        communityUsers = [
            { username: appState.usuarioActual || 'admin', role: appState.currentUserRole || 'user', is_online: 1, likes: appState.likedIds.length, played: appState.playCount, downloads: appState.downloadedIds.length, currentSong: null }
        ];
        renderCommunityUsers();
        
    } catch (e) {
        console.error('Error loading community:', e);
        list.innerHTML = `<div class="community-empty">Error al cargar usuarios</div>`;
    }
}

// Silent fetch for batch operations (doesn't throw errors)
async function fetchDiscordUserSilent(userId) {
    try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
        const data = await response.json();
        
        if (!data.success || !data.data) return null;
        
        const discordUser = data.data.discord_user;
        let avatarUrl;
        
        if (discordUser.avatar) {
            const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
            avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${discordUser.avatar}.${ext}?size=128`;
        } else {
            const defaultNum = discordUser.discriminator === '0' 
                ? (BigInt(userId) >> 22n) % 6n 
                : parseInt(discordUser.discriminator) % 5;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
        }
        
        return {
            id: userId,
            username: discordUser.global_name || discordUser.username,
            avatar: avatarUrl,
            status: data.data.discord_status
        };
    } catch (e) {
        return null;
    }
}

function renderCommunityUsers() {
    const list = document.getElementById('communityList');
    
    let filtered = communityUsers;
    if (communityTab === 'online') {
        filtered = communityUsers.filter(u => u.is_online === 1);
    }
    
    if (filtered.length === 0) {
        list.innerHTML = `<div class="community-empty">No hay usuarios ${communityTab === 'online' ? 'en línea' : ''}</div>`;
        return;
    }
    
    list.innerHTML = filtered.map(user => {
        const initial = user.username.charAt(0).toUpperCase();
        const isOnline = user.is_online === 1;
        const hasDiscord = user.discord_avatar || user.discord_username;
        const isListening = user.currentSong;
        
        // Use REAL Discord avatar if available
        const avatarUrl = user.discord_avatar 
            ? user.discord_avatar 
            : (hasDiscord ? `https://cdn.discordapp.com/embed/avatars/${user.username.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 5}.png` : null);
        
        return `
            <div class="community-user" onclick="openUserDetail('${user.username}')" data-testid="user-${user.username}">
                <div class="community-user-avatar">
                    ${avatarUrl ? `<img src="${avatarUrl}" alt="">` : initial}
                    <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
                </div>
                <div class="community-user-info">
                    <div class="community-user-name">
                        ${user.username}
                        ${user.role !== 'user' ? `<span class="role-badge ${user.role}">${user.role}</span>` : ''}
                    </div>
                    <div class="community-user-status ${isListening ? 'listening' : ''}">
                        ${isListening ? `
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                            ${isListening.name}
                        ` : (isOnline ? 'En línea' : 'Desconectado')}
                    </div>
                </div>
                <div class="community-user-stats">
                    <span title="Likes">❤️ ${user.likes || 0}</span>
                    <span title="Canciones escuchadas">🎵 ${user.played || 0}</span>
                </div>
            </div>
        `;
    }).join('');
}

window.openUserDetail = (username) => {
    const user = communityUsers.find(u => u.username === username);
    if (!user) return;
    
    if (userDetailModal) {
        userDetailModal.classList.add('open');
        
        // Update avatar - use REAL Discord avatar if available
        const avatar = document.getElementById('userDetailAvatar');
        const initial = username.charAt(0).toUpperCase();
        
        if (user.discord_avatar) {
            // Use real Discord avatar
            avatar.innerHTML = `<img src="${user.discord_avatar}" alt="">`;
        } else if (user.discord_username) {
            // Fallback to default avatar
            const avatarNum = username.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 5;
            avatar.innerHTML = `<img src="https://cdn.discordapp.com/embed/avatars/${avatarNum}.png" alt="">`;
        } else {
            avatar.innerHTML = `<span>${initial}</span>`;
        }
        
        // Update status
        const isOnline = user.is_online === 1;
        document.getElementById('userStatusBadge').innerHTML = `
            <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
            <span>${isOnline ? 'En línea' : 'Desconectado'}</span>
        `;
        
        // Update name and role
        document.getElementById('userDetailName').textContent = username;
        const roleNames = { admin: 'Administrador', dev: 'Developer', user: 'Usuario' };
        document.getElementById('userDetailRole').textContent = roleNames[user.role] || 'Usuario';
        document.getElementById('userDetailRole').className = `user-detail-role ${user.role}`;
        
        // Now playing - show REAL current song
        const nowPlaying = document.getElementById('userNowPlaying');
        if (user.currentSong || user.current_song) {
            nowPlaying.style.display = 'block';
            const songName = user.currentSong?.name || user.current_song;
            document.getElementById('userNowPlayingTitle').textContent = songName;
            document.getElementById('userNowPlayingTime').textContent = user.currentSong?.time || '';
        } else {
            nowPlaying.style.display = 'none';
        }
        
        // Discord
        const discordSection = document.getElementById('userDiscordSection');
        if (user.discord_username || user.discord_id) {
            discordSection.style.display = 'block';
            document.getElementById('userDiscordName').textContent = user.discord_username || 'Vinculado';
        } else {
            discordSection.style.display = 'none';
        }
        
        // Stats - use REAL data
        document.getElementById('userStatLikes').textContent = user.likes || user.total_likes || 0;
        document.getElementById('userStatPlayed').textContent = user.played || user.total_played || 0;
        document.getElementById('userStatDownloads').textContent = user.downloads || user.total_downloads || 0;
        
        // Member since
        const date = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Ene 2025';
        document.getElementById('userMemberSince').textContent = date;
    }
};

window.closeUserDetailModal = () => {
    if (userDetailModal) {
        userDetailModal.classList.remove('open');
    }
};

// Update listening status periodically
async function updateListeningStatus() {
    if (!appState.usuarioActual || !navigator.onLine) return;
    
    const currentSong = appState.playlist[appState.currentIndex];
    const songName = currentSong ? formatDisplayName(currentSong.name) : null;
    const isPlaying = !audio.paused;
    
    try {
        await supabaseClient
            .from('users_access')
            .update({
                is_online: 1,
                current_song: isPlaying ? songName : null,
                last_seen: new Date().toISOString()
            })
            .eq('username', appState.usuarioActual);
    } catch (e) {
        console.warn('Failed to update listening status:', e);
    }
}

// Update status every 30 seconds
setInterval(updateListeningStatus, 30000);

window.exportStats = () => {
    const stats = {
        username: appState.usuarioActual,
        role: appState.currentUserRole,
        likes: appState.likedIds.length,
        played: appState.playCount,
        downloads: appState.downloadedIds.length,
        likedSongs: appState.likedIds,
        discord: appState.discord ? appState.discord.username : null,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jodify-stats-${appState.usuarioActual}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

window.handleLogout = async () => {
    closeProfileModal();
    document.getElementById('logoutLoading').style.display = 'flex';
    
    try {
        if (appState.usuarioActual && navigator.onLine) {
            await supabaseClient
                .from('users_access')
                .update({ is_online: 0 })
                .eq('username', appState.usuarioActual);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));

        if (appState.heartbeatInterval) clearInterval(appState.heartbeatInterval);
        audio.pause();
        audio.src = "";

        localStorage.removeItem("jodify_session_active");
        localStorage.removeItem("jodify_user_role");
        localStorage.removeItem("currentUserName");

        appState.usuarioActual = "";
        appState.currentUserRole = null;
        appState.playlist = [];

        document.getElementById("loginScreen").style.display = "flex";
        const loginForm = document.getElementById("loginForm");
        if (loginForm) loginForm.reset();
        if (songList) songList.innerHTML = "";

        if (addSongContainer) addSongContainer.style.display = "none";
        if (btnOpenRegister) btnOpenRegister.style.display = "none";
    } catch (err) {
        console.error("Logout error:", err);
        location.reload();
    } finally {
        document.getElementById('logoutLoading').style.display = 'none';
    }
};

// Close profile modal on click outside
window.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        closeProfileModal();
    }
});

console.log("JodiFy v2.1 - Profile & Discord ready");
