// Gestión de usuarios
import auth, { supabase, mostrarError, mostrarExito } from './auth.js';

// Versión del módulo
const VERSION = '1.0.6';

// Configuración
const CONFIG = {
    baseUrl: 'https://lunrriztthihxlvjyiys.functions.supabase.co',  // URL de Supabase Edge Functions
    defaultRedirect: '/login.html'
};

// Inicializar eventos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM y event listeners
    const btnGuardarUsuario = document.getElementById('btnGuardarUsuario');
    const usuariosLink = document.querySelector('.nav-link[data-section="usuarios"]');
    
    if (btnGuardarUsuario) {
        btnGuardarUsuario.addEventListener('click', handleNuevoUsuario);
    }
    
    if (usuariosLink) {
        usuariosLink.addEventListener('click', cargarListaUsuarios);
    }
});

// Función para crear nuevo usuario
async function handleNuevoUsuario() {
    try {
        const email = document.getElementById('email').value.trim();
        const rol = document.getElementById('rol').value;
        const perfilId = document.getElementById('perfil').value;
        
        // Validación del email
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!email || !emailRegex.test(email)) {
            mostrarError('Por favor, ingrese un email válido (ejemplo: usuario@dominio.com)');
            return;
        }

        console.log('Verificando email:', email);

        try {
            // 1. Verificar si el email existe en la tabla usuarios
            const { data: existingUsers, error: checkError } = await supabase
                .from('usuarios')
                .select('id, email')
                .eq('email', email.toLowerCase());

            if (checkError) {
                console.error('Error al verificar email en tabla usuarios:', checkError);
                throw checkError;
            }

            if (existingUsers && existingUsers.length > 0) {
                console.log('Usuario existente encontrado en tabla usuarios:', existingUsers);
                // Intentar limpiar datos inconsistentes
                try {
                    const { error: deleteError } = await supabase
                        .from('usuarios')
                        .delete()
                        .eq('email', email.toLowerCase());
                    
                    if (deleteError) {
                        console.error('Error al limpiar registro inconsistente:', deleteError);
                        mostrarError('Error al limpiar datos inconsistentes. Por favor, contacte al administrador.');
                        return;
                    } else {
                        console.log('Registro inconsistente limpiado con éxito');
                    }
                } catch (cleanupError) {
                    console.error('Error durante la limpieza:', cleanupError);
                    mostrarError('Error al limpiar datos inconsistentes. Por favor, contacte al administrador.');
                    return;
                }
            }

            console.log('Continuando con la creación del usuario...');
            
        } catch (error) {
            console.error('Error al verificar disponibilidad del email:', error);
            throw error;
        }

        // Normalizar el rol
        if (!rol) {
            mostrarError('Por favor, seleccione un rol');
            return;
        }

        // Convertir 'Administrador' a 'admin'
        const rolNormalizado = rol.toLowerCase() === 'administrador' ? 'admin' : rol.toLowerCase();
        console.log('Rol normalizado:', rolNormalizado);

        // Verificar si el usuario actual es administrador
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
            throw new Error('No hay sesión activa');
        }

        // Obtener rol del usuario actual
        const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id', sessionData.session.user.id)
            .single();

        if (userError || userData?.rol !== 'admin') {
            throw new Error('No tiene permisos para crear usuarios');
        }

        // Generar contraseña temporal
        const password = generateTemporaryPassword();

        // 1. Obtener token de la sesión actual
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!currentSession) {
            throw new Error('No hay sesión activa');
        }

        // 2. Llamar a la Edge Function para crear el usuario
        const requestData = {
            action: 'create',
            email: email.toLowerCase(),
            password: password,
            rol: rolNormalizado,
            perfilId: perfilId
        };
        
        console.log('Datos de la solicitud:', requestData);
        
        const response = await fetch(`${CONFIG.baseUrl}/user-management`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentSession.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        console.log('Respuesta del servidor:', result);
        
        if (!response.ok) {
            const errorMessage = result.error || 'Error al crear usuario';
            console.error('Error detallado:', {
                status: response.status,
                statusText: response.statusText,
                error: result
            });
            
            if (errorMessage.includes('email ya está registrado')) {
                mostrarError(errorMessage);
                return;
            }
            throw new Error(errorMessage);
        }

        const userId = result.userId;

        // El registro en la tabla usuarios ya se creó en la Edge Function
        
        // 3. Registrar actividad
        await registrarActividad('crear_usuario', userId);

        // 4. Mostrar modal con la contraseña temporal
        const passwordModalHtml = `
            <div class="modal fade" id="passwordModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Usuario Creado Exitosamente</h5>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-success">
                                <p>El usuario ha sido creado con éxito.</p>
                                <p class="mb-0"><strong>Email:</strong> ${email}</p>
                                <p class="mb-0"><strong>Contraseña temporal:</strong> ${password}</p>
                            </div>
                            <div class="alert alert-warning">
                                <p class="mb-0">Por favor, guarde o comparta esta contraseña de forma segura con el usuario.
                                El usuario deberá cambiarla en su primer inicio de sesión.</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="copyToClipboard('${password}')">Copiar Contraseña</button>
                            <button type="button" class="btn btn-primary" onclick="closePasswordModal()">Entendido</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Eliminar modal anterior si existe
        const oldPasswordModal = document.getElementById('passwordModal');
        if (oldPasswordModal) {
            oldPasswordModal.remove();
        }

        // Agregar nuevo modal al DOM
        const modalWrapper = document.createElement('div');
        modalWrapper.innerHTML = passwordModalHtml;
        document.body.appendChild(modalWrapper);

        // Cerrar modal de creación
        const createModal = bootstrap.Modal.getInstance(document.getElementById('nuevoUsuarioModal'));
        if (createModal) {
            createModal.hide();
        }

        // Mostrar modal de contraseña
        const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
        passwordModal.show();

        await cargarListaUsuarios();

    } catch (error) {
        console.error('Error al crear usuario:', error);
        mostrarError(error.message);
    }
}

// Función para cargar lista de usuarios
async function cargarListaUsuarios() {
    try {
        const { data: usuarios, error } = await supabase
            .from('usuarios_con_perfiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const usuariosSection = document.getElementById('usuariosSection');
        if (!usuariosSection) return;

        const template = document.createElement('template');
        template.innerHTML = `
            <div class="card">
                <div class="position-absolute top-0 end-0 p-2">
                    <small class="text-muted">v${VERSION}</small>
                </div>
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Gestión de Usuarios</h5>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#nuevoUsuarioModal">
                        <i class="bi bi-person-plus"></i> Nuevo Usuario
                    </button>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Perfil</th>
                                    <th>Fecha de Creación</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${usuarios.map(usuario => `
                                    <tr>
                                        <td>${usuario.email}</td>
                                        <td><span class="badge bg-${getRolBadgeColor(usuario.rol)}">${usuario.rol}</span></td>
                                        <td><span class="badge bg-secondary">${usuario.perfil_nombre || 'Sin perfil'}</span></td>
                                        <td>${new Date(usuario.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <button class="btn btn-sm btn-info me-1" onclick="editarUsuario('${usuario.id}')">
                                                <i class="bi bi-pencil"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${usuario.id}')">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `.trim();
        
        usuariosSection.innerHTML = '';
        usuariosSection.appendChild(template.content);

    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        mostrarError('Error al cargar la lista de usuarios');
    }
}

// Función para editar usuario
async function editarUsuario(userId) {
    try {
        const { data: usuario, error } = await supabase
            .from('usuarios_con_perfiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Obtener lista de perfiles para el selector
        const { data: perfiles, error: perfilesError } = await supabase
            .from('perfiles')
            .select('*')
            .order('nombre');

        if (perfilesError) throw perfilesError;

        // Eliminar modal anterior si existe
        const modalAnterior = document.getElementById('editarUsuarioModal');
        if (modalAnterior) {
            modalAnterior.remove();
        }

        // Crear y mostrar modal de edición
        const modalHtml = `
            <div class="modal fade" id="editarUsuarioModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Editar Usuario</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="formEditarUsuario">
                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" value="${usuario.email}" disabled>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Rol</label>
                                    <select class="form-select" id="editRol">
                                        <option value="admin" ${usuario.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                                        <option value="profesor" ${usuario.rol === 'profesor' ? 'selected' : ''}>Profesor</option>
                                        <option value="estudiante" ${usuario.rol === 'estudiante' ? 'selected' : ''}>Estudiante</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Perfil</label>
                                    <select class="form-select" id="editPerfil">
                                        <option value="">Sin perfil</option>
                                        ${perfiles.map(p => `
                                            <option value="${p.id}" ${p.id === usuario.perfil_id ? 'selected' : ''}>
                                                ${p.nombre}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="guardarCambiosUsuario('${userId}')">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar modal al DOM
        const modalWrapper = document.createElement('div');
        modalWrapper.innerHTML = modalHtml;
        document.body.appendChild(modalWrapper);

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('editarUsuarioModal'));
        modal.show();

        // Limpiar modal cuando se cierre
        document.getElementById('editarUsuarioModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });

    } catch (error) {
        console.error('Error al editar usuario:', error);
        mostrarError('Error al editar usuario');
    }
}

// Función para guardar cambios del usuario
async function guardarCambiosUsuario(userId) {
    try {
        const rol = document.getElementById('editRol').value;
        const perfilId = document.getElementById('editPerfil').value || null;

        const { error } = await supabase
            .from('usuarios')
            .update({ 
                rol: rol,
                perfil_id: perfilId
            })
            .eq('id', userId);

        if (error) throw error;

        // Registrar actividad
        await registrarActividad('editar_usuario', userId);

        // Cerrar modal y actualizar lista
        const modal = bootstrap.Modal.getInstance(document.getElementById('editarUsuarioModal'));
        if (modal) {
            modal.hide();
        }
        
        await cargarListaUsuarios();
        mostrarExito('Usuario actualizado exitosamente');
    } catch (error) {
        console.error('Error al guardar cambios:', error);
        mostrarError('Error al guardar los cambios');
    }
}

// Función para eliminar usuario
async function eliminarUsuario(userId) {
    if (!confirm('¿Está seguro de que desea eliminar este usuario?')) return;

    try {
        // 1. Obtener token de la sesión actual
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!currentSession) {
            throw new Error('No hay sesión activa');
        }

        // 2. Llamar a la Edge Function para eliminar el usuario
        const response = await fetch(`${CONFIG.baseUrl}/user-management`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentSession.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'delete',
                userId: userId
            })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Error al eliminar usuario');
        }

        // 2. Eliminar registro de tabla usuarios
        const { error: userError } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', userId);

        if (userError) throw userError;

        // 3. Registrar actividad
        await registrarActividad('eliminar_usuario', userId);

        // 4. Actualizar lista y mostrar mensaje
        await cargarListaUsuarios();
        mostrarExito('Usuario eliminado exitosamente');

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        mostrarError('Error al eliminar usuario: ' + error.message);
    }
}

// Funciones auxiliares
function generateTemporaryPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map(x => chars[x % chars.length])
        .join('');
}

function getRolBadgeColor(rol) {
    switch(rol) {
        case 'admin': return 'danger';
        case 'profesor': return 'success';
        case 'estudiante': return 'info';
        default: return 'secondary';
    }
}

async function registrarActividad(tipo, usuarioId, detalles = {}) {
    try {
        await supabase
            .from('actividad')
            .insert([{
                usuario_id: usuarioId,
                tipo_accion: tipo,
                detalles: detalles
            }]);
    } catch (error) {
        console.error('Error al registrar actividad:', error);
    }
}

// Función para copiar al portapapeles
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        const copyBtn = document.querySelector('#passwordModal button.btn-secondary');
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '¡Copiado!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    } catch (err) {
        console.error('Error al copiar:', err);
    }
}

// Función para cerrar el modal de contraseña
function closePasswordModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('passwordModal'));
    if (modal) {
        modal.hide();
        // Limpiar modal después de cerrar
        document.getElementById('passwordModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }
}

// Exportar funciones para uso global
window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.guardarCambiosUsuario = guardarCambiosUsuario;
window.copyToClipboard = copyToClipboard;
window.closePasswordModal = closePasswordModal;