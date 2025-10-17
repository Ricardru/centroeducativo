// Inicializar el cliente de Supabase
const SUPABASE_URL = 'https://lunrriztthihxlvjyiys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bnJyaXp0dGhpaHhsdmp5aXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Nzk4NzgsImV4cCI6MjA3NjI1NTg3OH0.xlBYYztcz4RV-ngqw7rXUhfbOsS2iE_Nx7ssnZLNf7Y';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {
    const confirmResetForm = document.getElementById('confirmResetForm');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    function togglePasswordVisibility(input, button) {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        button.querySelector('i').classList.toggle('bi-eye');
        button.querySelector('i').classList.toggle('bi-eye-slash');
    }

    togglePassword.addEventListener('click', () => togglePasswordVisibility(passwordInput, togglePassword));
    toggleConfirmPassword.addEventListener('click', () => togglePasswordVisibility(confirmPasswordInput, toggleConfirmPassword));

    function mostrarMensaje(mensaje, tipo = 'error') {
        const mensajeAnterior = document.querySelector('.alert');
        if (mensajeAnterior) {
            mensajeAnterior.remove();
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${tipo === 'error' ? 'alert-danger' : 'alert-success'} mt-3`;
        alertDiv.role = 'alert';
        alertDiv.textContent = mensaje;

        confirmResetForm.insertBefore(alertDiv, confirmResetForm.firstChild);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    function validarPassword(password) {
        const minLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return minLength && hasUpperCase && hasNumber && hasSpecial;
    }

    confirmResetForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!validarPassword(password)) {
            mostrarMensaje('La contraseña no cumple con los requisitos mínimos de seguridad.');
            return;
        }

        if (password !== confirmPassword) {
            mostrarMensaje('Las contraseñas no coinciden.');
            return;
        }

        const submitButton = confirmResetForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';

        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) {
                throw error;
            }

            mostrarMensaje('Contraseña actualizada exitosamente. Redirigiendo...', 'success');
            
            // Esperar 2 segundos antes de redirigir
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error al actualizar la contraseña:', error.message);
            mostrarMensaje(`Error: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Guardar nueva contraseña';
        }
    });
});