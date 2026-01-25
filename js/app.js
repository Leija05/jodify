let isChangingTrack = false;

// Constantes agrupadas para iconos
const ICONS = {
    LOADING: `<svg class="spin" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" opacity="0.3"/><path d="M12 2c5.523 0 10 4.477 10 10" stroke="currentColor"/></svg>`,
    SUCCESS: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#2ecc71" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    ERROR: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e74c3c" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    WARNING: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e67e22" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>`,
    VOLUME: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
    SUN: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.07l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`,
    MOON: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    HEART_F: `<svg viewBox="0 0 24 24" width="22" height="22" fill="#ff4b2b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    HEART_E: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    DOWNLOAD: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    EYE: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    EYE_OFF: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
};

const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
notificationSound.volume = 0.25;

// Estado global agrupado
const appState = {
    offlineMode: false,
    db: null,
    currentUserRole: null,
    playlist: [],
    likedIds: JSON.parse(localStorage.getItem("likedSongs")) || [],
    downloadedIds: [],
    currentTab: "global",
    currentIndex: -1,
    lyrics: [],
    currentLine: -1,
    audioCtx: null,
    analyser: null,
    source: null,
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
    userFilter: "all"
};

window.onload = async () => {
    const savedVolume = parseFloat(localStorage.getItem("userVolume")) || 0.5;
    setAppVolume(savedVolume);
    const savedTheme = localStorage.getItem("theme") || "dark";
    applyTheme(savedTheme);
    const disableVis = localStorage.getItem('disableVisualizer') === 'true';
    const disableBg = localStorage.getItem('disableDynamicBg') === 'true';
    document.body.classList.toggle('no-visual', disableVis);
    document.body.classList.toggle('no-dynamic-bg', disableBg);
    const disableVisualizer = document.getElementById("disableVisualizer");
    const disableDynamicBg = document.getElementById("disableDynamicBg");
    if (disableVisualizer) disableVisualizer.checked = disableVis;
    if (disableDynamicBg) disableDynamicBg.checked = disableBg;
    checkSavedSession();
    if (appState.usuarioActual) {
        startHeartbeat(appState.usuarioActual);
        initApp();
    } else {
        document.getElementById("loginScreen").style.display = "flex";
    }
    console.log(`Configuración cargada: Volumen al ${Math.round(savedVolume * 100)}%`);
};

/* =========================
   ESTADO GLOBAL Y BASE DE DATOS
========================= */
const dbRequest = indexedDB.open("MusicOfflineDB", 1);
dbRequest.onupgradeneeded = (e) => {
    appState.db = e.target.result;
    if (!appState.db.objectStoreNames.contains("songs")) {
        appState.db.createObjectStore("songs", { keyPath: "id" });
    }
};
dbRequest.onsuccess = (e) => {
    appState.db = e.target.result;
};

function setAppVolume(value) {
    const vol = parseFloat(value);
    const audio = document.getElementById("audio");
    audio.volume = vol;
    const volume = document.getElementById("volume");
    volume.value = vol;
    localStorage.setItem("userVolume", vol);
    const volumeIcon = document.getElementById("volumeIcon");
    if (volumeIcon) volumeIcon.style.opacity = vol === 0 ? "0.5" : "1";
}

const btnOpenRegister = document.getElementById("btnOpenRegister");
const registerModal = document.getElementById("registerModal");
const closeRegisterBtn = document.getElementById("closeRegisterBtn");

/* =========================
   ELEMENTOS DEL DOM
========================= */
const audio = document.getElementById("audio");
audio.addEventListener('play', () => {
    if (window.electronAPI && window.electronAPI.updateThumbar) {
        window.electronAPI.updateThumbar(true); // Indica a Electron que ponga el icono de PAUSA
    }
});

// Escuchar cuando el audio se detiene o pausa
audio.addEventListener('pause', () => {
    if (window.electronAPI && window.electronAPI.updateThumbar) {
        window.electronAPI.updateThumbar(false); // Indica a Electron que ponga el icono de PLAY
    }
});
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
const playlistEl = document.querySelector('.playlist');
const btnOpenPlaylist = document.getElementById('btnOpenPlaylist');

function cleanupBeforeExit() {
    try {
        if (appState.heartbeatInterval) {
            clearInterval(appState.heartbeatInterval);
        }

        if (appState.audioCtx) {
            appState.audioCtx.close();
            appState.audioCtx = null;
        }

        if (audio) {
            audio.pause();
            audio.src = "";
        }

        // Fire-and-forget (NO await)
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
    window.electronAPI.onAppClose(() => {
        cleanupBeforeExit();
    });
}

document.getElementById("volumeIcon").innerHTML = ICONS.VOLUME;

/* =========================
   SISTEMA DE LOGIN
========================= */
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

window.switchDevPanel = (panelId) => {
    document.querySelectorAll('.dev-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dev-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');
    event.currentTarget.classList.add('active');
};

window.loadUsersList = async () => {
    const tbody = document.getElementById("usersListBody");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center">${ICONS.LOADING}</td></tr>`;

    const { data, error } = await supabaseClient
        .from('users_access')
        .select('id, username, role, is_online')
        .order('is_online', { ascending: false }); // Ponemos los conectados arriba

    if (error) {
        tbody.innerHTML = "<tr><td colspan='4'>Error al cargar datos</td></tr>";
        return;
    }

    tbody.innerHTML = "";
    data.forEach(user => {
        const tr = document.createElement("tr");
        
        // Determinamos el estado visual
        const statusClass = user.is_online === 1 ? "status-online" : "status-offline";
        const statusText = user.is_online === 1 ? "En línea" : "Desconectado";

        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="status-dot ${statusClass}" title="${statusText}"></span>
                    ${user.username}
                </div>
            </td>
            <td><small style="opacity: 0.7">${statusText}</small></td>
            <td><small class="badge-${user.role}">${user.role}</small></td>
            <td>
                <button class="btn-delete-small" onclick="deleteUserRecord(${user.id}, '${user.role}', '${user.username}')">Borrar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

/* =========================
   PERSISTENCIA DE SESIÓN
========================= */
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
        if (btnOpenRegister) btnOpenRegister.style.display = "flex";
        if (fileInput) fileInput.disabled = false;
    } else {
        if (addSongContainer) addSongContainer.style.display = "none";
        if (btnOpenRegister) btnOpenRegister.style.display = "none";
        if (fileInput) fileInput.disabled = true;
    }
}

/* =========================
   SISTEMA DE PRESENCIA (ONLINE)
========================= */
async function startHeartbeat(username) {
    if (appState.heartbeatInterval) clearInterval(appState.heartbeatInterval);

    const sendPulse = async () => {
        if (!navigator.onLine) return;
        await supabaseClient
            .from('users_access')
            .update({
                last_seen: new Date().toISOString(),
                is_online: 1
            })
            .eq('username', username);
    };

    sendPulse();
    appState.heartbeatInterval = setInterval(sendPulse, 30000);
}

window.addEventListener('online', () => {
    console.log("Conexión restaurada");
    appState.offlineMode = false;
    if (btnGlobal) btnGlobal.style.display = "block";
    fetchSongs();
});

window.addEventListener('offline', () => {
    console.log("Modo offline detectado");
    enableOfflineMode();
});

/* =========================
   SISTEMA DE LOGS
========================= */
async function addSystemLog(type, message) {
    const adminName = document.getElementById("username")?.value || "System";

    const { error } = await supabaseClient
        .from('system_logs')
        .insert([{
            event_type: type,
            message: message,
            admin_user: adminName
        }]);

    if (error) console.error("Error guardando log:", error);
}

window.fetchLogs = async () => {
    const logsBody = document.getElementById("logsBody");
    if (!logsBody) return;

    logsBody.innerHTML = `
        <div class="log-line info">
            <span class="log-prefix">❯</span>
            <span class="log-msg">Conectando con la base de datos...</span>
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
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const div = document.createElement("div");
        const typeLower = log.event_type.toLowerCase();
        div.className = `log-line ${typeLower}`;

        div.innerHTML = `
            <span class="log-prefix">❯</span>
            <span class="log-time">${date}</span>
            <span class="log-badge">${typeLower.toUpperCase()}</span>
            <span class="log-msg">
                <strong style="color: var(--accent); opacity: 0.8;">@${log.admin_user || 'system'}:</strong> 
                ${log.message}
            </span>
        `;
        logsBody.appendChild(div);
    });

    logsBody.scrollTop = 0;
};

window.clearLogs = () => {
    const logsBody = document.getElementById("logsBody");
    logsBody.style.opacity = "0";
    setTimeout(() => {
        logsBody.innerHTML = `<div class="log-line info"><span class="log-prefix">❯</span> Consola despejada.</div>`;
        logsBody.style.opacity = "1";
    }, 200);
};

window.deleteUserRecord = async (id, role, name) => {
    if (role.toLowerCase() === 'dev' || name === 'TU_USUARIO_PRINCIPAL') {
        alert("Acceso denegado: Este usuario es vital para el sistema.");
        return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar a "${name}"?`)) return;

    try {
        const { error } = await supabaseClient
            .from('users_access')
            .delete()
            .eq('id', id);

        if (error) throw error;
        addSystemLog('warn', `Eliminó al usuario: ${name}`);
        window.loadUsersList();
    } catch (err) {
        console.error("Error al eliminar:", err.message);
        alert("No se pudo eliminar el usuario: " + err.message);
    }
};

const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

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
            const { data, error } = await supabaseClient
                .from('users_access')
                .select('*')
                .eq('username', userIn)
                .eq('password', passIn)
                .single();

            if (error || !data) throw new Error("Usuario o contraseña incorrectos");

            localStorage.setItem("currentUserName", data.username);

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

const logoutModal = document.getElementById("logoutModal");
const confirmLogoutBtn = document.getElementById("confirmLogout");
const cancelLogoutBtn = document.getElementById("cancelLogout");

if (btnLogout) {
    btnLogout.onclick = () => {
        logoutModal.style.display = "flex";
    };
}
cancelLogoutBtn.onclick = () => {
    logoutModal.style.display = "none";
};

confirmLogoutBtn.onclick = async () => {
    logoutModal.style.display = "none";
    logoutLoading.style.display = "flex";

    try {
        if (appState.usuarioActual && navigator.onLine) {
            await supabaseClient
                .from('users_access')
                .update({ is_online: 0 })
                .eq('username', appState.usuarioActual);

            await addSystemLog('info', `Cerró sesión.`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 800));

        if (appState.heartbeatInterval) clearInterval(appState.heartbeatInterval);
        audio.pause();
        audio.src = "";

        localStorage.removeItem("jodify_session_active");
        localStorage.removeItem("jodify_user_role");
        localStorage.removeItem("currentUserName");

        appState.usuarioActual = "";
        appState.currentUserRole = null;
        appState.playlist = [];

        // UI Reset
        document.getElementById("loginScreen").style.display = "flex";
        const loginForm = document.getElementById("loginForm");
        if (loginForm) loginForm.reset();
        if (songList) songList.innerHTML = "";

        if (addSongContainer) addSongContainer.style.display = "none";
        if (btnOpenRegister) btnOpenRegister.style.display = "none";

    } catch (err) {
        console.error("Error al cerrar sesión:", err);
        location.reload();
    } finally {
        logoutLoading.style.display = "none";
    }
};

const registerForm = document.getElementById("registerForm");

function handleLoginSuccess(role) {
    appState.currentUserRole = role;
    document.getElementById("loginScreen").style.display = "none";

    if (addSongContainer) addSongContainer.style.display = "none";
    if (btnOpenRegister) btnOpenRegister.style.display = "none";

    if (role === 'dev') {
        if (addSongContainer) addSongContainer.style.display = "flex";
        if (btnOpenRegister) btnOpenRegister.style.display = "flex";
        if (fileInput) fileInput.disabled = false;
        console.log("Acceso: DEVELOPER");
    } else if (role === 'admin') {
        if (addSongContainer) addSongContainer.style.display = "flex";
        if (fileInput) fileInput.disabled = false;
        console.log("Acceso: ADMINISTRADOR");
    } else {
        if (fileInput) fileInput.disabled = true;
        console.log("Acceso: USUARIO");
    }

    initApp();
}

if (btnOpenRegister) {
    btnOpenRegister.onclick = () => {
        registerModal.style.display = "block";
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
            msg.style.color = "#ff4b2b";
            msg.textContent = "Por favor, completa todos los campos.";
            return;
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Creando usuario...";
        msg.textContent = "";

        try {
            const { data, error } = await supabaseClient
                .from('users_access')
                .insert([{
                    username: userValue,
                    password: passValue,
                    role: roleValue
                }]);

            if (error) throw error;
            msg.style.color = "#2ecc71";
            msg.innerHTML = `${ICONS.SUCCESS} ¡Usuario creado con éxito!`;
            registerForm.reset();

            setTimeout(() => {
                registerModal.style.display = "none";
                msg.textContent = "";
            }, 2000);
        } catch (err) {
            msg.style.color = "#ff4b2b";
            msg.textContent = "Error: " + (err.message === "Duplicate key" ? "El usuario ya existe" : err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    };
}

async function initApp() {
    await syncDownloadedSongs();

    window.electronAPI.onControlCommand((command) => {
        console.log("Control del sistema:", command);

        switch (command) {
            case 'play':
                togglePlayFromSystem();
                break;
            case 'next':
                nextFromSystem();
                break;
            case 'prev':
                prevFromSystem();
                break;
        }
    });

    if (!navigator.onLine) {
        enableOfflineMode();
    } else {
        fetchSongs();
    }
}
function togglePlayFromSystem() {
    if (audio.paused) {
        audio.play();
        updatePlayIcon(true);
    } else {
        audio.pause();
        updatePlayIcon(false);
    }
}

function nextFromSystem() {
    if (isChangingTrack) return;
    isChangingTrack = true;

    handleNextSong();

    setTimeout(() => {
        isChangingTrack = false;
    }, 300);
}

function prevFromSystem() {
    if (isChangingTrack) return;
    isChangingTrack = true;

    const currentId = appState.playlist[appState.currentIndex]?.id;
    const idx = appState.currentFilteredList.findIndex(s => s.id === currentId);
    const prevIdx =
        (idx - 1 + appState.currentFilteredList.length) %
        appState.currentFilteredList.length;

    const masterIdx = appState.playlist.findIndex(
        s => s.id === appState.currentFilteredList[prevIdx].id
    );

    playSong(masterIdx);

    setTimeout(() => {
        isChangingTrack = false;
    }, 300);
}

async function syncDownloadedSongs() {
    return new Promise((resolve) => {
        if (!appState.db) return resolve();
        const transaction = appState.db.transaction(["songs"], "readonly");
        const store = transaction.objectStore("songs");
        const request = store.getAllKeys();
        request.onsuccess = () => {
            appState.downloadedIds = request.result;
            resolve();
        };
        request.onerror = () => resolve();
    });
}

function enableOfflineMode() {
    appState.offlineMode = true;
    appState.currentTab = "personal";
    if (btnGlobal) btnGlobal.style.display = "none";
    renderPlaylist();
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    if (themeToggle) themeToggle.innerHTML = theme === "dark" ? ICONS.MOON : ICONS.SUN;
}
applyTheme(localStorage.getItem("theme") || "dark");
themeToggle.onclick = () => applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");

/* =========================
   UTILIDADES
========================= */
function sanitizeFileName(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, "_").replace(/\.{2,}/g, ".").replace(/_{2,}/g, "_");
}

function formatDisplayName(name) {
    return name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
}

async function getGradientColors(imgElement) {
    return new Promise((resolve) => {
        const analyze = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 10; canvas.height = 10;
            ctx.drawImage(imgElement, 0, 0, 10, 10);
            const data = ctx.getImageData(0, 0, 10, 10).data;
            const colors = [];
            for (let i = 0; i < data.length; i += 120) colors.push(`rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`);
            resolve(`linear-gradient(90deg, ${colors[0]}, ${colors[1] || colors[0]}, ${colors[2] || colors[0]})`);
        };
        if (imgElement.complete) analyze(); else imgElement.onload = analyze;
    });
}

/* =========================
   LÓGICA DE SUBIDA (SOLO ADMIN)
========================= */
function toggleModal(show) {
    uploadModal.style.display = show ? "block" : "none";
}

if (uploadBadge) {
    uploadBadge.onclick = () => {
        if (appState.currentUserRole === 'admin' || appState.currentUserRole === 'dev') toggleModal(true);
    };
}

fileInput.onchange = async (e) => {
    if (appState.currentUserRole !== 'admin' && appState.currentUserRole !== 'dev') return;

    const files = Array.from(e.target.files);
    if (files.length === 0) return;

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
            addSystemLog('error', `Intento de subida fallido: El archivo "${file.name}" no es audio.`);
            continue;
        }

        await processAndUpload(file, scrollContainer, (status) => {
            if (status === 'success') {
                stats.success++;
                addSystemLog('info', `Subió una nueva canción: "${formatDisplayName(file.name)}"`);
            } else {
                stats.error++;
                addSystemLog('error', `Error al procesar la subida de: "${file.name}"`);
            }

            document.getElementById("successCount").textContent = stats.success;
            document.getElementById("errorCount").textContent = stats.error;

            if (badgeText) {
                badgeText.innerHTML = `<span class="spin-mini">${ICONS.LOADING}</span> Subiendo: ${stats.success + stats.error} / ${stats.total}`;
            }
        });

        scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }

    document.getElementById("modalTitle").innerHTML = `${ICONS.SUCCESS} Subida finalizada`;
    if (badgeText) badgeText.innerHTML = `${ICONS.SUCCESS} Subida completada`;

    appState.isUploading = false;
    if (stats.success > 0) {
        notificationSound.play().catch(() => { });
        fetchSongs();
    }

    setTimeout(() => {
        if (!appState.isUploading && uploadBadge) uploadBadge.style.display = "none";
    }, 5000);
};

async function processAndUpload(file, container, updateStats) {
    const sanitizedName = sanitizeFileName(file.name);
    const itemId = `up-${Math.random().toString(36).substr(2, 9)}`;
    const controller = new AbortController();
    appState.activeUploads[itemId] = controller;

    const itemDiv = document.createElement("div");
    itemDiv.className = "upload-item";
    itemDiv.id = `item-${itemId}`;
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
                } else bar.style.background = "var(--accent)";
                res();
            },
            onError: () => { bar.style.background = "var(--accent)"; res(); }
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
        const currentUserName = localStorage.getItem("currentUserName") || "Anónimo";

        const { error: insErr } = await supabaseClient.from('songs').insert([{
            name: sanitizedName,
            url: urlData.publicUrl,
            likes: 0,
            added_by: currentUserName
        }]);

        if (insErr) throw insErr;

        bar.style.width = "100%";
        bar.style.background = "#2ecc71";
        txt.textContent = "¡Completado!";
        icon.innerHTML = ICONS.SUCCESS;
        updateStats('success');
    } catch (e) {
        if (e.name === 'AbortError') {
            txt.textContent = "Cancelado";
            bar.style.background = "#95a5a6";
            icon.innerHTML = "";
        } else if (e.message === "EXISTE") {
            txt.textContent = "Ya existe";
            bar.style.background = "#e67e22";
            icon.innerHTML = ICONS.WARNING;
        } else {
            txt.textContent = "Error";
            bar.style.background = "#e74c3c";
            icon.innerHTML = ICONS.ERROR;
            addSystemLog('error', `Falló subida de "${file.name}": ${e.message}`);
        }
        updateStats('error');
    } finally {
        delete appState.activeUploads[itemId];
    }
}

window.cancelUpload = (id) => { if (appState.activeUploads[id]) appState.activeUploads[id].abort(); };

/* =========================
   PLAYLIST Y DATOS
========================= */
async function fetchSongs() {
    const { data, error } = await supabaseClient.from('songs').select('*').order('id', { ascending: false });
    if (error) {
        enableOfflineMode();
    } else {
        appState.playlist = data;
        appState.availableUsers = [...new Set(data.map(s => s.added_by))];
        sortOptions.innerHTML = `
            <option value="recent">Recientes</option>
            <option value="old">Antiguos</option>
            <option value="popular">Más Populares</option>
            ${appState.availableUsers.map(u => `<option value="user-${u}">${u}</option>`).join('')}
        `;
        renderPlaylist();
    }
}

function getFilteredList() {
    let list = appState.offlineMode ? appState.playlist.filter(s => appState.downloadedIds.includes(s.id)) :
        (appState.currentTab === "global" ? [...appState.playlist] : appState.playlist.filter(s => appState.likedIds.includes(s.id)));
    return list.filter(s => formatDisplayName(s.name).toLowerCase().includes(appState.searchTerm));
}

function createSongElement(song, isCurrent, isDownloaded) {
    const li = document.createElement("li");
    const imgId = `img-list-${song.id}`;

    if (isCurrent) li.classList.add("active");

    li.innerHTML = `
        <div class="song-container">
            <img src="assets/default-cover.png" id="${imgId}" class="playlist-cover">
            <div class="song-info">
                <span class="song-name">${formatDisplayName(song.name)}</span>
                <div class="song-metadatos">
                    <span class="song-artist">${appState.offlineMode ? 'Local' : (song.likes || 0) + ' Likes'}</span>
                    <span class="separator">|</span>
                    <span class="added-by-tag">Subido por: <strong>${song.added_by || 'System'}</strong></span>
                </div>
            </div>
            <div class="song-actions">
                ${!appState.offlineMode ? `
                    <button class="like-btn ${appState.likedIds.includes(song.id) ? 'active' : ''}" onclick="toggleLike(event, ${song.id})">
                        ${appState.likedIds.includes(song.id) ? ICONS.HEART_F : ICONS.HEART_E}
                    </button>
                    ${isDownloaded ? `
                        <button class="download-btn downloaded" onclick="deleteDownload(event, ${song.id})" title="Eliminar local">
                            ${ICONS.SUCCESS}
                        </button>
                    ` : `
                        <button class="download-btn" onclick="downloadSong(event, ${song.id})">
                            ${ICONS.DOWNLOAD}
                        </button>
                    `}
                ` : ''}
            </div>
        </div>`;

    if (isDownloaded && song.blob) {
        extractCoverFromBlob(song.blob, imgId);
    } else {
        loadMetadata(song.url, imgId);
    }

    li.onclick = () => {
        if (appState.offlineMode) {
            const blobUrl = URL.createObjectURL(song.blob);
            playOfflineSong(song, blobUrl);
        } else {
            const masterIndex = appState.playlist.findIndex(s => s.id === song.id);
            playSong(masterIndex);
        }
    };
    return li;
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
}

async function deleteDownload(event, songId) {
    event.stopPropagation();
    if (!confirm("¿Eliminar esta canción de tus descargas locales?")) return;
    const transaction = appState.db.transaction(["songs"], "readwrite");
    const store = transaction.objectStore("songs");
    await store.delete(songId);
    await syncDownloadedSongs();
    renderPlaylist();
}

function extractCoverFromBlob(blob, imgElementId) {
    jsmediatags.read(blob, {
        onSuccess: (tag) => {
            const pic = tag.tags.picture;
            if (pic) {
                const base64String = pic.data.map(char => String.fromCharCode(char)).join("");
                const el = document.getElementById(imgElementId);
                if (el) el.src = `data:${pic.format};base64,${window.btoa(base64String)}`;
            }
        }
    });
}

async function downloadSong(event, songId) {
    event.stopPropagation();
    const song = appState.playlist.find(s => s.id === songId);
    if (!song) return;

    const btn = event.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<span class="spin">${ICONS.LOADING}</span>`;

    try {
        const response = await fetch(song.url);
        const blob = await response.blob();

        const transaction = appState.db.transaction(["songs"], "readwrite");
        const store = transaction.objectStore("songs");

        await new Promise((resolve, reject) => {
            const putReq = store.put({ ...song, blob: blob });
            putReq.onsuccess = resolve;
            putReq.onerror = reject;
        });
        addSystemLog('info', `Descargó la canción: "${formatDisplayName(song.name)}"`);

        notificationSound.play();
        await syncDownloadedSongs();
        renderPlaylist();
    } catch (err) {
        btn.innerHTML = originalHTML;
        addSystemLog('error', `Fallo al descargar "${song.name}": ${err.message}`);
        alert("Error al descargar.");
    }
}

/* =========================
   CONTROLES Y REPRODUCCIÓN
========================= */
function playOfflineSong(song, blobUrl) {
    if (appState.currentBlobUrl) URL.revokeObjectURL(appState.currentBlobUrl);
    appState.currentBlobUrl = blobUrl;
    audio.src = blobUrl;
    songTitle.textContent = formatDisplayName(song.name);
    appState.currentIndex = appState.playlist.findIndex(s => s.id === song.id);
    audio.play();
    updatePlayIcon(true);
    loadMetadata(blobUrl, "cover", true);
    renderPlaylist();
    updateLikeBtn();
}

function playSong(index) {
    if (index < 0 || index >= appState.playlist.length) return;
    appState.currentIndex = index;
    const song = appState.playlist[index];
    audio.src = song.url;
    audio.play().then(() => {
        startVisualizer();
        updatePlayIcon(true);
    });
    songTitle.textContent = formatDisplayName(song.name);
    loadMetadata(song.url, "cover", true);
    loadLRC(song.name);

    renderPlaylist();

    if (window.innerWidth <= 768) {
        setTimeout(() => toggleMobilePlaylist(false), 300);
    }
    updateLikeBtn();
}

function handleNextSong() {
    if (appState.currentFilteredList.length === 0) return;
    const currentId = appState.playlist[appState.currentIndex]?.id;
    const idx = appState.currentFilteredList.findIndex(s => s.id === currentId);
    let next;
    if (appState.isShuffle) {
        next = appState.currentFilteredList[Math.floor(Math.random() * appState.currentFilteredList.length)];
    } else {
        next = appState.currentFilteredList[(idx + 1) % appState.currentFilteredList.length];
    }
    const masterIdx = appState.playlist.findIndex(s => s.id === next.id);
    playSong(masterIdx);
}

audio.onended = () => { if (!appState.isLoop) handleNextSong(); };

function loadMetadata(url, elId, isMain = false) {
    jsmediatags.read(url, {
        onSuccess: (tag) => {
            const img = tag.tags.picture;
            if (img) {
                let b6 = "";
                for (let i = 0; i < img.data.length; i++) b6 += String.fromCharCode(img.data[i]);
                const dUrl = `data:${img.format};base64,${window.btoa(b6)}`;
                const el = document.getElementById(elId);
                if (el) el.src = dUrl;
                if (isMain) {
                    cover.src = dUrl;
                    dynamicBg.style.backgroundImage = `url(${dUrl})`;
                }
            }
        }
    });
}

async function loadLRC(name) {
    lyricsBox.innerHTML = "Buscando letra...";
    appState.lyrics = []; appState.currentLine = -1;
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
                    appState.lyrics.push({ time: time, element: p });
                }
            });
        } else { lyricsBox.innerHTML = "Letra no disponible"; }
    } catch { lyricsBox.innerHTML = "Error de conexión"; }
}

async function startVisualizer() {
    if (appState.audioCtx) return;
    try {
        appState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        appState.analyser = appState.audioCtx.createAnalyser();
        appState.source = appState.audioCtx.createMediaElementSource(audio);
        appState.source.connect(appState.analyser);
        appState.analyser.connect(appState.audioCtx.destination);
        appState.analyser.fftSize = 64;
        const bufferLength = appState.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        function draw() {
            requestAnimationFrame(draw);
            appState.analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                let h = (dataArray[i] / 255) * canvas.height;
                ctx.fillRect(x, canvas.height - h, 4, h);
                x += (canvas.width / bufferLength) * 2;
            }
        }
        draw();
    } catch (e) { console.error("Visualizer error", e); }
}

audio.ontimeupdate = () => {
    if (appState.isLoop && audio.duration > 0 && audio.currentTime > audio.duration - 0.5) {
        audio.currentTime = 0;
        audio.play();
        return;
    }
    progress.value = audio.currentTime;
    progress.max = audio.duration || 0;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);

    if (appState.lyrics.length > 0) {
        const line = appState.lyrics.findLast(l => audio.currentTime >= l.time);
        if (line && line.element !== appState.lyrics[appState.currentLine]?.element) {
            if (appState.currentLine !== -1 && appState.lyrics[appState.currentLine]) appState.lyrics[appState.currentLine].element.classList.remove("active");
            appState.currentLine = appState.lyrics.indexOf(line);
            line.element.classList.add("active");
            line.element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }
};

function formatTime(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function updatePlayIcon(play) {
    const playIconElement = document.getElementById("playIcon");
    if (playIconElement) {
        playIconElement.innerHTML = play
            ? `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`
            : `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const sessionActive = localStorage.getItem("jodify_session_active");
    const savedRole = localStorage.getItem("jodify_user_role");
    const savedUser = localStorage.getItem("currentUserName");

    if (sessionActive === "true" && savedUser) {
        appState.usuarioActual = savedUser;
        console.log("Sesión recuperada para:", appState.usuarioActual);
        startHeartbeat(appState.usuarioActual);
        handleLoginSuccess(savedRole);
    }
});

/* =========================
   EVENTOS
========================= */
playBtn.onclick = () => audio.paused ? (audio.play(), updatePlayIcon(true)) : (audio.pause(), updatePlayIcon(false));
nextBtn.onclick = () => handleNextSong();
prevBtn.onclick = () => {
    const currentId = appState.playlist[appState.currentIndex]?.id;
    const idx = appState.currentFilteredList.findIndex(s => s.id === currentId);
    const prevIdx = (idx - 1 + appState.currentFilteredList.length) % appState.currentFilteredList.length;
    const masterIdx = appState.playlist.findIndex(s => s.id === appState.currentFilteredList[prevIdx].id);
    playSong(masterIdx);
};

progress.oninput = () => audio.currentTime = progress.value;
volume.oninput = (e) => {
    setAppVolume(e.target.value);
};

btnGlobal.onclick = () => { appState.currentTab = "global"; btnGlobal.classList.add("active"); btnPersonal.classList.remove("active"); renderPlaylist(); };
btnPersonal.onclick = () => { appState.currentTab = "personal"; btnPersonal.classList.add("active"); btnGlobal.classList.remove("active"); renderPlaylist(); };

searchInput.oninput = (e) => { appState.searchTerm = e.target.value.toLowerCase(); renderPlaylist(); };

shuffleBtn.onclick = () => { appState.isShuffle = !appState.isShuffle; shuffleBtn.classList.toggle("active", appState.isShuffle); };
loopBtn.onclick = () => { appState.isLoop = !appState.isLoop; loopBtn.classList.toggle("active", appState.isLoop); };

function updateLikeBtn() {
    const likeBtn = document.getElementById("likeBtn");
    if (likeBtn && appState.currentIndex >= 0 && appState.playlist[appState.currentIndex]) {
        const isLiked = appState.likedIds.includes(appState.playlist[appState.currentIndex].id);
        likeBtn.innerHTML = isLiked ? ICONS.HEART_F : ICONS.HEART_E;
        likeBtn.classList.toggle('liked', isLiked);
    }
}

async function toggleLike(e, id) {
    if (e) e.stopPropagation();
    const song = appState.playlist.find(s => s.id === id);
    const wasLiked = appState.likedIds.includes(id);
    if (wasLiked) {
        appState.likedIds = appState.likedIds.filter(likedId => likedId !== id);
        song.likes--;
    } else {
        appState.likedIds.push(id);
        song.likes++;
    }
    localStorage.setItem("likedSongs", JSON.stringify(appState.likedIds));
    renderPlaylist();
    updateLikeBtn();
    if (!wasLiked && appState.likedIds.includes(id)) {
        const likeBtn = document.getElementById("likeBtn");
        likeBtn.classList.add('animate-like');
        setTimeout(() => likeBtn.classList.remove('animate-like'), 500);
    }
    await supabaseClient.from('songs').update({ likes: song.likes }).eq('id', id);
}

/* =========================
   MOBILE
========================= */
const overlay = document.createElement('div');
overlay.className = 'playlist-overlay';
document.body.appendChild(overlay);

function toggleMobilePlaylist(show) {
    playlistEl.classList.toggle('show', show);
    overlay.classList.toggle('active', show);
    document.body.style.overflow = show ? 'hidden' : '';
}

if (btnOpenPlaylist) btnOpenPlaylist.onclick = () => toggleMobilePlaylist(true);
overlay.onclick = () => toggleMobilePlaylist(false);
window.filterLogs = () => {
    const term = document.getElementById("logSearchInput").value.toLowerCase();
    const lines = document.querySelectorAll(".log-line");

    lines.forEach(line => {
        const text = line.textContent.toLowerCase();
        if (text.includes(term)) {
            line.style.display = "flex";
            line.style.animation = "fadeIn 0.2s ease";
        } else {
            line.style.display = "none";
        }
    });
};
window.onclick = (e) => { if (e.target === uploadModal) toggleModal(false); };

/* =========================
   CONFIGURACIONES
========================= */
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsModal = document.getElementById("closeSettingsModal");
const disableVisualizer = document.getElementById("disableVisualizer");
const disableDynamicBg = document.getElementById("disableDynamicBg");

if (settingsBtn) {
    settingsBtn.onclick = () => {
        if (settingsModal) settingsModal.style.display = 'flex';
    };
}

if (closeSettingsModal) {
    closeSettingsModal.onclick = () => {
        if (settingsModal) settingsModal.style.display = 'none';
    };
}

function saveSettings() {
    const disableVis = disableVisualizer.checked;
    const disableBg = disableDynamicBg.checked;
    localStorage.setItem('disableVisualizer', disableVis);
    localStorage.setItem('disableDynamicBg', disableBg);
    document.body.classList.toggle('no-visual', disableVis);
    document.body.classList.toggle('no-dynamic-bg', disableBg);
    if (settingsModal) settingsModal.style.display = 'none';
}

const likeBtn = document.getElementById("likeBtn");
if (likeBtn) {
    likeBtn.onclick = () => {
        if (appState.currentIndex >= 0) toggleLike(null, appState.playlist[appState.currentIndex].id);
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
