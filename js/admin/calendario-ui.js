// Módulo para la interfaz de usuario del calendario
console.log('[Calendario UI] Iniciando módulo...');

// Registrar menú del módulo académico (se mostrará en el sidebar)
try {
    if (window && typeof window.registerModuleMenu === 'function') {
        window.registerModuleMenu('academico', [
            { section: 'calendario', label: 'Calendario Escolar', icon: 'bi bi-calendar' },
            { section: 'horarios', label: 'Horarios de Clase', icon: 'bi bi-clock' },
            { section: 'calificaciones', label: 'Calificaciones', icon: 'bi bi-journal-check' },
            { section: 'asistencias', label: 'Control de Asistencia', icon: 'bi bi-person-check' }
        ]);
    }
} catch (e) { console.error('Error registrando menú academico', e); }

import { obtenerEventos, crearEvento, actualizarEvento, eliminarEvento, validarEvento } from './calendario-escolar.js';
import { supabase, mostrarError, mostrarExito } from '../auth.js';

console.log('[Calendario UI] Imports completados');

// Variable global para el calendario
let calendario = null;

// Función para cargar eventos en el calendario
export async function cargarEventosCalendario(container) {
    console.log('[Calendario UI] Iniciando carga de calendario...');
    try {
        console.log('[Calendario UI] Verificando dependencias:', {
            FullCalendar: window.FullCalendar ? 'Cargado' : 'No cargado',
            jQuery: window.jQuery ? 'Cargado' : 'No cargado',
            bootstrap: window.bootstrap ? 'Cargado' : 'No cargado'
        });
        // Preparar la interfaz
        container.innerHTML = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Calendario Escolar</h5>
                    <button class="btn btn-primary" id="btnNuevoEvento">
                        <i class="bi bi-plus-circle"></i> Nuevo Evento
                    </button>
                </div>
                <div class="card-body">
                    <div id="calendario"></div>
                </div>
            </div>

            <!-- Modal para Eventos -->
            <div class="modal fade" id="modalEvento" tabindex="-1" aria-labelledby="modalEventoLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="modalEventoLabel">Nuevo Evento</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="formEvento">
                            <div class="modal-body">
                                <input type="hidden" id="eventoId" name="eventoId">
                                <div class="mb-3">
                                    <label for="eventoTitulo" class="form-label">Título</label>
                                    <input type="text" class="form-control" id="eventoTitulo" name="eventoTitulo" required>
                                </div>
                                <div class="mb-3">
                                    <label for="eventoDescripcion" class="form-label">Descripción</label>
                                    <textarea class="form-control" id="eventoDescripcion" name="eventoDescripcion" rows="3"></textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="tipoEvento" class="form-label">Tipo de Evento</label>
                                    <select class="form-select" id="tipoEvento" name="tipoEvento" required>
                                        <option value="actividad">Actividad</option>
                                        <option value="clase">Clase</option>
                                        <option value="evaluacion">Evaluación</option>
                                        <option value="reunion">Reunión</option>
                                        <option value="feriado">Feriado</option>
                                        <option value="academico">Académico</option>
                                        <option value="conmemorativo">Conmemorativo</option>
                                        <option value="extracurricular">Extracurricular</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="eventoInicio" class="form-label">Fecha de Inicio</label>
                                    <input type="datetime-local" class="form-control" id="eventoInicio" name="eventoInicio" required>
                                </div>
                                <div class="mb-3">
                                    <label for="eventoFin" class="form-label">Fecha de Fin</label>
                                    <input type="datetime-local" class="form-control" id="eventoFin" name="eventoFin" required>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-danger me-auto" id="btnEliminarEvento">Eliminar</button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                <button type="submit" class="btn btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Cargar eventos
        console.log('[Calendario UI] Obteniendo eventos...');
        const eventos = await obtenerEventos();
        console.log('[Calendario UI] Eventos obtenidos:', eventos);

        // Formatear eventos para el calendario
        const eventosCalendario = eventos.map(evento => ({
            id: evento.id,
            title: evento.titulo,
            start: evento.fecha_inicio,
            end: evento.fecha_fin || evento.fecha_inicio,
            allDay: true,
            className: obtenerClaseEvento(evento.tipo_evento),
            extendedProps: {
                tipo: evento.tipo_evento
            }
        }));

        // Inicializar calendario
        console.log('[Calendario UI] Preparando inicialización del calendario...');
        const calendarEl = document.getElementById('calendario');
        if (!calendarEl) {
            console.error('[Calendario UI] Elemento del calendario no encontrado');
            throw new Error('Elemento del calendario no encontrado');
        }
        console.log('[Calendario UI] Elemento del calendario encontrado:', calendarEl);
        calendario = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'es',
            themeSystem: 'bootstrap5',
            height: 'auto',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            initialView: 'dayGridMonth',
            locale: 'es',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: eventosCalendario,
            editable: true,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            select: function(info) {
                mostrarModalEvento({
                    fecha: info.start,
                    modo: 'crear'
                });
            },
            eventClick: async function(info) {
                // Obtener el evento completo de la base de datos
                const { data: eventos } = await supabase
                    .from('calendario_escolar')
                    .select('*')
                    .eq('id', info.event.id)
                    .single();

                if (eventos) {
                    mostrarModalEvento({
                        id: eventos.id,
                        titulo: eventos.titulo,
                        descripcion: eventos.descripcion,
                        fecha_inicio: eventos.fecha_inicio,
                        fecha_fin: eventos.fecha_fin,
                        tipo_evento: eventos.tipo_evento,
                        modo: 'editar'
                    });
                }
            },
            eventDrop: async function(info) {
                try {
                    await actualizarEvento(info.event.id, {
                        titulo: info.event.title,
                        fecha_inicio: info.event.start,
                        fecha_fin: info.event.end || info.event.start,
                        tipo_evento: info.event.extendedProps.tipo,
                        estado: 'activo'
                    });
                } catch (error) {
                    info.revert();
                }
            }
        });

        calendario.render();

        // Configurar eventos de botones
        document.getElementById('btnNuevoEvento').addEventListener('click', () => {
            mostrarModalEvento({
                fecha: new Date(),
                modo: 'crear'
            });
        });

    } catch (error) {
        console.error('Error al cargar calendario:', error);
        mostrarError('Error al cargar el calendario');
    }
}

// Función para mostrar el modal de evento
function mostrarModalEvento(datos) {
    const modalElement = document.getElementById('modalEvento');
    if (!modalElement) {
        console.error('Modal no encontrado en el DOM');
        return;
    }

    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) {
        modal = new bootstrap.Modal(modalElement);
    }

    const form = document.getElementById('formEvento');
    const titulo = document.getElementById('modalEventoLabel');
    
    if (!form || !titulo) {
        console.error('Elementos del formulario no encontrados');
        return;
    }
    
    // Configurar título del modal
    titulo.textContent = datos.modo === 'crear' ? 'Nuevo Evento' : 'Editar Evento';
    
    // Llenar formulario
    form.eventoId.value = datos.id || '';
    form.eventoTitulo.value = datos.titulo || datos.title || '';
    form.eventoDescripcion.value = datos.descripcion || '';
    form.tipoEvento.value = datos.tipo_evento || 'actividad';
    form.eventoInicio.value = formatearFecha(datos.fecha_inicio || datos.start, true);
    form.eventoFin.value = formatearFecha(datos.fecha_fin || datos.end || datos.fecha_inicio || datos.start, true);
    
    // Mostrar/ocultar botón eliminar
    document.getElementById('btnEliminarEvento').style.display = 
        datos.modo === 'editar' ? 'block' : 'none';
    
    // Configurar eventos del modal
    form.onsubmit = async (e) => {
        e.preventDefault();
        await guardarEvento();
    };

    document.getElementById('btnEliminarEvento').onclick = async () => {
        if (confirm('¿Está seguro de eliminar este evento?')) {
            await eliminarEventoCalendario(datos.id);
        }
    };
    
    modal.show();
}

// Función para guardar evento desde el formulario
async function guardarEvento() {
    try {
        const form = document.getElementById('formEvento');
        const evento = {
            titulo: form.eventoTitulo.value.trim(),
            descripcion: form.eventoDescripcion.value.trim(),
            fecha_inicio: form.eventoInicio.value,
            fecha_fin: form.eventoFin.value,
            tipo_evento: form.tipoEvento.value,
            estado: 'activo'
        };

        // Validar evento
        const errores = validarEvento(evento);
        if (errores.length > 0) {
            throw new Error(errores.join('\n'));
        }

        if (form.eventoId.value) {
            // Actualizar evento existente
            await actualizarEvento(form.eventoId.value, evento);
        } else {
            // Crear nuevo evento
            await crearEvento(evento);
        }

        // Cerrar modal y recargar calendario
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEvento'));
        modal.hide();
        calendario.refetchEvents();

    } catch (error) {
        console.error('Error al guardar evento:', error);
        mostrarError(error.message);
    }
}

// Función para eliminar evento
async function eliminarEventoCalendario(id) {
    try {
        await eliminarEvento(id);
        
        // Cerrar modal y recargar calendario
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEvento'));
        modal.hide();
        calendario.refetchEvents();

    } catch (error) {
        console.error('Error al eliminar evento:', error);
        mostrarError(error.message);
    }
}

// Función para obtener la clase CSS según el tipo de evento
function obtenerClaseEvento(tipo) {
    switch (tipo) {
        case 'clase':
            return 'bg-primary';
        case 'evaluacion':
            return 'bg-danger';
        case 'reunion':
            return 'bg-info';
        case 'actividad':
            return 'bg-success';
        case 'feriado':
            return 'bg-warning';
        case 'academico':
            return 'bg-purple';
        case 'conmemorativo':
            return 'bg-orange';
        case 'extracurricular':
            return 'bg-teal';
        default:
            return 'bg-secondary';
    }
}

// Función para formatear fecha
function formatearFecha(fecha, incluirHora = true) {
    if (!fecha) return '';
    const f = new Date(fecha);
    
    // Asegurarse de que la fecha esté en la zona horaria local
    const offset = f.getTimezoneOffset();
    const fLocal = new Date(f.getTime() - (offset * 60 * 1000));
    
    return incluirHora ? 
        fLocal.toISOString().slice(0, 16) : // Con hora (YYYY-MM-DDTHH:mm)
        fLocal.toISOString().slice(0, 10);  // Solo fecha (YYYY-MM-DD)
}