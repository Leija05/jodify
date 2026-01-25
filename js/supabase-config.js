/* =========================
   CONFIGURACIÓN DE SUPABASE
========================= */
const SB_URL = 'https://iodomuqldhfjyaihqhws.supabase.co';
const SB_KEY = 'sb_publishable_o8W1s7JiJGI9MKyFGBJ-3Q_kknjg-xU';

const supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);

/**
 * Función centralizada para obtener canciones.
 * Maneja el error si el usuario abre la app sin internet.
 */
async function fetchSongsFromSupabase() {
    try {
        if (!navigator.onLine) return null;

        const { data, error } = await supabaseClient
            .from('songs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("Error al conectar con Supabase:", err.message);
        return null;
    } 
}

/**
 * Actualiza los likes en la nube
 */
async function updateSongLikes(id, likes) {
    if (!navigator.onLine) return; // No intenta subir si está offline
    try {
        await supabaseClient.from('songs').update({ likes }).eq('id', id);
    } catch (err) {
        console.error("Error actualizando likes:", err);
    }
}