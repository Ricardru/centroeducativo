// Inicializar el cliente de Supabase
const SUPABASE_URL = 'https://lunrriztthihxlvjyiys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bnJyaXp0dGhpaHhsdmp5aXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Nzk4NzgsImV4cCI6MjA3NjI1NTg3OH0.xlBYYztcz4RV-ngqw7rXUhfbOsS2iE_Nx7ssnZLNf7Y';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Alternar visibilidad de la contraseña
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('bi-eye');
        this.querySelector('i').classList.toggle('bi-eye-slash');
    });

    // Función para mostrar mensajes
    function mostrarMensaje(mensaje, tipo = 'error') {
        const mensajesDiv = document.getElementById('mensajes');
        const mensajeAnterior = mensajesDiv.querySelector('.alert');
        if (mensajeAnterior) {
            mensajeAnterior.remove();
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${tipo === 'error' ? 'alert-danger' : 'alert-success'} mt-3`;
        alertDiv.role = 'alert';
        alertDiv.textContent = mensaje;

        mensajesDiv.appendChild(alertDiv);

        if (tipo === 'success') {
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
    }

    // Manejar el envío del formulario
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;

        // Validaciones básicas
        if (!email || !password) {
            mostrarMensaje('Por favor complete todos los campos');
            return;
        }

        if (!email.includes('@')) {
            mostrarMensaje('Por favor ingrese un correo electrónico válido');
            return;
        }

        if (password.length < 8) {
            mostrarMensaje('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        // Deshabilitar el botón de submit y mostrar loader
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Iniciando sesión...';

        try {
            // Verificar si hay una sesión activa
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                // Si hay una sesión activa, cerrarla
                await supabase.auth.signOut();
            }

            // Intentar iniciar sesión
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw new Error(error.message);
            }

            // Login exitoso
            mostrarMensaje('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
            console.log('Usuario autenticado:', data.user);
            
            // Obtener el perfil_id del usuario
            const { data: userData, error: userError } = await supabase
                .from('usuarios')
                .select('perfil_id')
                .eq('id', data.user.id)
                .single();

            if (userError) throw userError;

            console.log('Datos del usuario:', userData);

            // Redireccionar según el perfil_id usando URLs absolutas desde la raíz
            setTimeout(() => {
                const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
                switch(userData?.perfil_id) {
                    case 1: // Admin
                        window.location.href = baseUrl + 'admin/dashboard.html';
                        break;
                    case 2: // Coordinador
                        window.location.href = baseUrl + 'admin/dashboard-coordinador.html';
                        break;
                    case 3: // Docente
                        window.location.href = baseUrl + 'admin/dashboard-docente.html';
                        break;
                    case 4: // Alumno
                        window.location.href = baseUrl + 'admin/dashboard-alumno.html';
                        break;
                    case 5: // Padre
                        window.location.href = baseUrl + 'admin/dashboard-padres.html';
                        break;
                    case 6: // Padre
                        window.location.href = baseUrl + 'admin/panel-administrativo.html';
                        break;
                    default:
                        // Si el perfil_id no está definido o no coincide con ninguno de los anteriores
                        console.error('Perfil ID no reconocido:', userData?.perfil_id);
                        mostrarMensaje('Error: Perfil de usuario no válido', 'error');
                        supabase.auth.signOut(); // Cerramos la sesión por seguridad
                }
            }, 1000);

        } catch (error) {
            console.error('Error de autenticación:', error.message);
            let mensajeError = 'Error al iniciar sesión';
            
            if (error.message.includes('Invalid login credentials')) {
                mensajeError = 'Usuario o contraseña incorrectos';
            } else if (error.message === 'Email not confirmed') {
                mensajeError = 'Por favor, confirme su correo electrónico';
            } else if (error.message === 'Email logins are disabled') {
                mensajeError = 'El inicio de sesión por email está deshabilitado';
            }
            
            mostrarMensaje(mensajeError);
        } finally {
            // Reactivar el botón de submit
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión';
        }
    });

    // Validación de Bootstrap
    Array.from(loginForm.elements).forEach(element => {
        element.addEventListener('input', function() {
            if (element.checkValidity()) {
                element.classList.remove('is-invalid');
                element.classList.add('is-valid');
            } else {
                element.classList.remove('is-valid');
                element.classList.add('is-invalid');
            }
        });
    });
});

