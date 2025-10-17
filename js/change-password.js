// Inicializar el cliente de Supabase
const SUPABASE_URL = 'https://lunrriztthihxlvjyiys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bnJyaXp0dGhpaHhsdmp5aXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Nzk4NzgsImV4cCI6MjA3NjI1NTg3OH0.xlBYYztcz4RV-ngqw7rXUhfbOsS2iE_Nx7ssnZLNf7Y';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    const toggleButtons = {
        current: document.getElementById('toggleCurrentPassword'),
        new: document.getElementById('toggleNewPassword'),
        confirm: document.getElementById('toggleConfirmPassword')
    };
    const passwordInputs = {
        current: document.getElementById('currentPassword'),
        new: document.getElementById('newPassword'),
        confirm: document.getElementById('confirmPassword')
    };

    // Configurar los botones para mostrar/ocultar contraseña
    Object.entries(toggleButtons).forEach(([key, button]) => {
        button.addEventListener('click', () => {
            const input = passwordInputs[key];
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            button.querySelector('i').classList.toggle('bi-eye');
            button.querySelector('i').classList.toggle('bi-eye-slash');
        });
    });

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

    function validarPassword(password) {
        const minLength = password.length >= 6;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);

        return minLength && hasUpperCase && hasNumber;
    }

    changePasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const currentPassword = passwordInputs.current.value;
        const newPassword = passwordInputs.new.value;
        const confirmPassword = passwordInputs.confirm.value;

        // Validar la nueva contraseña
        if (!validarPassword(newPassword)) {
            mostrarMensaje('La nueva contraseña no cumple con los requisitos mínimos de seguridad.');
            return;
        }

        // Validar que las contraseñas coincidan
        if (newPassword !== confirmPassword) {
            mostrarMensaje('Las contraseñas nuevas no coinciden.');
            return;
        }

        // Deshabilitar el botón de submit
        const submitButton = changePasswordForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cambiando contraseña...';

        try {
            // Verificar si hay una sesión activa
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (!session) {
                // Si no hay sesión, intentar iniciar sesión primero
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: 'admin@cpenia.com', // Usuario administrador
                    password: currentPassword
                });

                if (signInError) {
                    throw new Error('La contraseña actual es incorrecta');
                }
            }

            // Una vez que tenemos la sesión, actualizar la contraseña
            const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
                '1', // ID del usuario admin
                { password: newPassword }
            );

            if (updateError) {
                throw new Error('No se pudo actualizar la contraseña. Verifica que la contraseña actual sea correcta.');
            }

            // Mostrar mensaje de éxito
            mostrarMensaje('Contraseña actualizada exitosamente. Redirigiendo...', 'success');
            
            // Esperar 2 segundos antes de redirigir
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error al cambiar la contraseña:', error.message);
            mostrarMensaje(`Error: ${error.message}`);
        } finally {
            // Reactivar el botón de submit
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="bi bi-check-lg"></i> Cambiar Contraseña';
        }
    });
});