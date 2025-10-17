// Configuración del cliente Supabase
const SUPABASE_URL = 'https://lunrriztthihxlvjyiys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bnJyaXp0dGhpaHhsdmp5aXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Nzk4NzgsImV4cCI6MjA3NjI1NTg3OH0.xlBYYztcz4RV-ngqw7rXUhfbOsS2iE_Nx7ssnZLNf7Y';

let _supabase = null;

// Función para inicializar el cliente
function initSupabase() {
    if (!_supabase) {
        console.log('[Supabase] Inicializando cliente...');
        if (!window.supabase) {
            throw new Error('Supabase no está cargado. Asegúrate de incluir el script de Supabase.');
        }
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[Supabase] Cliente inicializado correctamente');
    }
    return _supabase;
}

// Exportar el cliente
export const supabase = initSupabase();