// Dashboard Coordinador
import { cargarEventosCalendario } from './calendario-ui.js';
import { cargarPublicacionesUI } from './publicaciones-ui.js';
import { cargarHorariosUI } from './horarios-ui.js';
import { inicializarModuloImagenes } from './imagenes.js';
import { cargarCalificaciones } from './modules/calificaciones.js';
import { mostrarError, mostrarExito, formatearEstadoAsistencia, formatearFecha } from './utils.js';

const VERSION = '1.0.32';

// Importar librerías externas
const importarLibrerias = async () => {
    await import('https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js');
    await import('https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js');
    await import('https://cdn.jsdelivr.net/npm/chart.js');
};

// Importar cliente Supabase
import { supabase } from './supabase.js';

// Configuración de tablas y campos
const TABLAS = {
    asistencias: {
        nombre: 'asistencias',
        campos: ['id', 'estudiante_id', 'fecha', 'estado', 'materia', 'created_at', 'updated_at']
    },
    publicaciones: {
        nombre: 'publicaciones',
        campos: ['id', 'titulo', 'contenido', 'tipo', 'fecha_publicacion', 'fecha_vigencia', 'estado', 'created_by', 'updated_at']
    },
    horario_escolar: {
        nombre: 'horario_escolar',
        campos: ['id', 'curso_id', 'dia_semana', 'hora_inicio', 'hora_fin', 'asignatura_id', 'docente_id', 'aula']
    },
    calendario_escolar: {
        nombre: 'calendario_escolar',
        campos: ['id', 'titulo', 'descripcion', 'fecha_inicio', 'fecha_fin', 'tipo_evento', 'estado']
    },
    calificaciones: {
        nombre: 'calificaciones',
        campos: ['id', 'alumno_id', 'asignatura_id', 'evaluacion_id', 'nota', 'fecha', 'observacion']
    }
};

// Configuración
const CONFIG = {
    permisosEdicion: ['calendario', 'avisos', 'horarios', 'calificaciones', 'asistencias', 'imagenes'],
    permisosSoloLectura: [],
    tiposPublicacion: ['aviso', 'noticia', 'circular'],
    estadosAsistencia: ['Presente', 'Ausente', 'Tardanza', 'Justificado'],
    diasSemana: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    tiposEvento: ['clase', 'reunion', 'evaluacion', 'actividad', 'feriado']
};

// Contenedor actual para refrescos desde CRUD
let lastMainContainer = null;

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', async () => {
    await importarLibrerias();
    inicializarDashboard();
    document.getElementById('btnLogout')?.addEventListener('click', handleLogout);
});

// Función para inicializar el dashboard
async function inicializarDashboard() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '../login.html';
            return;
        }

        // Verificar rol y perfil
        const { data: usuario, error } = await supabase
            .from('usuarios_con_perfiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || usuario?.perfil_id !== 2) { // ID 2 = Coordinador
            throw new Error('No tiene permisos para acceder a este dashboard');
        }

        // Configurar eventos de navegación
        configurarNavegacion();

        // Cargar sección inicial
        cargarSeccion('calendario');

    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
        console.error('Detalles del error:', {
            tipo: error.name,
            mensaje: error.message,
            stack: error.stack,
            codigo: error.code,
            detalles: error.details
        });
        alert('Error al inicializar: ' + error.message);
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);
    }
}

// Función para configurar la navegación
function configurarNavegacion() {
    // Navegación del sidebar
    document.querySelectorAll('.nav-section-items a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover clase active de todos los enlaces
            document.querySelectorAll('.nav-section-items a').forEach(l => l.classList.remove('active'));
            
            // Agregar clase active al enlace clickeado
            link.classList.add('active');
            
            const seccion = link.dataset.section;
            cargarSeccion(seccion);
            
            // Cerrar sidebar en móviles
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth < 992) {
                const offcanvas = bootstrap.Offcanvas.getInstance(sidebar);
                if (offcanvas) offcanvas.hide();
            }
        });
    });
    
    // Delegación de eventos para botones dinámicos del dashboard
    document.addEventListener('click', (e) => {
        if (e.target.matches('button[data-section]') || e.target.closest('button[data-section]')) {
            const button = e.target.matches('button[data-section]') ? e.target : e.target.closest('button[data-section]');
            const seccion = button.dataset.section;
            
            // Actualizar navegación del sidebar
            document.querySelectorAll('.nav-section-items a').forEach(l => l.classList.remove('active'));
            const sidebarLink = document.querySelector(`.nav-section-items a[data-section="${seccion}"]`);
            if (sidebarLink) {
                sidebarLink.classList.add('active');
            }
            
            cargarSeccion(seccion);
        }
    });
    
    // Cargar dashboard por defecto
    cargarSeccion('dashboard');
    
    // Marcar dashboard como activo
    const dashboardLink = document.querySelector('.nav-section-items a[data-section="dashboard"]');
    if (dashboardLink) {
        dashboardLink.classList.add('active');
    }
}

// Función para cargar una sección
async function cargarSeccion(seccion) {
    try {
        const mainContent = document.getElementById('mainContent');
        lastMainContainer = mainContent;
        if (!mainContent) return;

        // Determinar si el usuario puede editar esta sección
        const puedeEditar = CONFIG.permisosEdicion.includes(seccion);

        // Cargar datos según la sección
        switch (seccion) {
            case 'dashboard':
                await cargarDashboardPrincipal(mainContent);
                break;
            case 'calendario':
                await cargarEventosCalendario(mainContent);
                break;
            case 'imagenes':
                await inicializarModuloImagenes(mainContent);
                break;
            case 'avisos':
                await cargarAvisos(mainContent, puedeEditar);
                break;
            case 'horarios':
                await cargarHorariosUI(mainContent, puedeEditar);
                break;
            case 'calificaciones':
                await cargarCalificaciones(mainContent);
                break;
            case 'asistencias':
                await cargarAsistencias(mainContent, false); // Solo lectura
                break;
            case 'documentos':
                await cargarDocumentos(mainContent);
                break;
            case 'productos':
                await cargarProductos(mainContent);
                break;
            case 'unidades':
                await cargarUnidades(mainContent);
                break;
            case 'reportes-academicos':
                await cargarReportesAcademicos(mainContent);
                break;
            case 'estadisticas':
                await cargarEstadisticas(mainContent);
                break;
            default:
                mainContent.innerHTML = '<div class="alert alert-warning">Sección no encontrada</div>';
        }
    } catch (error) {
        console.error(`Error al cargar sección ${seccion}:`, error);
        mostrarError(`Error al cargar la sección ${seccion}`);
    }
}

// Funciones para cargar cada sección
async function cargarAvisos(container, puedeEditar) {
    await cargarPublicacionesUI(container);
}

async function cargarHorarios(container, puedeEditar) {
    console.log('[Dashboard Coordinador] Cargando sección de horarios...');
    await cargarHorariosUI(container);
}

async function cargarAsistencias(container, puedeEditar) {
    try {
        // Preparar la interfaz
        container.innerHTML = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Control de Asistencias</h5>
                    <button class="btn btn-primary btn-sm" id="btnNuevaAsistencia">
                        <i class="bi bi-plus-circle"></i> Nueva Asistencia
                    </button>
                </div>
                <div class="card-body">
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card bg-primary text-white">
                                <div class="card-body">
                                    <h6>Asistencia General</h6>
                                    <h2 id="porcentajeAsistencia">---%</h2>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-8">
                            <canvas id="graficoAsistencia"></canvas>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-striped" id="tablaAsistencias">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Código</th>
                                    <th>Estudiante</th>
                                    <th>Grado</th>
                                    <th>Materia</th>
                                    <th>Estado</th>
                                    <th>Registrado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Obtener datos
        const { data: asistencias, error: errorAsistencias } = await supabase
            .from('asistencias')
            .select(`
                id,
                fecha,
                estado,
                materia,
                created_at,
                estudiante:estudiante_id(
                    codigo_estudiante,
                    grado,
                    seccion,
                    persona:persona_id(
                        nombre,
                        apellido
                    )
                )
            `)
            .order('fecha', { ascending: false });

        if (errorAsistencias) throw errorAsistencias;
        if (!asistencias) throw new Error('No se pudieron obtener las asistencias');

        // Configurar DataTable
        const tabla = new DataTable('#tablaAsistencias', {
            data: asistencias.map(a => ({
                fecha: formatearFecha(a.fecha, false),
                alumno: `${a.estudiante.persona.nombre} ${a.estudiante.persona.apellido}`,
                codigo: a.estudiante.codigo_estudiante,
                grado: `${a.estudiante.grado} - ${a.estudiante.seccion}`,
                materia: a.materia,
                estado: formatearEstadoAsistencia(a.estado),
                fecha_registro: formatearFecha(a.created_at),
                acciones: `
                    <button class="btn btn-sm btn-outline-primary btn-editar" data-id="${a.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${a.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                `
            })),
            columns: [
                { data: 'fecha', title: 'Fecha' },
                { data: 'codigo', title: 'Código' },
                { data: 'alumno', title: 'Estudiante' },
                { data: 'grado', title: 'Grado' },
                { data: 'materia', title: 'Materia' },
                { data: 'estado', title: 'Estado' },
                { data: 'fecha_registro', title: 'Registrado' },
                { data: 'acciones', title: 'Acciones' }
            ],
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json'
            },
            responsive: true,
            order: [[0, 'desc'], [1, 'asc']]
        });

        // Calcular estadísticas
        const total = asistencias.length;
        const presentes = asistencias.filter(a => a.estado === 'Presente').length;
        const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;

        // Actualizar indicador
        document.getElementById('porcentajeAsistencia').textContent = `${porcentaje}%`;

        // Crear gráfico
        const stats = {
            'Presente': asistencias.filter(a => a.estado === 'Presente').length,
            'Ausente': asistencias.filter(a => a.estado === 'Ausente').length,
            'Justificado': asistencias.filter(a => a.estado === 'Justificado').length,
            'Tardanza': asistencias.filter(a => a.estado === 'Tardanza').length
        };

        new Chart(document.getElementById('graficoAsistencia'), {
            type: 'bar',
            data: {
                labels: Object.keys(stats),
                datasets: [{
                    label: 'Asistencias por Estado',
                    data: Object.values(stats),
                    backgroundColor: [
                        '#28a745', // Verde para Presente
                        '#dc3545', // Rojo para Ausente
                        '#ffc107', // Amarillo para Justificado
                        '#17a2b8'  // Azul para Tardanza
                    ]
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        // Eventos
        document.getElementById('btnNuevaAsistencia').addEventListener('click', () => {
            mostrarModalAsistencia();
        });

        tabla.on('click', '.btn-editar', function() {
            const id = this.dataset.id;
            editarAsistencia(id);
        });

        tabla.on('click', '.btn-eliminar', function() {
            const id = this.dataset.id;
            eliminarAsistencia(id);
        });

    } catch (error) {
        console.error('Error al cargar asistencias:', error);
        mostrarError('Error al cargar las asistencias');
    }
}

// Función para cerrar sesión
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Usar la ubicación base del sitio
        const baseUrl = window.location.pathname.split('/admin/')[0];
        window.location.href = `${baseUrl}/login.html`;
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        mostrarError('Error al cerrar sesión');
    }
}

// Función para cargar el dashboard principal
async function cargarDashboardPrincipal(container) {
    try {
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <h2 class="mb-0">
                            <i class="bi bi-speedometer2 me-2"></i>Dashboard Principal
                        </h2>
                        <div class="text-muted">
                            ${new Date().toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tarjetas de resumen -->
            <div class="row mb-4">
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="card-title">Estudiantes</h6>
                                    <h3 id="totalEstudiantes">-</h3>
                                </div>
                                <div class="align-self-center">
                                    <i class="bi bi-people fs-1"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="card-title">Docentes</h6>
                                    <h3 id="totalDocentes">-</h3>
                                </div>
                                <div class="align-self-center">
                                    <i class="bi bi-person-badge fs-1"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="card-title">Cursos</h6>
                                    <h3 id="totalCursos">-</h3>
                                </div>
                                <div class="align-self-center">
                                    <i class="bi bi-book fs-1"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="card-title">Eventos Hoy</h6>
                                    <h3 id="eventosHoy">-</h3>
                                </div>
                                <div class="align-self-center">
                                    <i class="bi bi-calendar-event fs-1"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Actividades Recientes</h5>
                        </div>
                        <div class="card-body">
                            <div id="actividadesRecientes">
                                <div class="d-flex justify-content-center p-4">
                                    <div class="spinner-border" role="status">
                                        <span class="visually-hidden">Cargando...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Accesos Rápidos</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-2">
                                <button class="btn btn-outline-primary" data-section="calendario">
                                    <i class="bi bi-calendar me-2"></i>Ver Calendario
                                </button>
                                <button class="btn btn-outline-success" data-section="horarios">
                                    <i class="bi bi-clock me-2"></i>Gestionar Horarios
                                </button>
                                <button class="btn btn-outline-info" data-section="calificaciones">
                                    <i class="bi bi-journal-check me-2"></i>Calificaciones
                                </button>
                                <button class="btn btn-outline-warning" data-section="asistencias">
                                    <i class="bi bi-person-check me-2"></i>Control Asistencia
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Cargar datos de resumen
        await cargarDatosDashboard();
        
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        mostrarError('Error al cargar el dashboard');
    }
}

// Función para cargar documentos
async function cargarDocumentos(container) {
    container.innerHTML = `
        <div class="row mb-4">
            <div class="col-12">
                <h2><i class="bi bi-file-earmark me-2"></i>Gestión de Documentos</h2>
            </div>
        </div>
        <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            Módulo de gestión de documentos en desarrollo.
        </div>
    `;
}

// Función para cargar reportes académicos
async function cargarReportesAcademicos(container) {
    container.innerHTML = `
        <div class="row mb-4">
            <div class="col-12">
                <h2><i class="bi bi-graph-up me-2"></i>Reportes Académicos</h2>
            </div>
        </div>
        <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            Módulo de reportes académicos en desarrollo.
        </div>
    `;
}

// Función para cargar la gestión de Productos
async function cargarProductos(container) {
    try {
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12 d-flex justify-content-between align-items-center">
                    <h2><i class="bi bi-bag-fill me-2"></i>Productos</h2>
                    <button class="btn btn-primary" id="btnNuevoProducto"><i class="bi bi-plus-circle"></i> Nuevo Producto</button>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped" id="tablaProductos">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>SKU</th>
                                    <th>Unidad (ID)</th>
                                    <th>Precio</th>
                                    <th>Activo</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Obtener unidades y mapear
        const { data: unidades, error: errorUnidades } = await supabase
            .from('unidades_medida')
            .select('id, nombre')
            .order('nombre', { ascending: true });

        if (errorUnidades) throw errorUnidades;

        const unidadesMap = {};
        (unidades || []).forEach(u => unidadesMap[u.id] = u.nombre);

        // Llenar select del modal de producto
        const selectUnidad = document.getElementById('productoUnidad');
        if (selectUnidad) {
            selectUnidad.innerHTML = '<option value="">-- Sin seleccionar --</option>' + (unidades || []).map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
        }

        // Obtener productos desde Supabase (usamos '*' para evitar errores por nombres de columna distintos)
        const { data: productosRaw, error } = await supabase
            .from('productos')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;

        // Normalizar nombres de campo posibles (unidad_medida_id, unidad_id, unidad)
        const productos = (productosRaw || []).map(p => ({
            id: p.id,
            nombre: p.nombre ?? p.name ?? null,
            sku: p.sku ?? p.codigo ?? null,
            precio: p.precio ?? p.price ?? null,
            unidad_medida_id: p.unidad_medida_id ?? p.unidad_id ?? p.unidad ?? null,
            activo: typeof p.activo !== 'undefined' ? p.activo : (p.enabled ?? true),
            descripcion: p.descripcion ?? p.description ?? null
        }));

        const tabla = new DataTable('#tablaProductos', {
            data: productosToTableData(productos || [], unidadesMap),
            columns: [
                { data: 'nombre', title: 'Nombre' },
                { data: 'sku', title: 'SKU' },
                { data: 'unidad', title: 'Unidad' },
                { data: 'precio', title: 'Precio' },
                { data: 'activo', title: 'Activo' },
                { data: 'acciones', title: 'Acciones' }
            ],
            responsive: true,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json' }
        });

        // Eventos del botón nuevo
        document.getElementById('btnNuevoProducto')?.addEventListener('click', () => {
            showProductoModal('new');
        });

        // Delegación para editar/eliminar en la tabla
        document.querySelector('#tablaProductos')?.addEventListener('click', async (e) => {
            const editar = e.target.closest('.btn-editar-producto');
            const eliminar = e.target.closest('.btn-eliminar-producto');
            if (editar) {
                const id = editar.dataset.id;
                await editarProducto(id);
            } else if (eliminar) {
                const id = eliminar.dataset.id;
                if (confirm('¿Eliminar este producto?')) {
                    const { error: errDel } = await supabase.from('productos').delete().eq('id', id);
                    if (errDel) return mostrarError('Error al eliminar producto');
                    mostrarExito('Producto eliminado');
                    await cargarProductos(lastMainContainer);
                }
            }
        });

    } catch (err) {
        console.error('Error al cargar productos:', err);
        mostrarError('Error al cargar productos');
    }
}

function productosToTableData(arr, unidadesMap = {}) {
    // Mapear productos a formato DataTable y reemplazar unidad por nombre
    return (arr || []).map(p => ({
        nombre: p.nombre,
        sku: p.sku || '-',
        unidad: unidadesMap[p.unidad_medida_id] || (p.unidad_medida_id || '-'),
        precio: p.precio != null ? p.precio : '-',
        activo: p.activo ? 'Sí' : 'No',
        acciones: `
            <button class="btn btn-sm btn-outline-primary btn-editar-producto" data-id="${p.id}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger btn-eliminar-producto" data-id="${p.id}"><i class="bi bi-trash"></i></button>
        `
    }));
}

// Función para cargar Unidades de Medida
async function cargarUnidades(container) {
    try {
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12 d-flex justify-content-between align-items-center">
                    <h2><i class="bi bi-rulers me-2"></i>Unidades de Medida</h2>
                    <button class="btn btn-primary" id="btnNuevaUnidad"><i class="bi bi-plus-circle"></i> Nueva Unidad</button>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped" id="tablaUnidades">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Símbolo</th>
                                    <th>Descripción</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const { data: unidades, error } = await supabase
            .from('unidades_medida')
            .select('id, nombre, simbolo, descripcion')
            .order('nombre', { ascending: true });

        if (error) throw error;

        const tabla = new DataTable('#tablaUnidades', {
            data: (unidades || []).map(u => ({
                nombre: u.nombre,
                simbolo: u.simbolo || '-',
                descripcion: u.descripcion || '-',
                acciones: `
                    <button class="btn btn-sm btn-outline-primary btn-editar-unidad" data-id="${u.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger btn-eliminar-unidad" data-id="${u.id}"><i class="bi bi-trash"></i></button>
                `
            })),
            columns: [
                { data: 'nombre', title: 'Nombre' },
                { data: 'simbolo', title: 'Símbolo' },
                { data: 'descripcion', title: 'Descripción' },
                { data: 'acciones', title: 'Acciones' }
            ],
            responsive: true,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json' }
        });

        document.getElementById('btnNuevaUnidad')?.addEventListener('click', () => {
            showUnidadModal('new');
        });

        // Delegación para editar/eliminar en la tabla de unidades
        document.querySelector('#tablaUnidades')?.addEventListener('click', async (e) => {
            const editar = e.target.closest('.btn-editar-unidad');
            const eliminar = e.target.closest('.btn-eliminar-unidad');
            if (editar) {
                const id = editar.dataset.id;
                await editarUnidad(id);
            } else if (eliminar) {
                const id = eliminar.dataset.id;
                if (confirm('¿Eliminar esta unidad de medida?')) {
                    const { error: errDel } = await supabase.from('unidades_medida').delete().eq('id', id);
                    if (errDel) return mostrarError('Error al eliminar unidad');
                    mostrarExito('Unidad eliminada');
                    await cargarUnidades(lastMainContainer);
                }
            }
        });

    } catch (err) {
        console.error('Error al cargar unidades de medida:', err);
        mostrarError('Error al cargar unidades de medida');
    }
}

// Función para cargar estadísticas
async function cargarEstadisticas(container) {
    container.innerHTML = `
        <div class="row mb-4">
            <div class="col-12">
                <h2><i class="bi bi-pie-chart me-2"></i>Estadísticas</h2>
            </div>
        </div>
        <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            Módulo de estadísticas en desarrollo.
        </div>
    `;
}

// Función para cargar datos del dashboard
async function cargarDatosDashboard() {
    try {
        // Simular carga de datos - aquí puedes conectar con Supabase
        document.getElementById('totalEstudiantes').textContent = '156';
        document.getElementById('totalDocentes').textContent = '28';
        document.getElementById('totalCursos').textContent = '12';
        document.getElementById('eventosHoy').textContent = '3';
        
        // Cargar actividades recientes
        document.getElementById('actividadesRecientes').innerHTML = `
            <div class="list-group list-group-flush">
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">Nueva calificación registrada</h6>
                        <small>Hace 2 horas</small>
                    </div>
                    <p class="mb-1">Se registró calificación para Matemáticas - 3° A</p>
                </div>
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">Evento agregado al calendario</h6>
                        <small>Hace 4 horas</small>
                    </div>
                    <p class="mb-1">Reunión de padres - 25 de octubre</p>
                </div>
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">Horario actualizado</h6>
                        <small>Ayer</small>
                    </div>
                    <p class="mb-1">Cambio de horario en Ciencias - 2° B</p>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
    }
}

// Exportar funciones necesarias
window.handleLogout = handleLogout;

/* ------------------ Modales y CRUD Productos / Unidades ------------------ */

// Mostrar modal producto: mode = 'new'|'edit'
function showProductoModal(mode = 'new', producto = null) {
    const modalEl = document.getElementById('modalProducto');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    document.getElementById('productoId').value = producto?.id || '';
    document.getElementById('productoNombre').value = producto?.nombre || '';
    document.getElementById('productoSKU').value = producto?.sku || '';
    document.getElementById('productoPrecio').value = producto?.precio != null ? producto.precio : '';
    document.getElementById('productoDescripcion').value = producto?.descripcion || '';
    document.getElementById('productoActivo').checked = producto?.activo ?? true;
    if (producto?.unidad_medida_id) document.getElementById('productoUnidad').value = producto.unidad_medida_id;

    // Mostrar/ocultar botón eliminar
    const btnEliminar = document.getElementById('btnEliminarProducto');
    if (btnEliminar) btnEliminar.style.display = mode === 'edit' ? 'inline-block' : 'none';
    modal.show();
}

async function editarProducto(id) {
    const { data: producto, error } = await supabase.from('productos').select('*').eq('id', id).single();
    if (error) return mostrarError('Error al obtener producto');
    showProductoModal('edit', producto);
}

// Form submit producto
document.getElementById('formProducto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('productoId').value;
    const payload = {
        nombre: document.getElementById('productoNombre').value.trim(),
        sku: document.getElementById('productoSKU').value.trim() || null,
        descripcion: document.getElementById('productoDescripcion').value.trim() || null,
        unidad_medida_id: document.getElementById('productoUnidad').value || null,
        precio: document.getElementById('productoPrecio').value ? Number(document.getElementById('productoPrecio').value) : null,
        activo: document.getElementById('productoActivo').checked
    };

    try {
        if (!payload.nombre) return mostrarError('El nombre del producto es requerido');
        if (id) {
            const { error } = await supabase.from('productos').update(payload).eq('id', id);
            if (error) throw error;
            mostrarExito('Producto actualizado');
        } else {
            const { error } = await supabase.from('productos').insert([payload]);
            if (error) throw error;
            mostrarExito('Producto creado');
        }
        bootstrap.Modal.getInstance(document.getElementById('modalProducto'))?.hide();
        await cargarProductos(lastMainContainer);
    } catch (err) {
        console.error(err);
        mostrarError('Error al guardar producto');
    }
});

// Eliminar desde modal
document.getElementById('btnEliminarProducto')?.addEventListener('click', async () => {
    const id = document.getElementById('productoId').value;
    if (!id) return;
    if (!confirm('¿Eliminar este producto?')) return;
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) return mostrarError('Error al eliminar producto');
    mostrarExito('Producto eliminado');
    bootstrap.Modal.getInstance(document.getElementById('modalProducto'))?.hide();
    await cargarProductos(lastMainContainer);
});

// Mostrar/editar unidades
function showUnidadModal(mode = 'new', unidad = null) {
    const modalEl = document.getElementById('modalUnidad');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    document.getElementById('unidadId').value = unidad?.id || '';
    document.getElementById('unidadNombre').value = unidad?.nombre || '';
    document.getElementById('unidadSimbolo').value = unidad?.simbolo || '';
    document.getElementById('unidadDescripcion').value = unidad?.descripcion || '';
    const btnEliminar = document.getElementById('btnEliminarUnidad');
    if (btnEliminar) btnEliminar.style.display = mode === 'edit' ? 'inline-block' : 'none';
    modal.show();
}

async function editarUnidad(id) {
    const { data, error } = await supabase.from('unidades_medida').select('*').eq('id', id).single();
    if (error) return mostrarError('Error al obtener unidad');
    showUnidadModal('edit', data);
}

// Form submit unidad
document.getElementById('formUnidad')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('unidadId').value;
    const payload = {
        nombre: document.getElementById('unidadNombre').value.trim(),
        simbolo: document.getElementById('unidadSimbolo').value.trim() || null,
        descripcion: document.getElementById('unidadDescripcion').value.trim() || null
    };
    try {
        if (!payload.nombre) return mostrarError('El nombre de la unidad es requerido');
        if (id) {
            const { error } = await supabase.from('unidades_medida').update(payload).eq('id', id);
            if (error) throw error;
            mostrarExito('Unidad actualizada');
        } else {
            const { error } = await supabase.from('unidades_medida').insert([payload]);
            if (error) throw error;
            mostrarExito('Unidad creada');
        }
        bootstrap.Modal.getInstance(document.getElementById('modalUnidad'))?.hide();
        await cargarUnidades(lastMainContainer);
    } catch (err) {
        console.error(err);
        mostrarError('Error al guardar unidad');
    }
});

// Eliminar unidad desde modal
document.getElementById('btnEliminarUnidad')?.addEventListener('click', async () => {
    const id = document.getElementById('unidadId').value;
    if (!id) return;
    if (!confirm('¿Eliminar esta unidad?')) return;
    const { error } = await supabase.from('unidades_medida').delete().eq('id', id);
    if (error) return mostrarError('Error al eliminar unidad');
    mostrarExito('Unidad eliminada');
    bootstrap.Modal.getInstance(document.getElementById('modalUnidad'))?.hide();
    await cargarUnidades(lastMainContainer);
});
