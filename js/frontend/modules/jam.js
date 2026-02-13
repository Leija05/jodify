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
        leaveJamChannel();
        updateJamUI();
    }

    async function joinJam() {
        const code = jamJoinInput?.value.trim().toUpperCase();
        if (!code) {
            if (window.showSystemNotice) await window.showSystemNotice('Ingresa un código de Jam para unirte.', 'Jam');
            return;
        }
        initializeJamSession({ asHost: false, code });
    }

    function leaveJam() {
        appState.jamActive = false;
        appState.jamCode = '';
        appState.jamHost = false;
        appState.jamSessionId = null;
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

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ username, isHost });
                startJamMembersPolling();
                if (!isHost) {
                    startJamSessionPolling();
                }
            }
        });
    }

    async function initializeJamSession({ asHost, code = null }) {
        if (!navigator.onLine) {
            if (window.showSystemNotice) await window.showSystemNotice("Se requiere conexión para iniciar una Jam.", "Jam");
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
                    if (window.showSystemNotice) await window.showSystemNotice('No se pudo crear la Jam. Revisa las políticas de Supabase.', 'Jam');
                    return;
                }
                createdSession = data;
            }
            if (!createdSession) {
                if (window.showSystemNotice) await window.showSystemNotice('No se pudo crear la Jam. Intenta de nuevo.', 'Jam');
                return;
            }
            appState.jamSessionId = createdSession.id;
        } else {
            const session = await fetchJamSessionByCode(jamCode);
            if (!session) {
                if (window.showSystemNotice) await window.showSystemNotice('Código de Jam inválido o inactivo.', 'Jam');
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
        const payload = {
            jam_id: appState.jamSessionId,
            username,
            is_host: isHost,
            active: true,
            last_seen: new Date().toISOString()
        };

        let { error } = await supabaseClient
            .from('jam_members')
            .upsert([payload], { onConflict: 'jam_id,username' });

        if (error) {
            const updateResult = await supabaseClient
                .from('jam_members')
                .update({ is_host: isHost, active: true, last_seen: payload.last_seen })
                .eq('jam_id', appState.jamSessionId)
                .eq('username', username);

            if (updateResult.error) {
                const insertResult = await supabaseClient
                    .from('jam_members')
                    .insert([payload]);
                error = insertResult.error;
            } else {
                error = null;
            }
        }

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
            if (!session || appState.jamSyncInProgress) return;

            const songId = session.current_song_id;
            const sessionTime = Number(session.current_time || 0);
            const sessionPlaying = Boolean(session.is_playing);

            if (!songId) return;

            const currentSong = appState.playlist[appState.currentIndex];
            const currentSongId = currentSong ? String(currentSong.id) : null;
            const sameSong = currentSongId && currentSongId === String(songId);
            const timeDrift = Math.abs((audio.currentTime || 0) - sessionTime);

            if (!sameSong) {
                appState.lastJamSongId = songId;
                applyJamSync({ songId, time: sessionTime, isPlaying: sessionPlaying });
                return;
            }

            if (sessionPlaying !== !audio.paused) {
                if (sessionPlaying) {
                    audio.play().catch(() => {});
                } else {
                    audio.pause();
                }
            }

            if (timeDrift > 1.2) {
                audio.currentTime = sessionTime;
            }
        }, 2000);
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

    function applyJamSync(payload) {
        if (!payload?.songId) return;
        const songId = payload.songId;
        const targetTime = payload.time || 0;
        const isPlaying = payload.isPlaying;
        const songIndex = appState.playlist.findIndex(s => String(s.id) === String(songId));
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

        Promise.resolve(playSong(songIndex, { fadeOutMs: 0, fadeInMs: 0 }))
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    audio.currentTime = targetTime;
                    if (isPlaying) {
                        audio.play().catch(() => {});
                    } else {
                        audio.pause();
                    }
                    finishSync();
                }, 350);
            });
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
                if (window.showSystemNotice) await window.showSystemNotice('No se pudo copiar el código. Cópialo manualmente.', 'Jam');
            }
        };
    }
    if (jamJoinBtn) jamJoinBtn.onclick = joinJam;

    return {
        broadcastJamState,
        initJamFromStorage,
        updateJamMembersCurrentSong
    };
}
