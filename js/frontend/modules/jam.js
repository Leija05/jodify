export function initJam({
    appState,
    supabaseClient,
    audio,
    playSong,
    playOfflineSongById
}) {
    const jamBtn = document.getElementById("jamBtn");
    const jamModal = document.getElementById("jamModal");
    const closeJam = document.getElementById("closeJam");
    const jamStatus = document.getElementById("jamStatus");
    const jamCode = document.getElementById("jamCode");
    const jamToggle = document.getElementById("jamToggle");
    const jamCopy = document.getElementById("jamCopy");
    const jamJoinInput = document.getElementById("jamJoinInput");
    const jamJoinBtn = document.getElementById("jamJoinBtn");
    const jamUsersList = document.getElementById("jamUsersList");
    const jamPermissions = document.getElementById("jamPermissions");
    const jamAllowQueueAdd = document.getElementById("jamAllowQueueAdd");
    const jamAllowQueueRemove = document.getElementById("jamAllowQueueRemove");
    const jamRecommendCurrent = document.getElementById("jamRecommendCurrent");

    function generateJamCode() {
        return Math.random().toString(36).slice(2, 6).toUpperCase();
    }

    function renderJamUsers() {
        if (!jamUsersList) return;
        if (!appState.jamActive) {
            jamUsersList.innerHTML = `<li>Sin usuarios en la Jam</li>`;
            return;
        }
        if (!appState.jamUsers.length) {
            jamUsersList.innerHTML = `<li>Conectando...</li>`;
            return;
        }
        jamUsersList.innerHTML = appState.jamUsers
            .map(user => `
                <li>
                    <span>${user.username}</span>
                    ${user.isHost ? '<span class="jam-host">Host</span>' : ''}
                </li>
            `)
            .join('');
    }

    function updateJamUI() {
        if (!jamStatus || !jamCode || !jamToggle) return;
        jamCode.textContent = appState.jamCode || '----';
        jamStatus.textContent = appState.jamActive
            ? 'Jam activa. Comparte el código para sumar gente.'
            : 'Crea una Jam para compartir la cola con tus amigos.';
        if (jamPermissions) {
            jamPermissions.style.display = appState.jamActive && appState.jamHost ? 'flex' : 'none';
        }
        if (jamAllowQueueAdd) jamAllowQueueAdd.checked = appState.jamPermissions?.allowQueueAdd !== false;
        if (jamAllowQueueRemove) jamAllowQueueRemove.checked = appState.jamPermissions?.allowQueueRemove !== false;
        if (!appState.jamActive) {
            jamToggle.textContent = 'Iniciar Jam';
        } else if (appState.jamHost) {
            jamToggle.textContent = 'Finalizar Jam';
        } else {
            jamToggle.textContent = 'Salir de la Jam';
        }
        renderJamUsers();
    }

    function openJamModal() {
        jamModal?.classList.add('open');
        updateJamUI();
    }

    function closeJamModal() {
        jamModal?.classList.remove('open');
    }

    function startJam() {
        appState.jamPermissions = { allowQueueAdd: true, allowQueueRemove: true };
        initializeJamSession({ asHost: true });
    }

    function stopJam() {
        const sessionId = appState.jamSessionId;
        const wasHost = appState.jamHost;
        appState.jamActive = false;
        appState.jamCode = '';
        localStorage.setItem('jamActive', 'false');
        localStorage.removeItem('jamCode');
        localStorage.removeItem('jamHost');
        localStorage.removeItem('jamSessionId');
        if (sessionId) {
            updateJamMemberStatus(false).catch(() => {});
            if (wasHost) {
                closeJamSessionIfHost(sessionId).catch(() => {});
            }
        }
        appState.jamHost = false;
        appState.jamSessionId = null;
        appState.jamPermissions = { allowQueueAdd: true, allowQueueRemove: true };
        leaveJamChannel();
        updateJamUI();
    }

    function joinJam() {
        const code = jamJoinInput?.value.trim().toUpperCase();
        if (!code) return;
        initializeJamSession({ asHost: false, code });
    }

    function leaveJam() {
        appState.jamActive = false;
        appState.jamCode = '';
        appState.jamHost = false;
        appState.jamSessionId = null;
        appState.jamPermissions = { allowQueueAdd: true, allowQueueRemove: true };
        localStorage.setItem('jamActive', 'false');
        localStorage.removeItem('jamCode');
        localStorage.removeItem('jamHost');
        localStorage.removeItem('jamSessionId');
        updateJamMemberStatus(false).catch(() => {});
        leaveJamChannel();
        updateJamUI();
    }

    function leaveJamChannel() {
        if (appState.jamChannel) {
            supabaseClient.removeChannel(appState.jamChannel);
            appState.jamChannel = null;
        }
        if (appState.jamMembersInterval) {
            clearInterval(appState.jamMembersInterval);
            appState.jamMembersInterval = null;
        }
        if (appState.jamSessionInterval) {
            clearInterval(appState.jamSessionInterval);
            appState.jamSessionInterval = null;
        }
        appState.lastJamSongId = null;
        appState.jamUsers = [];
        renderJamUsers();
    }

    function connectToJam(code, isHost) {
        if (!code || !navigator.onLine) return;
        if (appState.jamChannel) {
            leaveJamChannel();
        }
        const username = appState.usuarioActual || 'Invitado';
        const channel = supabaseClient.channel(`jam-${code}`, {
            config: {
                presence: { key: username }
            }
        });
        appState.jamChannel = channel;

        channel.on('broadcast', { event: 'jam-play' }, payload => {
            if (appState.jamHost) return;
            applyJamSync(payload);
        });

        channel.on('broadcast', { event: 'jam-pause' }, payload => {
            if (appState.jamHost) return;
            applyJamPause(payload);
        });

        channel.on('broadcast', { event: 'jam-seek' }, payload => {
            if (appState.jamHost) return;
            applyJamSeek(payload);
        });

        channel.on('broadcast', { event: 'jam-config' }, payload => {
            applyJamConfig(payload);
        });

        channel.on('broadcast', { event: 'jam-recommend' }, payload => {
            applyJamRecommendation(payload);
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ username, isHost });
                startJamMembersPolling();
                if (isHost) {
                    broadcastJamConfig();
                } else {
                    startJamSessionPolling();
                }
            }
        });
    }

    async function initializeJamSession({ asHost, code = null }) {
        if (!navigator.onLine) {
            alert("Se requiere conexión para iniciar una Jam.");
            return;
        }
        const username = appState.usuarioActual || 'Invitado';
        let jamCode = code;

        if (asHost) {
            let attempts = 0;
            let createdSession = null;
            while (!createdSession && attempts < 3) {
                attempts += 1;
                jamCode = jamCode || generateJamCode();
                const { data, error } = await createJamSessionRecord({
                    code: jamCode,
                    hostUsername: username
                });
                if (error) {
                    const errorMessage = error?.message || JSON.stringify(error);
                    console.error('Error creando Jam:', errorMessage);
                    if (errorMessage.toLowerCase().includes('duplicate')) {
                        jamCode = null;
                        continue;
                    }
                    alert('No se pudo crear la Jam. Revisa las políticas de Supabase.');
                    return;
                }
                createdSession = data;
            }
            if (!createdSession) {
                alert('No se pudo crear la Jam. Intenta de nuevo.');
                return;
            }
            appState.jamSessionId = createdSession.id;
        } else {
            const session = await fetchJamSessionByCode(jamCode);
            if (!session) {
                alert('Código de Jam inválido o inactivo.');
                return;
            }
            appState.jamSessionId = session.id;
        }

        appState.jamActive = true;
        appState.jamHost = asHost;
        appState.jamCode = jamCode;
        localStorage.setItem('jamActive', 'true');
        localStorage.setItem('jamCode', appState.jamCode);
        localStorage.setItem('jamHost', asHost ? 'true' : 'false');
        localStorage.setItem('jamSessionId', appState.jamSessionId);

        await upsertJamMember({ username, isHost: asHost });
        if (!asHost) {
            await syncFromJamSession();
        }
        connectToJam(appState.jamCode, asHost);
        updateJamUI();
    }

    async function fetchJamSessionByCode(code) {
        const { data, error } = await supabaseClient
            .from('jam_sessions')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();
        if (error) {
            const errorMessage = error?.message || JSON.stringify(error);
            console.warn('Jam session fetch error:', errorMessage);
            return null;
        }
        return data;
    }

    async function createJamSessionRecord({ code, hostUsername }) {
        const payload = {
            code,
            host_username: hostUsername,
            is_active: true,
            current_song_id: null,
            current_time: 0,
            is_playing: false
        };
        let response = await supabaseClient
            .from('jam_sessions')
            .insert([payload])
            .select('id, code')
            .single();
        if (response.error?.message?.includes("current_time")) {
            const minimalPayload = {
                code,
                host_username: hostUsername,
                is_active: true,
                current_song_id: null,
                is_playing: false
            };
            response = await supabaseClient
                .from('jam_sessions')
                .insert([minimalPayload])
                .select('id, code')
                .single();
        }
        return response;
    }

    async function upsertJamMember({ username, isHost }) {
        if (!appState.jamSessionId) return;
        const now = new Date().toISOString();
        const { data: existing, error: findError } = await supabaseClient
            .from('jam_members')
            .select('id')
            .eq('jam_id', appState.jamSessionId)
            .eq('username', username)
            .maybeSingle();

        if (findError) {
            const errorMessage = findError?.message || JSON.stringify(findError);
            console.warn('Error consultando miembro de Jam:', errorMessage);
            return;
        }

        if (existing?.id) {
            const { error } = await supabaseClient
                .from('jam_members')
                .update({ is_host: isHost, active: true, last_seen: now })
                .eq('id', existing.id);
            if (error) {
                const errorMessage = error?.message || JSON.stringify(error);
                console.warn('Error actualizando miembro de Jam:', errorMessage);
            }
            return;
        }

        const { error } = await supabaseClient
            .from('jam_members')
            .insert({
                jam_id: appState.jamSessionId,
                username,
                is_host: isHost,
                active: true,
                last_seen: now
            });

        if (error) {
            const errorMessage = error?.message || JSON.stringify(error);
            console.warn('Error registrando miembro de Jam:', errorMessage);
        }
    }

    async function updateJamMemberStatus(active) {
        if (!appState.jamSessionId) return;
        const username = appState.usuarioActual || 'Invitado';
        await supabaseClient
            .from('jam_members')
            .update({ active, last_seen: new Date().toISOString() })
            .eq('jam_id', appState.jamSessionId)
            .eq('username', username);
    }

    async function closeJamSessionIfHost(sessionId = appState.jamSessionId) {
        if (!sessionId) return;
        await supabaseClient
            .from('jam_sessions')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', sessionId);
    }

    async function refreshJamMembers() {
        if (!appState.jamSessionId) return;
        const { data, error } = await supabaseClient
            .from('jam_members')
            .select('username,is_host,active')
            .eq('jam_id', appState.jamSessionId)
            .eq('active', true)
            .order('is_host', { ascending: false });
        if (error) {
            console.warn('Jam members fetch error:', error);
            return;
        }
        appState.jamUsers = (data || []).map(member => ({
            username: member.username,
            isHost: member.is_host
        }));
        renderJamUsers();
    }

    function startJamMembersPolling() {
        refreshJamMembers().catch(() => {});
        if (appState.jamMembersInterval) return;
        appState.jamMembersInterval = setInterval(() => {
            refreshJamMembers().catch(() => {});
            updateJamMemberStatus(true).catch(() => {});
        }, 8000);
    }

    function startJamSessionPolling() {
        if (appState.jamSessionInterval) return;
        appState.jamSessionInterval = setInterval(async () => {
            if (!appState.jamActive || appState.jamHost || !appState.jamCode) return;
            const session = await fetchJamSessionByCode(appState.jamCode);
            if (!session) return;
            const songId = session.current_song_id;
            if (songId && songId !== appState.lastJamSongId && !appState.jamSyncInProgress) {
                appState.lastJamSongId = songId;
                applyJamSync({
                    songId,
                    time: session.current_time || 0,
                    isPlaying: session.is_playing
                });
            }
        }, 4000);
    }

    async function syncFromJamSession() {
        const session = await fetchJamSessionByCode(appState.jamCode);
        if (!session) return;
        if (session.current_song_id) {
            appState.lastJamSongId = session.current_song_id;
            applyJamSync({
                songId: session.current_song_id,
                time: session.current_time || 0,
                isPlaying: session.is_playing
            });
        }
    }

    function applyJamConfig(payload) {
        if (!payload) return;
        appState.jamPermissions = {
            allowQueueAdd: payload.allowQueueAdd !== false,
            allowQueueRemove: payload.allowQueueRemove !== false
        };
        updateJamUI();
    }

    function applyJamRecommendation(payload) {
        if (!payload?.songName) return;
        if (typeof window.showToast === 'function') {
            window.showToast(`Recomendación del host: ${payload.songName}`, 'success');
        }
    }

    function broadcastJamConfig() {
        if (!appState.jamChannel || !appState.jamHost) return;
        appState.jamChannel.send({
            type: 'broadcast',
            event: 'jam-config',
            payload: {
                allowQueueAdd: appState.jamPermissions?.allowQueueAdd !== false,
                allowQueueRemove: appState.jamPermissions?.allowQueueRemove !== false
            }
        });
    }

    function recommendCurrentSong() {
        if (!appState.jamChannel || !appState.jamHost) return;
        const currentSong = appState.playlist[appState.currentIndex];
        if (!currentSong) return;
        appState.jamChannel.send({
            type: 'broadcast',
            event: 'jam-recommend',
            payload: {
                songId: currentSong.id,
                songName: currentSong.name
            }
        });
        if (typeof window.showToast === 'function') {
            window.showToast('Recomendación enviada al Jam.', 'success');
        }
    }

    function applyJamSync(payload) {
        if (!payload?.songId) return;
        const songId = payload.songId;
        const targetTime = payload.time || 0;
        const isPlaying = payload.isPlaying;
        const songIndex = appState.playlist.findIndex(s => s.id === songId);
        if (songIndex === -1) return;

        appState.jamSyncInProgress = true;
        const finishSync = () => {
            appState.jamSyncInProgress = false;
        };

        if (appState.offlineMode) {
            playOfflineSongById(songId, { fadeOutMs: 0, fadeInMs: 0 });
            setTimeout(() => {
                audio.currentTime = targetTime;
                if (isPlaying) {
                    audio.play();
                } else {
                    audio.pause();
                }
                finishSync();
            }, 600);
            return;
        }

        playSong(songIndex, { fadeOutMs: 0, fadeInMs: 0 });
        let syncApplied = false;
        const applyTimeAndState = () => {
            if (syncApplied) return;
            syncApplied = true;
            audio.currentTime = Math.max(0, targetTime);
            if (isPlaying) {
                audio.play().catch(() => {});
            } else {
                audio.pause();
            }
            finishSync();
        };
        if (audio.readyState >= 1) {
            setTimeout(applyTimeAndState, 200);
        } else {
            audio.addEventListener('loadedmetadata', applyTimeAndState, { once: true });
            setTimeout(applyTimeAndState, 1200);
        }
    }

    function applyJamPause(payload) {
        if (!payload) return;
        appState.jamSyncInProgress = true;
        audio.currentTime = payload.time || audio.currentTime;
        audio.pause();
        setTimeout(() => {
            appState.jamSyncInProgress = false;
        }, 400);
    }

    function applyJamSeek(payload) {
        if (!payload) return;
        appState.jamSyncInProgress = true;
        audio.currentTime = payload.time || audio.currentTime;
        setTimeout(() => {
            appState.jamSyncInProgress = false;
        }, 200);
    }

    async function updateJamSessionState(songId) {
        if (!appState.jamSessionId) return;
        const payload = {
            current_song_id: songId,
            current_time: audio.currentTime || 0,
            is_playing: !audio.paused,
            updated_at: new Date().toISOString()
        };
        let response = await supabaseClient
            .from('jam_sessions')
            .update(payload)
            .eq('id', appState.jamSessionId);
        if (response.error?.message?.includes("current_time")) {
            const minimalPayload = {
                current_song_id: songId,
                is_playing: !audio.paused,
                updated_at: new Date().toISOString()
            };
            response = await supabaseClient
                .from('jam_sessions')
                .update(minimalPayload)
                .eq('id', appState.jamSessionId);
        }
    }

    async function updateJamMembersCurrentSong(songId) {
        if (!appState.jamSessionId || !appState.jamUsers.length) return;
        const usernames = appState.jamUsers.map(user => user.username);
        const { error } = await supabaseClient
            .from('users_access')
            .update({ current_song_id: songId })
            .in('username', usernames);
        if (error) {
            console.warn('Error updating jam users current song:', error);
        }
    }

    function broadcastJamState(event) {
        if (!appState.jamChannel || !appState.jamActive || !appState.jamHost) return;
        const currentSong = appState.playlist[appState.currentIndex];
        if (!currentSong) return;
        appState.lastJamSongId = currentSong.id;
        updateJamSessionState(currentSong.id).catch(() => {});
        updateJamMembersCurrentSong(currentSong.id).catch(() => {});
        appState.jamChannel.send({
            type: 'broadcast',
            event,
            payload: {
                songId: currentSong.id,
                time: audio.currentTime || 0,
                isPlaying: !audio.paused
            }
        });
    }

    function initJamFromStorage() {
        if (appState.jamActive && appState.jamCode) {
            if (appState.jamSessionId) {
                connectToJam(appState.jamCode, appState.jamHost);
                updateJamUI();
            } else {
                fetchJamSessionByCode(appState.jamCode).then(session => {
                    if (session) {
                        appState.jamSessionId = session.id;
                        localStorage.setItem('jamSessionId', appState.jamSessionId);
                        connectToJam(appState.jamCode, appState.jamHost);
                        updateJamUI();
                    } else {
                        appState.jamActive = false;
                        appState.jamCode = '';
                        appState.jamHost = false;
                        localStorage.setItem('jamActive', 'false');
                        localStorage.removeItem('jamCode');
                        localStorage.removeItem('jamHost');
                        localStorage.removeItem('jamSessionId');
                    }
                });
            }
        }
    }

    if (jamBtn) jamBtn.onclick = openJamModal;
    if (closeJam) closeJam.onclick = closeJamModal;
    if (jamToggle) {
        jamToggle.onclick = () => {
            if (appState.jamActive && appState.jamHost) {
                stopJam();
            } else if (appState.jamActive) {
                leaveJam();
            } else {
                startJam();
            }
        };
    }
    if (jamCopy) {
        jamCopy.onclick = async () => {
            if (!appState.jamCode) return;
            try {
                await navigator.clipboard.writeText(appState.jamCode);
            } catch (err) {
                console.warn('No se pudo copiar el código:', err);
                alert('No se pudo copiar el código. Cópialo manualmente.');
            }
        };
    }
    if (jamJoinBtn) jamJoinBtn.onclick = joinJam;

    if (jamAllowQueueAdd) {
        jamAllowQueueAdd.onchange = () => {
            if (!appState.jamHost) return;
            appState.jamPermissions.allowQueueAdd = jamAllowQueueAdd.checked;
            broadcastJamConfig();
        };
    }

    if (jamAllowQueueRemove) {
        jamAllowQueueRemove.onchange = () => {
            if (!appState.jamHost) return;
            appState.jamPermissions.allowQueueRemove = jamAllowQueueRemove.checked;
            broadcastJamConfig();
        };
    }

    if (jamRecommendCurrent) {
        jamRecommendCurrent.onclick = recommendCurrentSong;
    }

    return {
        broadcastJamState,
        initJamFromStorage,
        updateJamMembersCurrentSong,
        canUserAddToQueue: () => appState.jamHost || !appState.jamActive || appState.jamPermissions?.allowQueueAdd !== false,
        canUserRemoveFromQueue: () => appState.jamHost || !appState.jamActive || appState.jamPermissions?.allowQueueRemove !== false
    };
}
