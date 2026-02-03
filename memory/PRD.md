# JodiFy - Music Player PRD

## Original Problem Statement
Usuario solicitó mejoras para su reproductor de MP3 "JodiFy" (Electron + Supabase):
1. Mejorar diseño visual completo
2. Corregir bugs: modales que se abren debajo de otros, modo offline no funciona
3. Nuevas funcionalidades: cola de reproducción, ecualizador visual, atajos de teclado

## Architecture
- **Frontend**: Vanilla HTML/CSS/JS (Electron app)
- **Backend**: Supabase (external)
- **Database**: IndexedDB (offline storage) + Supabase (cloud)

## User Personas
1. **Usuarios regulares**: Escuchan música, crean favoritos, descargan para offline
2. **Admins**: Suben canciones, gestionan usuarios
3. **Developers**: Acceso completo al sistema

## Core Requirements
- Sistema de autenticación con roles
- Playlist con tabs (Global/Favoritas)
- Reproductor con letras sincronizadas
- Modo offline funcional
- Sistema de likes
- Visualizador de audio

---

## What's Been Implemented

### 2025-02-03 - Version 2.3 - Discord Modal & Community

#### Modal de Vinculación Discord
- **Input para User ID**: El usuario ingresa su Discord User ID
- **Preview en tiempo real**: Muestra avatar y nombre al escribir
- **Instrucciones**: Cómo obtener el User ID (expandible)
- **Validación**: Verifica formato del ID

#### Panel de Comunidad
- **Ver usuarios en línea**: Lista de usuarios conectados
- **Qué están escuchando**: Muestra canción actual de cada usuario
- **Estadísticas visibles**: Likes y canciones escuchadas
- **Badges de rol**: Admin (cyan), Dev (violeta), User (verde)

#### Modal de Detalle de Usuario
- **Banner premium** con gradiente animado
- **Avatar con Discord** vinculado
- **Estado**: En línea / Desconectado
- **"Escuchando ahora"**: Canción, portada y tiempo
- **Perfil Discord**: Badge con username
- **Estadísticas completas**: Likes, Escuchadas, Offline
- **Miembro desde**: Fecha de registro

---

### 2025-02-03 - Version 2.2 - Bug Fixes & Profile System

#### Bugs Visuales Corregidos
- ✅ **Barra de progreso**: Ahora se rellena con gradiente violeta→cyan al avanzar la canción
- ✅ **Lupa de búsqueda**: Ícono SVG correcto y bien posicionado

#### Modal de Perfil Premium
- **Header con banner** gradiente animado
- **Avatar grande** con inicial o foto de Discord
- **Indicador online** verde pulsante
- **Badge de rol** con colores por tipo (Admin: cyan, Dev: violeta)
- **Estadísticas**: Likes, Canciones escuchadas, Descargas offline
- **Integración Discord**: Vincular/desvincular cuenta
- **Exportar stats**: Descarga JSON con estadísticas
- **Cerrar sesión**: Desde el perfil

#### Integración Discord (Demo)
- Vincula cuenta de Discord
- Muestra avatar y tag (#0000)
- Actualiza foto de perfil en toda la app
- Botón para desvincular

### 2025-02-03 - Version 2.0.1 - Login Local

#### Sistema de Autenticación Local
- **Usuarios locales**: Funcionan sin conexión a Supabase
  - `admin` / `admin123` → Rol admin (subir canciones)
  - `dev` / `dev123` → Rol developer (acceso completo)
  - `user` / `user123` → Rol usuario (solo escuchar)

### 2025-02-03 - Version 2.0 "Neon Obsidian"

#### Diseño completo, Cola, Ecualizador, Atajos de teclado

---

## Prioritized Backlog

### P0 (Critical) - COMPLETADO
- ✅ Diseño visual completo
- ✅ Fix modales z-index
- ✅ Fix modo offline
- ✅ Cola de reproducción
- ✅ Ecualizador
- ✅ Atajos de teclado
- ✅ Fix barra de progreso
- ✅ Fix lupa búsqueda
- ✅ Modal de perfil premium
- ✅ Integración Discord

### P1 (High) - Recomendadas
- [ ] **Sleep Timer**: Pausar música después de X minutos
- [ ] **Crossfade**: Transición suave entre canciones (3-12s)
- [ ] **Historial de escucha**: Ver últimas 50 canciones
- [ ] **Rich Presence Discord**: Mostrar qué escuchas en Discord
- [ ] **Notificaciones nativas**: Mostrar canción actual

### P2 (Medium) - Buenas ideas
- [ ] **Playlists personalizadas**: Crear listas propias
- [ ] **Compartir canción**: Generar link para compartir
- [ ] **Modo mini-player**: Ventana flotante pequeña
- [ ] **Scrobbling Last.fm**: Registrar escuchas
- [ ] **Letra editable**: Permitir corregir letras

### P3 (Low) - Nice to have
- [ ] **Temas personalizados**: Crear paletas de colores
- [ ] **Widgets de escritorio**: Controles en el escritorio
- [ ] **Sincronización multi-dispositivo**: Continuar en otro device
- [ ] **Reconocimiento de música**: Shazam integrado

---

## Funciones Recomendadas para Agregar

### 1. Sleep Timer ⏰
Detener la música automáticamente después de cierto tiempo. Útil para dormir.

### 2. Crossfade 🎵
Transición suave entre canciones para que no haya silencio.

### 3. Rich Presence Discord 🎮
Mostrar en tu perfil de Discord qué canción estás escuchando en tiempo real.

### 4. Mini Player 📱
Ventana flotante pequeña que siempre está visible sobre otras apps.

### 5. Estadísticas Avanzadas 📊
Dashboard con:
- Top 10 canciones más escuchadas
- Tiempo total escuchado
- Gráfico de actividad semanal

### 6. Playlists Inteligentes 🧠
Crear automáticamente listas basadas en:
- Mood (energética, relajante)
- Artista similar
- Género

---

## Next Tasks
1. Implementar Sleep Timer
2. Agregar Crossfade
3. Integrar Discord Rich Presence real (OAuth2)
4. Mini player flotante
