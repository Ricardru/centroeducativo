// Inicializar el cliente de Supabase
const SUPABASE_URL = 'https://lunrriztthihxlvjyiys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bnJyaXp0dGhpaHhsdmp5aXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Nzk4NzgsImV4cCI6MjA3NjI1NTg3OH0.xlBYYztcz4RV-ngqw7rXUhfbOsS2iE_Nx7ssnZLNf7Y';

// Función para probar el login
async function testLogin(email, password, description = '') {
    console.log('=== Prueba de login ===');
    console.log('Descripción:', description);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Longitud de contraseña:', password.length);
    console.log('Contiene mayúsculas:', /[A-Z]/.test(password));
    console.log('Contiene números:', /[0-9]/.test(password));
    console.log('Contiene caracteres especiales:', /[!@#$%^&*(),.?":{}|<>]/.test(password));

    try {
        // Crear cliente de Supabase
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        console.log('Cliente Supabase creado');

        // Intentar obtener sesión actual
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        console.log('Sesión actual:', currentSession);
        
        if (currentSession) {
            console.log('Cerrando sesión existente...');
            await supabase.auth.signOut();
        }

        // Intentar login
        console.log('Iniciando proceso de login...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('Error durante el login:', error);
            console.error('Mensaje de error:', error.message);
            console.error('Código de error:', error.status);
            return false;
        }

        console.log('Login exitoso!');
        console.log('Datos de usuario:', data.user);
        console.log('Datos de sesión:', data.session);
        return true;

    } catch (error) {
        console.error('Error inesperado:', error);
        return false;
    }
}

// Función para probar todos los posibles escenarios
async function runTests() {
    const testCases = [
        {
            email: 'colegiocarmendepenia@gmail.com',
            password: 'opeNDatA*2025**',
            description: 'Credenciales de Supabase'
        }
        // Puedes agregar más casos de prueba aquí
    ];

    for (const testCase of testCases) {
        console.log('\n------- Iniciando prueba -------');
        const success = await testLogin(testCase.email, testCase.password, testCase.description);
        console.log('Resultado:', success ? 'Éxito' : 'Fallo');
        console.log('-------------------------------\n');
    }
}

// Ejecutar las pruebas cuando el documento esté listo
document.addEventListener('DOMContentLoaded', runTests);