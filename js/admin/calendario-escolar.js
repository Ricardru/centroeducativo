// Módulo para gestionar el calendario escolar
console.log('[Calendario Escolar] Iniciando módulo...');

import { supabase, mostrarError, mostrarExito } from '../auth.js';

console.log('[Calendario Escolar] Imports completados');

// Función para obtener todos los eventos del calendario
export async function obtenerEventos() {
    console.log('[Calendario Escolar] Obteniendo eventos desde Supabase...');
    try {
        console.log('[Calendario Escolar] Verificando sesión...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('[Calendario Escolar] Error de sesión:', sessionError);
        } else if (!session) {
            console.warn('[Calendario Escolar] No hay sesión activa, pero intentando consulta pública...');
        } else {
            console.log('[Calendario Escolar] Sesión válida:', session.user.email);
        }

        console.log('[Calendario Escolar] Realizando consulta a la tabla calendario_escolar...');
        const { data, error } = await supabase
            .from('calendario_escolar')
            .select('id, titulo, descripcion, fecha_inicio, fecha_fin, tipo_evento, estado')
            .order('fecha_inicio', { ascending: true });

        console.log('[Calendario Escolar] Resultado de la consulta:', { data, error });

        if (error) {
            if (error.code === 'PGRST116') {
                console.error('[Calendario Escolar] La tabla calendario_escolar no existe');
                mostrarError('La tabla calendario_escolar no existe. Contacte al administrador.');
                return [];
            } else {
                throw error;
            }
        }
        
        return data || [];
    } catch (error) {
        console.error('[Calendario Escolar] Error al obtener eventos:', error.message);
        console.error('[Calendario Escolar] Detalles del error:', error);
        mostrarError(`Error al obtener los eventos: ${error.message}`);
        return [];
    }
}

// Función para crear un nuevo evento
export async function crearEvento(evento) {
    try {
        console.log('[Calendario Escolar] Intentando crear evento:', evento);
        
        // Verificar autenticación antes de intentar crear
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error('[Calendario Escolar] Error de sesión:', sessionError);
            throw new Error('Error de autenticación: ' + sessionError.message);
        }
        
        if (!session) {
            console.error('[Calendario Escolar] No hay sesión activa');
            throw new Error('No hay sesión activa. Por favor, inicie sesión nuevamente.');
        }
        
        console.log('[Calendario Escolar] Sesión válida, usuario:', session.user.email);

        const { data, error } = await supabase
            .from('calendario_escolar')
            .insert([{
                titulo: evento.titulo,
                fecha_inicio: evento.fecha_inicio,
                fecha_fin: evento.fecha_fin,
                descripcion: evento.descripcion,
                tipo_evento: evento.tipo_evento,
                estado: 'activo'
            }])
            .select();

        if (error) {
            console.error('[Calendario Escolar] Error de Supabase:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            
            if (error.code === '42501') {
                throw new Error('Error de permisos: La tabla calendario_escolar requiere políticas RLS actualizadas. Contacte al administrador del sistema.');
            } else if (error.code === 'PGRST116') {
                throw new Error('Error de tabla: La tabla calendario_escolar no existe. Contacte al administrador del sistema.');
            } else {
                throw new Error(`Error de base de datos: ${error.message} (Código: ${error.code})`);
            }
        }
        
        console.log('[Calendario Escolar] Evento creado exitosamente:', data[0]);
        mostrarExito('Evento creado exitosamente');
        return data[0];
    } catch (error) {
        console.error('Error al crear evento:', error.message);
        mostrarError(error.message || 'Error al crear el evento');
        throw error;
    }
}

// Función para actualizar un evento
export async function actualizarEvento(id, evento) {
    try {
        const { data, error } = await supabase
            .from('calendario_escolar')
            .update({
                titulo: evento.titulo,
                fecha_inicio: evento.fecha_inicio,
                fecha_fin: evento.fecha_fin,
                descripcion: evento.descripcion,
                tipo_evento: evento.tipo_evento,
                estado: evento.estado || 'activo'
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        mostrarExito('Evento actualizado exitosamente');
        return data[0];
    } catch (error) {
        console.error('Error al actualizar evento:', error.message);
        mostrarError('Error al actualizar el evento');
        throw error;
    }
}

// Función para eliminar un evento
export async function eliminarEvento(id) {
    try {
        const { error } = await supabase
            .from('calendario_escolar')
            .delete()
            .eq('id', id);

        if (error) throw error;
        mostrarExito('Evento eliminado exitosamente');
    } catch (error) {
        console.error('Error al eliminar evento:', error.message);
        mostrarError('Error al eliminar el evento');
        throw error;
    }
}

// Función para validar un evento
export function validarEvento(evento) {
    const errores = [];

    if (!evento.titulo?.trim()) {
        errores.push('El título es requerido');
    }

    if (!evento.fecha_inicio) {
        errores.push('La fecha de inicio es requerida');
    }

    if (!evento.fecha_fin) {
        errores.push('La fecha de fin es requerida');
    }

    if (evento.fecha_inicio && evento.fecha_fin && new Date(evento.fecha_inicio) > new Date(evento.fecha_fin)) {
        errores.push('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    if (!evento.tipo_evento) {
        errores.push('El tipo de evento es requerido');
    } else if (!['clase', 'evaluacion', 'reunion', 'actividad', 'feriado', 'academico', 'conmemorativo', 'extracurricular'].includes(evento.tipo_evento)) {
        errores.push('El tipo de evento no es válido');
    }

    return errores;
}