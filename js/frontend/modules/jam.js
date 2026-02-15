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
    const jamAllowPlaybackControl = document.getElementById("jamAllowPlaybackControl");
    const jamRecommendCurrent = document.getElementById("jamRecommendCurrent");
    const jamRecommendModal = document.getElementById("jamRecommendModal");
    const closeJamRecommendModalBtn = document.getElementById("closeJamRecommendModal");
    const jamRecommendSearch = document.getElementById("jamRecommendSearch");
    const jamRecommendCategory = document.getElementById("jamRecommendCategory");
    const jamRecommendList = document.getElementById("jamRecommendList");
    const jamHostRecommendationsModal = document.getElementById("jamHostRecommendationsModal");
    const closeJamHostRecommendationsBtn = document.getElementById("closeJamHostRecommendations");
    const jamHostRecommendationsList = document.getElementById("jamHostRecommendationsList");

    const pendingRecommendations = [];

    function notify(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        console[type === 'error' ? 'error' : 'log'](message);
    }

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
        if (jamAllowPlaybackControl) jamAllowPlaybackControl.checked = appState.jamPermissions?.allowPlaybackControl !== false;
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

    function openRecommendModal() {
        renderRecommendCategoryOptions();
        renderRecommendList();
        jamRecommendModal?.classList.add('open');
    }

    function closeRecommendModal() {
        jamRecommendModal?.classList.remove('open');
    }

    function openHostRecommendationsModal() {
        renderHostRecommendations();
        jamHostRecommendationsModal?.classList.add('open');
    }

    function closeHostRecommendationsModal() {
        jamHostRecommendationsModal?.classList.remove('open');
    }

    function startJam() {
        appState.jamPermissions = { allowQueueAdd: true, allowQueueRemove: true, allowPlaybackControl: true };
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
        appState.jamPermissions = { allowQueueAdd: true, allowQueueRemove: true, allowPlaybackControl: true };
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
        appState.jamPermissions = { allowQueueAdd: true, allowQueueRemove: true, allowPlaybackControl: true };
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

    function isOwnPayload(payload) {
        return payload?.senderId && payload.senderId === appState.jamClientId;
    }

    function connectToJam(code, isHost) {
        if (!code || !navigator.onLine) return;
        if (appState.jamChannel) {
            leaveJamChannel();
        }
        const username = appState.usuarioActual || 'Invitado';
        const channel = supabaseClient.channel(`jam-${code}`, {
            config: { presence: { key: `${username}-${appState.jamClientId}` } }
        });
        appState.jamChannel = channel;

        channel.on('broadcast', { event: 'jam-play' }, payload => {
            if (isOwnPayload(payload)) return;
            applyJamSync(payload);
        });
        channel.on('broadcast', { event: 'jam-pause' }, payload => {
            if (isOwnPayload(payload)) return;
            applyJamPause(payload);
        });
        channel.on('broadcast', { event: 'jam-seek' }, payload => {
            if (isOwnPayload(payload)) return;
            applyJamSeek(payload);
        });
        channel.on('broadcast', { event: 'jam-config' }, payload => applyJamConfig(payload));
        channel.on('broadcast', { event: 'jam-recommend' }, payload => applyJamRecommendation(payload));
        channel.on('broadcast', { event: 'jam-queue-add' }, payload => applyJamQueueAdd(payload));
        channel.on('broadcast', { event: 'jam-queue-remove' }, payload => applyJamQueueRemove(payload));
        channel.on('broadcast', { event: 'jam-recommend-request' }, payload => applyRecommendationRequest(payload));

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ username, isHost, clientId: appState.jamClientId });
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
            notify('Se requiere conexión para iniciar una Jam.', 'warning');
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
                const { data, error } = await createJamSessionRecord({ code: jamCode, hostUsername: username });
                if (error) {
                    const errorMessage = error?.message || JSON.stringify(error);
                    if (errorMessage.toLowerCase().includes('duplicate')) {
                        jamCode = null;
                        continue;
                    }
                    notify('No se pudo crear la Jam. Revisa las políticas de Supabase.', 'error');
                    return;
                }
                createdSession = data;
            }
            if (!createdSession) {
                notify('No se pudo crear la Jam. Intenta de nuevo.', 'error');
                return;
            }
            appState.jamSessionId = createdSession.id;
        } else {
            const session = await fetchJamSessionByCode(jamCode);
            if (!session) {
                notify('Código de Jam inválido o inactivo.', 'warning');
                return;
            }
            appState.jamSessionId = session.id;
        }

        appState.jamActive = true;
        appState.jamHost = asHost;
        appState.jamCode = jamCode;
        appState.jamUsers = [{ username, isHost: asHost }];
        localStorage.setItem('jamActive', 'true');
        localStorage.setItem('jamCode', appState.jamCode);
        localStorage.setItem('jamHost', asHost ? 'true' : 'false');
        localStorage.setItem('jamSessionId', appState.jamSessionId);

        await upsertJamMember({ username, isHost: asHost });
        if (!asHost) await syncFromJamSession();
        connectToJam(appState.jamCode, asHost);
        updateJamUI();
    }

    async function fetchJamSessionByCode(code) {
        const { data, error } = await supabaseClient.from('jam_sessions').select('*').eq('code', code).eq('is_active', true).single();
        if (error) return null;
        return data;
    }

    async function createJamSessionRecord({ code, hostUsername }) {
        let response = await supabaseClient.from('jam_sessions').insert([{ code, host_username: hostUsername, is_active: true, current_song_id: null, current_time: 0, is_playing: false }]).select('id, code').single();
        if (response.error?.message?.includes('current_time')) {
            response = await supabaseClient.from('jam_sessions').insert([{ code, host_username: hostUsername, is_active: true, current_song_id: null, is_playing: false }]).select('id, code').single();
        }
        return response;
    }

    async function upsertJamMember({ username, isHost }) {
        if (!appState.jamSessionId) return;
        const now = new Date().toISOString();
        const { data: existing } = await supabaseClient.from('jam_members').select('id').eq('jam_id', appState.jamSessionId).eq('username', username).maybeSingle();
        if (existing?.id) {
            await supabaseClient.from('jam_members').update({ is_host: isHost, active: true, last_seen: now }).eq('id', existing.id);
            return;
        }
        await supabaseClient.from('jam_members').insert({ jam_id: appState.jamSessionId, username, is_host: isHost, active: true, last_seen: now });
    }

    async function updateJamMemberStatus(active) {
        if (!appState.jamSessionId) return;
        const username = appState.usuarioActual || 'Invitado';
        await supabaseClient.from('jam_members').update({ active, last_seen: new Date().toISOString() }).eq('jam_id', appState.jamSessionId).eq('username', username);
    }

    async function closeJamSessionIfHost(sessionId = appState.jamSessionId) {
        if (!sessionId) return;
        await supabaseClient.from('jam_sessions').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', sessionId);
    }

    async function refreshJamMembers() {
        if (!appState.jamSessionId) return;
        const { data, error } = await supabaseClient.from('jam_members').select('username,is_host,active').eq('jam_id', appState.jamSessionId).eq('active', true).order('is_host', { ascending: false });
        if (error) return;
        appState.jamUsers = (data || []).map(member => ({ username: member.username, isHost: member.is_host }));
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
            if (!session?.current_song_id || appState.jamSyncInProgress) return;
            if (session.current_song_id !== appState.lastJamSongId) {
                appState.lastJamSongId = session.current_song_id;
                applyJamSync({ songId: session.current_song_id, time: session.current_time || 0, isPlaying: session.is_playing });
            }
        }, 4000);
    }

    async function syncFromJamSession() {
        const session = await fetchJamSessionByCode(appState.jamCode);
        if (!session?.current_song_id) return;
        appState.lastJamSongId = session.current_song_id;
        applyJamSync({ songId: session.current_song_id, time: session.current_time || 0, isPlaying: session.is_playing });
    }

    function applyJamConfig(payload) {
        if (!payload) return;
        appState.jamPermissions = {
            allowQueueAdd: payload.allowQueueAdd !== false,
            allowQueueRemove: payload.allowQueueRemove !== false,
            allowPlaybackControl: payload.allowPlaybackControl !== false
        };
        updateJamUI();
    }

    function applyJamRecommendation(payload) {
        if (!payload?.songName) return;
        notify(`Recomendación: ${payload.songName}`, 'success');
    }

    function applyRecommendationRequest(payload) {
        if (!appState.jamHost || !payload?.songId || !payload.songName) return;
        pendingRecommendations.unshift(payload);
        renderHostRecommendations();
        openHostRecommendationsModal();
        notify(`Nueva recomendación de ${payload.username || 'usuario'}.`, 'info');
    }

    function broadcastJamConfig() {
        if (!appState.jamChannel || !appState.jamHost) return;
        appState.jamChannel.send({
            type: 'broadcast',
            event: 'jam-config',
            payload: {
                allowQueueAdd: appState.jamPermissions?.allowQueueAdd !== false,
                allowQueueRemove: appState.jamPermissions?.allowQueueRemove !== false,
                allowPlaybackControl: appState.jamPermissions?.allowPlaybackControl !== false,
                senderId: appState.jamClientId
            }
        });
    }

    function recommendCurrentSong() {
        if (!appState.jamChannel) return;
        const currentSong = appState.playlist[appState.currentIndex];
        if (!currentSong) return;
        appState.jamChannel.send({ type: 'broadcast', event: 'jam-recommend', payload: { songId: currentSong.id, songName: currentSong.name, senderId: appState.jamClientId } });
        notify('Recomendación enviada al Jam.', 'success');
    }

    function applyJamSync(payload) {
        if (!payload?.songId) return;
        const songIndex = appState.playlist.findIndex(s => s.id === payload.songId);
        if (songIndex === -1) return;
        appState.jamSyncInProgress = true;
        const finishSync = () => { appState.jamSyncInProgress = false; };

        if (appState.offlineMode) {
            playOfflineSongById(payload.songId, { fadeOutMs: 0, fadeInMs: 0 });
            setTimeout(() => {
                audio.currentTime = payload.time || 0;
                payload.isPlaying ? audio.play().catch(() => {}) : audio.pause();
                finishSync();
            }, 500);
            return;
        }

        playSong(songIndex, { fadeOutMs: 0, fadeInMs: 0 });
        setTimeout(() => {
            audio.currentTime = Math.max(0, payload.time || 0);
            payload.isPlaying ? audio.play().catch(() => {}) : audio.pause();
            finishSync();
        }, 240);
    }

    function applyJamPause(payload) {
        if (!payload) return;
        appState.jamSyncInProgress = true;
        audio.currentTime = payload.time || audio.currentTime;
        audio.pause();
        setTimeout(() => { appState.jamSyncInProgress = false; }, 300);
    }

    function applyJamSeek(payload) {
        if (!payload) return;
        appState.jamSyncInProgress = true;
        audio.currentTime = payload.time || audio.currentTime;
        setTimeout(() => { appState.jamSyncInProgress = false; }, 200);
    }

    async function updateJamSessionState(songId) {
        if (!appState.jamSessionId) return;
        let response = await supabaseClient.from('jam_sessions').update({
            current_song_id: songId,
            current_time: audio.currentTime || 0,
            is_playing: !audio.paused,
            updated_at: new Date().toISOString()
        }).eq('id', appState.jamSessionId);
        if (response.error?.message?.includes('current_time')) {
            response = await supabaseClient.from('jam_sessions').update({
                current_song_id: songId,
                is_playing: !audio.paused,
                updated_at: new Date().toISOString()
            }).eq('id', appState.jamSessionId);
        }
    }

    async function updateJamMembersCurrentSong(songId) {
        if (!appState.jamSessionId || !appState.jamUsers.length) return;
        const usernames = appState.jamUsers.map(user => user.username);
        await supabaseClient.from('users_access').update({ current_song_id: songId }).in('username', usernames);
    }

    function broadcastJamState(event) {
        if (!appState.jamChannel || !appState.jamActive) return;
        const currentSong = appState.playlist[appState.currentIndex];
        if (!currentSong) return;
        appState.lastJamSongId = currentSong.id;
        updateJamSessionState(currentSong.id).catch(() => {});
        updateJamMembersCurrentSong(currentSong.id).catch(() => {});
        appState.jamChannel.send({ type: 'broadcast', event, payload: { songId: currentSong.id, time: audio.currentTime || 0, isPlaying: !audio.paused, senderId: appState.jamClientId } });
    }

    function broadcastQueueAdd(song) {
        if (!song || !appState.jamChannel || !appState.jamActive) return;
        appState.jamChannel.send({ type: 'broadcast', event: 'jam-queue-add', payload: { songId: song.id, senderId: appState.jamClientId } });
    }

    function applyJamQueueAdd(payload) {
        if (isOwnPayload(payload) || !payload?.songId) return;
        const song = appState.playlist.find(item => item.id === payload.songId);
        if (!song) return;
        const exists = appState.queue.some(item => item.id === song.id);
        if (!exists) {
            appState.queue.push(song);
            if (typeof window.renderQueueFromJam === 'function') window.renderQueueFromJam();
        }
    }

    function broadcastQueueRemove(songId) {
        if (!songId || !appState.jamChannel || !appState.jamActive) return;
        appState.jamChannel.send({ type: 'broadcast', event: 'jam-queue-remove', payload: { songId, senderId: appState.jamClientId } });
    }

    function applyJamQueueRemove(payload) {
        if (isOwnPayload(payload) || !payload?.songId) return;
        const index = appState.queue.findIndex(item => item.id === payload.songId);
        if (index >= 0) {
            appState.queue.splice(index, 1);
            if (typeof window.renderQueueFromJam === 'function') window.renderQueueFromJam();
        }
    }

    function sendRecommendation(song) {
        if (!song || !appState.jamChannel || !appState.jamActive) return;
        appState.jamChannel.send({
            type: 'broadcast',
            event: 'jam-recommend-request',
            payload: { songId: song.id, songName: song.name, username: appState.usuarioActual || 'Invitado', senderId: appState.jamClientId }
        });
        notify('Recomendación enviada al host.', 'success');
    }

    function getSongCategory(song) {
        return song?.category || song?.genre || 'General';
    }

    function renderRecommendCategoryOptions() {
        if (!jamRecommendCategory) return;
        const categories = [...new Set(appState.playlist.map(getSongCategory))].sort((a, b) => a.localeCompare(b));
        jamRecommendCategory.innerHTML = `<option value="all">Todas</option>${categories.map(category => `<option value="${category}">${category}</option>`).join('')}`;
    }

    function renderRecommendList() {
        if (!jamRecommendList) return;
        const search = jamRecommendSearch?.value?.trim().toLowerCase() || '';
        const category = jamRecommendCategory?.value || 'all';
        const matches = appState.playlist.filter(song => {
            const inCategory = category === 'all' || getSongCategory(song) === category;
            const inSearch = !search || song.name.toLowerCase().includes(search);
            return inCategory && inSearch;
        }).slice(0, 120);
        jamRecommendList.innerHTML = matches.length
            ? matches.map(song => `<button class="jam-recommend-item" data-song-id="${song.id}">${song.name}<small>${getSongCategory(song)}</small></button>`).join('')
            : '<p class="jam-empty">No hay canciones con ese filtro.</p>';
    }

    function renderHostRecommendations() {
        if (!jamHostRecommendationsList) return;
        jamHostRecommendationsList.innerHTML = pendingRecommendations.length
            ? pendingRecommendations.map((recommendation, index) => `
                <div class="jam-host-rec-item">
                    <div>
                        <strong>${recommendation.songName}</strong>
                        <small>${recommendation.username || 'Usuario'}</small>
                    </div>
                    <div class="jam-host-rec-actions">
                        <button data-host-action="queue" data-host-index="${index}">Agregar a cola</button>
                        <button data-host-action="play" data-host-index="${index}">Reproducir</button>
                        <button data-host-action="reject" data-host-index="${index}">Descartar</button>
                    </div>
                </div>
            `).join('')
            : '<p class="jam-empty">No hay recomendaciones pendientes.</p>';
    }

    function resolveHostRecommendation(action, index) {
        const recommendation = pendingRecommendations[index];
        if (!recommendation) return;
        const song = appState.playlist.find(item => item.id === recommendation.songId);

        if (action === 'queue' && song) {
            const exists = appState.queue.some(item => item.id === song.id);
            if (!exists) {
                appState.queue.push(song);
                if (typeof window.renderQueueFromJam === 'function') window.renderQueueFromJam();
                broadcastQueueAdd(song);
            }
            notify('Canción agregada a la cola.', 'success');
        }

        if (action === 'play' && song) {
            const songIndex = appState.playlist.findIndex(item => item.id === song.id);
            if (songIndex >= 0) {
                playSong(songIndex, { fadeOutMs: 0, fadeInMs: 0 });
                broadcastJamState('jam-play');
            }
            notify('Canción reproducida para toda la Jam.', 'success');
        }

        pendingRecommendations.splice(index, 1);
        renderHostRecommendations();
    }

    function maybeRecommendInstead() {
        if (!appState.jamActive || appState.jamHost) return false;
        openRecommendModal();
        return true;
    }

    function initJamFromStorage() {
        if (!appState.jamActive || !appState.jamCode) return;
        if (appState.jamSessionId) {
            connectToJam(appState.jamCode, appState.jamHost);
            updateJamUI();
            return;
        }
        fetchJamSessionByCode(appState.jamCode).then(session => {
            if (!session) {
                appState.jamActive = false;
                appState.jamCode = '';
                appState.jamHost = false;
                localStorage.setItem('jamActive', 'false');
                localStorage.removeItem('jamCode');
                localStorage.removeItem('jamHost');
                localStorage.removeItem('jamSessionId');
                return;
            }
            appState.jamSessionId = session.id;
            localStorage.setItem('jamSessionId', appState.jamSessionId);
            connectToJam(appState.jamCode, appState.jamHost);
            updateJamUI();
        });
    }

    if (jamBtn) jamBtn.onclick = openJamModal;
    if (closeJam) closeJam.onclick = closeJamModal;
    if (jamToggle) {
        jamToggle.onclick = () => {
            if (appState.jamActive && appState.jamHost) return stopJam();
            if (appState.jamActive) return leaveJam();
            startJam();
        };
    }
    if (jamCopy) {
        jamCopy.onclick = async () => {
            if (!appState.jamCode) return;
            try {
                await navigator.clipboard.writeText(appState.jamCode);
            } catch {
                notify('No se pudo copiar el código. Cópialo manualmente.', 'warning');
            }
        };
    }

    if (jamJoinBtn) jamJoinBtn.onclick = joinJam;
    if (jamAllowQueueAdd) jamAllowQueueAdd.onchange = () => { if (appState.jamHost) { appState.jamPermissions.allowQueueAdd = jamAllowQueueAdd.checked; broadcastJamConfig(); } };
    if (jamAllowQueueRemove) jamAllowQueueRemove.onchange = () => { if (appState.jamHost) { appState.jamPermissions.allowQueueRemove = jamAllowQueueRemove.checked; broadcastJamConfig(); } };
    if (jamAllowPlaybackControl) jamAllowPlaybackControl.onchange = () => { if (appState.jamHost) { appState.jamPermissions.allowPlaybackControl = jamAllowPlaybackControl.checked; broadcastJamConfig(); } };
    if (jamRecommendCurrent) jamRecommendCurrent.onclick = recommendCurrentSong;

    if (closeJamRecommendModalBtn) closeJamRecommendModalBtn.onclick = closeRecommendModal;
    if (jamRecommendSearch) jamRecommendSearch.oninput = renderRecommendList;
    if (jamRecommendCategory) jamRecommendCategory.onchange = renderRecommendList;
    if (jamRecommendList) {
        jamRecommendList.onclick = (event) => {
            const item = event.target.closest('[data-song-id]');
            if (!item) return;
            const songId = Number(item.getAttribute('data-song-id'));
            const song = appState.playlist.find(entry => entry.id === songId);
            if (!song) return;
            sendRecommendation(song);
            closeRecommendModal();
        };
    }

    if (closeJamHostRecommendationsBtn) closeJamHostRecommendationsBtn.onclick = closeHostRecommendationsModal;
    if (jamHostRecommendationsList) {
        jamHostRecommendationsList.onclick = (event) => {
            const button = event.target.closest('[data-host-action]');
            if (!button) return;
            resolveHostRecommendation(button.getAttribute('data-host-action'), Number(button.getAttribute('data-host-index')));
        };
    }

    return {
        broadcastJamState,
        initJamFromStorage,
        updateJamMembersCurrentSong,
        canUserAddToQueue: () => appState.jamHost || !appState.jamActive || appState.jamPermissions?.allowQueueAdd !== false,
        canUserRemoveFromQueue: () => appState.jamHost || !appState.jamActive || appState.jamPermissions?.allowQueueRemove !== false,
        canUserControlPlayback: () => appState.jamHost || !appState.jamActive || appState.jamPermissions?.allowPlaybackControl !== false,
        maybeRecommendInstead,
        openRecommendModal,
        broadcastQueueAdd,
        broadcastQueueRemove
    };
}
