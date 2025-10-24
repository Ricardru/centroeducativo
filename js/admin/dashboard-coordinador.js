// Dashboard Coordinador
import { cargarEventosCalendario } from './calendario-ui.js';
import { cargarPublicacionesUI } from './publicaciones-ui.js';
import { cargarHorariosUI } from './horarios-ui.js';
import { inicializarModuloImagenes } from './imagenes.js';
import { cargarCalificaciones } from './modules/calificaciones.js';
import { mostrarError, mostrarExito, formatearEstadoAsistencia, formatearFecha } from './utils.js';

const VERSION = '1.0.34';

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

        // Mostrar nombre de usuario en la navbar (campo nombre o name)
        try {
            const userLabel = document.getElementById('navbarUserName');
            if (userLabel) userLabel.textContent = usuario?.nombre ?? usuario?.name ?? session.user.email ?? 'Usuario';
        } catch (e) { /* ignore */ }

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

    // Ocultar secciones de la barra lateral que no contienen enlaces a secciones implementadas
    try {
        const availableSections = [
            'dashboard','calendario','imagenes','avisos','horarios','calificaciones',
            'asistencias','documentos','productos','unidades','reportes-academicos','estadisticas'
        ];
        document.querySelectorAll('.nav-section').forEach(section => {
            const links = Array.from(section.querySelectorAll('.nav-section-items a[data-section]'));
            const anyVisible = links.some(a => availableSections.includes(a.dataset.section));
            if (!anyVisible) section.style.display = 'none';
        });
    } catch (e) { /* ignore */ }

    // ---- Mejoras de UI del sidebar: ocultar links no usados, collapse por seccion y toggle desde boton hamburguesa
    try {
        const availableSections = [
            'dashboard','calendario','imagenes','avisos','horarios','calificaciones',
            'asistencias','documentos','productos','unidades','reportes-academicos','estadisticas'
        ];

        // ocultar enlaces individuales que no estén en la lista
        document.querySelectorAll('.nav-section-items a[data-section]').forEach(a => {
            if (!availableSections.includes(a.dataset.section)) {
                a.style.display = 'none';
            } else {
                a.style.display = '';
            }
        });

        // ocultar secciones completas si ya no tienen enlaces visibles
        document.querySelectorAll('.nav-section').forEach(section => {
            const links = Array.from(section.querySelectorAll('.nav-section-items a')).filter(x => x.style.display !== 'none');
            if (!links.length) section.style.display = 'none';
            else section.style.display = '';
        });

        // Hacer las secciones colapsables: click en header alterna visibilidad del ul
        document.querySelectorAll('.nav-section').forEach(section => {
            const header = section.querySelector('.nav-section-header');
            const list = section.querySelector('.nav-section-items');
            if (!header || !list) return;
            // añadir cursor pointer y estado collapsed
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const isHidden = list.style.display === 'none' || getComputedStyle(list).display === 'none';
                list.style.display = isHidden ? '' : 'none';
            });
        });

        // Toggle del sidebar con el boton hamburguesa (sin backdrop)
        const btnToggle = document.getElementById('btnToggleSidebar');
        const sidebarEl = document.getElementById('sidebar');
        if (btnToggle && sidebarEl && typeof bootstrap !== 'undefined') {
            // create instance with backdrop false
            const inst = bootstrap.Offcanvas.getOrCreateInstance(sidebarEl, { backdrop: false, scroll: false });
            btnToggle.addEventListener('click', (e) => {
                // toggle manual
                if (sidebarEl.classList.contains('show')) inst.hide();
                else inst.show();
            });
        }

        // Evitar scroll del sidebar (no mostrar scroll-bar)
        document.querySelectorAll('.sidebar-offcanvas').forEach(s => {
            s.style.overflow = 'hidden';
        });
    } catch (e) { console.error('Error inicializando mejoras sidebar', e); }
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
        
        // Redirigir al login en la raíz (usar ../login.html para páginas en /admin)
        // Esto evita problemas con rutas relativas que produzcan 404
        window.location.href = '../login.html';
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
            unidad_id: p.unidad_id ?? p.unidad_medida_id ?? p.unidad ?? null,
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
        unidad: unidadesMap[p.unidad_id || p.unidad_medida_id] || (p.unidad_id || p.unidad_medida_id || '-'),
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

        // Use '*' and normalize fields to tolerate schema differences (avoid 42703 if a column is missing)
        const { data: unidadesRaw, error } = await supabase
            .from('unidades_medida')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;

        const unidades = (unidadesRaw || []).map(u => ({
            id: u.id,
            nombre: u.nombre ?? u.name ?? null,
            simbolo: u.simbolo ?? u.symbol ?? null,
            descripcion: u.descripcion ?? u.description ?? null
        }));

        // Detectar si la tabla tiene columna 'simbolo' o 'codigo' para evitar enviar campos inexistentes
        try {
            window.UNIDADES_HAS_SIMBOLO = (unidadesRaw || []).some(u => Object.prototype.hasOwnProperty.call(u, 'simbolo'));
            window.UNIDADES_HAS_CODIGO = (unidadesRaw || []).some(u => Object.prototype.hasOwnProperty.call(u, 'codigo'));
            // si ninguna fila existe, dejamos ambos flags a false — el submit será conservador
        } catch (e) {
            window.UNIDADES_HAS_SIMBOLO = false;
            window.UNIDADES_HAS_CODIGO = false;
        }

        const tabla = new DataTable('#tablaUnidades', {
            data: unidades.map(u => ({
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
        // Mostrar detalles más explícitos para diagnosticar problemas de esquema (42703)
        try {
            console.error('Error al cargar unidades de medida:', err);
            console.error('detalles error =>', {
                code: err?.code,
                message: err?.message,
                details: err?.details,
                hint: err?.hint
            });
        } catch (e) { console.error(e); }
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

// Helper: ensure the sidebar offcanvas is fully hidden before continuing
async function ensureSidebarHidden() {
    const sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;
    try {
        const off = bootstrap.Offcanvas.getInstance(sidebarEl);
        if (!off) return;
        return new Promise(resolve => {
            // If it's already hidden, resolve quickly
            // Bootstrap doesn't expose a public "isShown" flag consistently, so rely on event
            sidebarEl.addEventListener('hidden.bs.offcanvas', function onHidden() {
                sidebarEl.removeEventListener('hidden.bs.offcanvas', onHidden);
                // small delay to let backdrops be removed by bootstrap
                setTimeout(resolve, 50);
            });
            try { off.hide(); } catch (e) { resolve(); }
            // safety timeout in case event doesn't fire
            setTimeout(resolve, 500);
        });
    } catch (e) {
        return;
    }
}

// Debug helper: observe additions/removals of backdrop elements (offcanvas/modal)
let __modalBackdropObserver = null;
function installBackdropObserver() {
    if (__modalBackdropObserver) return __modalBackdropObserver;
    const obs = new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.classList.contains('modal-backdrop') || node.classList.contains('offcanvas-backdrop')) {
                    console.warn('[modal-debug] backdrop added:', node.className, 'computed z:', window.getComputedStyle(node).zIndex);
                    console.trace();
                }
            }
            for (const node of m.removedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.classList.contains('modal-backdrop') || node.classList.contains('offcanvas-backdrop')) {
                    console.warn('[modal-debug] backdrop removed:', node.className);
                }
            }
        }
    });
    __modalBackdropObserver = obs;
    return obs;
}

window.enableModalDebug = function() {
    try {
        const obs = installBackdropObserver();
        obs.observe(document.body, { childList: true, subtree: true });
        console.info('[modal-debug] enabled');
    } catch (e) { console.error(e); }
};

window.disableModalDebug = function() {
    try {
        if (__modalBackdropObserver) {
            __modalBackdropObserver.disconnect();
            __modalBackdropObserver = null;
        }
        console.info('[modal-debug] disabled');
    } catch (e) { console.error(e); }
};

// Utility: after showing modal try to remove or fix any backdrop that appears above the modal
function scheduleModalBackdropCleanup(modalEl, attempts = [80, 300, 700]) {
    const modalZ = Number(modalEl.style.zIndex || 20050);
    attempts.forEach(ms => setTimeout(() => {
        try {
            // Recompute backdrops
            document.querySelectorAll('.offcanvas-backdrop, .modal-backdrop').forEach(b => {
                if (!(b instanceof HTMLElement)) return;
                const compZ = Number(window.getComputedStyle(b).zIndex || 0);
                // If backdrop sits above modal, remove or lower it
                if (compZ > modalZ) {
                    console.warn('[modal-debug] removing backdrop with higher z-index', compZ, 'modalZ', modalZ);
                    b.remove();
                } else {
                    // Ensure proper pointer behavior
                    b.style.pointerEvents = b.style.pointerEvents || 'auto';
                }
            });
            // Ensure body has modal-open so scroll is locked when modal visible
            if (!document.body.classList.contains('modal-open')) document.body.classList.add('modal-open');
            // También intentar eliminar elementos que cubran el centro del modal
            try { removeCoveringElements(modalEl); } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }, ms));
}

// Aggressive: remove any covering element over the modal center that is not the modal or its backdrop
function removeCoveringElements(modalEl) {
    if (!(modalEl instanceof HTMLElement)) return;
    const rect = modalEl.getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2);
    const cy = Math.round(rect.top + rect.height / 2);
    try {
        const topEl = document.elementFromPoint(cx, cy);
        if (!topEl) return;
        // If the top element is the modal or inside it, nothing to do
        if (modalEl.contains(topEl) || topEl === modalEl) return;
        // If it's a backdrop we control, ensure its z-index is below modal
        if (topEl.classList && (topEl.classList.contains('modal-backdrop') || topEl.classList.contains('offcanvas-backdrop'))) {
            const z = Number(window.getComputedStyle(topEl).zIndex || 0);
            const mz = Number(modalEl.style.zIndex || 20050);
            if (z >= mz) {
                console.warn('[modal-debug] lowering/removing backdrop placed above modal', { z, mz, el: topEl });
                topEl.remove();
            }
            return;
        }
        // Otherwise, remove the covering element (might be third-party overlay)
        console.warn('[modal-debug] removing unexpected covering element over modal center:', topEl);
        topEl.remove();
    } catch (e) {
        /* ignore */
    }
}

// Global defensive handler: before any modal shows, try to remove offcanvas backdrops that could cover it
document.addEventListener('show.bs.modal', (e) => {
    try {
        // small immediate cleanup
        document.querySelectorAll('.offcanvas-backdrop').forEach(b => b.remove());
        // ensure modal is appended to body so z-index stacking context is predictable
        const modalEl = e.target;
        if (modalEl instanceof HTMLElement && modalEl.parentElement !== document.body) {
            try { document.body.appendChild(modalEl); } catch (err) { /* no-op */ }
        }
        // ensure modal has high z-index
        if (modalEl instanceof HTMLElement) modalEl.style.zIndex = '20050';
        // tiny defered cleanup in case other scripts add backdrops right after
        setTimeout(() => scheduleModalBackdropCleanup(modalEl), 20);
    } catch (err) {
        console.error('Error in global show.bs.modal handler', err);
    }
}, true);

// Mostrar modal producto: mode = 'new'|'edit' (comportamiento similar a modal de calendario)
async function showProductoModal(mode = 'new', producto = null) {
    const modalEl = document.getElementById('modalProducto');
    if (!modalEl) return;

    // Esperar que el sidebar/offcanvas esté completamente oculto para evitar backdrops en conflicto
    try { await ensureSidebarHidden(); } catch (e) { /* ignore */ }

    // Obtener o crear instancia del modal (patrón igual que calendario)
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) modal = new bootstrap.Modal(modalEl);

    // Rellenar campos del formulario
    document.getElementById('productoId').value = producto?.id || '';
    document.getElementById('productoNombre').value = producto?.nombre || '';
    document.getElementById('productoSKU').value = producto?.sku || '';
    document.getElementById('productoPrecio').value = producto?.precio != null ? producto.precio : '';
    document.getElementById('productoDescripcion').value = producto?.descripcion || '';
    document.getElementById('productoActivo').checked = producto?.activo ?? true;
    if (producto?.unidad_id) document.getElementById('productoUnidad').value = producto.unidad_id;
    else if (producto?.unidad_medida_id) document.getElementById('productoUnidad').value = producto.unidad_medida_id || '';

    // Mostrar/ocultar botón eliminar
    const btnEliminar = document.getElementById('btnEliminarProducto');
    if (btnEliminar) btnEliminar.style.display = mode === 'edit' ? 'inline-block' : 'none';

    // Dejar el manejo del submit en el listener global ya presente
    modal.show();
}

async function editarProducto(id) {
    const { data: productoRaw, error } = await supabase.from('productos').select('*').eq('id', id).single();
    if (error) return mostrarError('Error al obtener producto');
    // Normalizar campos como en la lista
    const producto = {
        id: productoRaw.id,
        nombre: productoRaw.nombre ?? productoRaw.name ?? null,
        sku: productoRaw.sku ?? productoRaw.codigo ?? null,
        precio: productoRaw.precio ?? productoRaw.price ?? null,
        unidad_medida_id: productoRaw.unidad_medida_id ?? productoRaw.unidad_id ?? productoRaw.unidad ?? null,
        unidad_id: productoRaw.unidad_id ?? productoRaw.unidad_medida_id ?? productoRaw.unidad ?? null,
        activo: typeof productoRaw.activo !== 'undefined' ? productoRaw.activo : (productoRaw.enabled ?? true),
        descripcion: productoRaw.descripcion ?? productoRaw.description ?? null
    };
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
        unidad_id: document.getElementById('productoUnidad').value || null,
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
async function showUnidadModal(mode = 'new', unidad = null) {
    console.debug('[debug-unidad] showUnidadModal start', { mode, unidad });
    const modalEl = document.getElementById('modalUnidad');
    // Si el modal no está en el DOM, inyectarlo dinámicamente (algunas plantillas no incluyen el modal)
    if (!modalEl) {
        console.debug('[debug-unidad] modalUnidad no presente, llamando ensureUnidadModalExists()');
        await ensureUnidadModalExists();
    }

    const modalElNow = document.getElementById('modalUnidad');
    console.debug('[debug-unidad] modalElNow:', !!modalElNow, modalElNow);
    if (!modalElNow) {
        console.error('[debug-unidad] modalUnidad sigue sin existir después de ensureUnidadModalExists()');
        return;
    }

    // Esperar que el sidebar/offcanvas esté completamente oculto para evitar backdrops en conflicto
    try { await ensureSidebarHidden(); } catch (e) { /* ignore */ }

    let modal = bootstrap.Modal.getInstance(modalElNow);
    if (!modal) modal = new bootstrap.Modal(modalElNow);

    // Antes de escribir en inputs, verificar que existen
    const idsToCheck = ['unidadId', 'unidadCodigo', 'unidadNombre', 'unidadDescripcion', 'btnEliminarUnidad'];
    const missing = idsToCheck.filter(id => !document.getElementById(id));
    if (missing.length) {
        console.error('[debug-unidad] faltan elementos en el DOM antes de rellenar formulario:', missing);
        console.debug('[debug-unidad] modalElNow innerHTML length:', modalElNow.innerHTML?.length);
    }

    try {
        const elId = document.getElementById('unidadId');
    // aceptar tanto 'unidadCodigo' (nuevo) como 'unidadSimbolo' (plantilla existente)
    const elCodigo = document.getElementById('unidadCodigo') || document.getElementById('unidadSimbolo');
        const elNombre = document.getElementById('unidadNombre');
        const elDescripcion = document.getElementById('unidadDescripcion');

        if (!elId || !elCodigo || !elNombre || !elDescripcion) {
            console.error('[debug-unidad] abortando rellenado: elementos faltantes', { elId: !!elId, elCodigo: !!elCodigo, elNombre: !!elNombre, elDescripcion: !!elDescripcion });
        } else {
            elId.value = unidad?.id || '';
            if (elCodigo) elCodigo.value = unidad?.codigo ?? unidad?.simbolo ?? '';
            elNombre.value = unidad?.nombre || '';
            elDescripcion.value = unidad?.descripcion || '';
        }

        const btnEliminar = document.getElementById('btnEliminarUnidad');
        if (btnEliminar) btnEliminar.style.display = mode === 'edit' ? 'inline-block' : 'none';
    } catch (e) {
        console.error('[debug-unidad] error rellenando campos del modal:', e);
    }

    modal.show();
    console.debug('[debug-unidad] modal.show() llamado');
}

// Si el modal de unidad no existe en el DOM, crear la estructura y enlazar handlers mínimos
async function ensureUnidadModalExists() {
    console.debug('[debug-unidad] ensureUnidadModalExists start');
    if (document.getElementById('modalUnidad')) {
        console.debug('[debug-unidad] modalUnidad ya existe, saliendo');
        return;
    }
        const tpl = `
        <div class="modal fade" id="modalUnidad" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <form id="formUnidad">
                        <div class="modal-header">
                            <h5 class="modal-title">Unidad de Medida</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" id="unidadId">
                            <div class="mb-3">
                                <label for="unidadCodigo" class="form-label">Código</label>
                                <input id="unidadCodigo" class="form-control" />
                            </div>
                            <div class="mb-3">
                                <label for="unidadNombre" class="form-label">Nombre</label>
                                <input id="unidadNombre" class="form-control" required />
                            </div>
                            <div class="mb-3">
                                <label for="unidadDescripcion" class="form-label">Descripción</label>
                                <textarea id="unidadDescripcion" class="form-control" rows="3"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" id="btnEliminarUnidad" class="btn btn-danger">Eliminar</button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="submit" class="btn btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
        try {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = tpl.trim();
                document.body.appendChild(wrapper.firstElementChild);

                // Enlazar handlers si no están ya enlazados (guardas por dataset)
                const form = document.getElementById('formUnidad');
                console.debug('[debug-unidad] modal inyectado, form encontrado:', !!form);
                if (form && !form.dataset._attached) {
            form.addEventListener('submit', async (e) => {
                                e.preventDefault();
                                const id = document.getElementById('unidadId').value;
                                const nombreVal = document.getElementById('unidadNombre').value.trim();
                                const descripcionVal = document.getElementById('unidadDescripcion').value.trim() || null;
                                const simboloVal = (document.getElementById('unidadCodigo')?.value || document.getElementById('unidadSimbolo')?.value || '').trim() || null;
                                // Construir payload de forma defensiva: sólo incluir la clave que exista en la tabla
                                const payload = { nombre: nombreVal, descripcion: descripcionVal };
                                if (simboloVal) {
                                    if (window.UNIDADES_HAS_SIMBOLO) payload.simbolo = simboloVal;
                                    else if (window.UNIDADES_HAS_CODIGO) payload.codigo = simboloVal;
                                    else {
                                        // La tabla no parece tener 'simbolo' ni 'codigo'; evitar enviar ese campo
                                    }
                                }
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
            form.dataset._attached = '1';
            console.debug('[debug-unidad] submit handler adjuntado');
                }

                const btnEliminar = document.getElementById('btnEliminarUnidad');
                console.debug('[debug-unidad] btnEliminar encontrado:', !!btnEliminar);
                if (btnEliminar && !btnEliminar.dataset._attached) {
                        btnEliminar.addEventListener('click', async () => {
                                const id = document.getElementById('unidadId').value;
                                if (!id) return;
                                if (!confirm('¿Eliminar esta unidad de medida?')) return;
                                const { error } = await supabase.from('unidades_medida').delete().eq('id', id);
                                if (error) return mostrarError('Error al eliminar unidad');
                                mostrarExito('Unidad eliminada');
                                bootstrap.Modal.getInstance(document.getElementById('modalUnidad'))?.hide();
                                await cargarUnidades(lastMainContainer);
                        });
            btnEliminar.dataset._attached = '1';
            console.debug('[debug-unidad] delete handler adjuntado');
                }
        } catch (e) {
                console.error('Error creando modal de unidad dinámicamente', e);
        }
}

async function editarUnidad(id) {
    console.debug('[debug-unidad] editarUnidad id=', id);
    const { data, error } = await supabase.from('unidades_medida').select('*').eq('id', id).single();
    console.debug('[debug-unidad] supabase response editarUnidad', { data, error });
    if (error) {
        console.error('[debug-unidad] error al obtener unidad desde supabase', error);
        return mostrarError('Error al obtener unidad');
    }
    // Log data shape
    try { console.debug('[debug-unidad] unidad data keys:', Object.keys(data || {})); } catch(e){}
    showUnidadModal('edit', data);
}

// Form submit unidad
document.getElementById('formUnidad')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('unidadId').value;
    const nombreVal = document.getElementById('unidadNombre').value.trim();
    const descripcionVal = document.getElementById('unidadDescripcion').value.trim() || null;
    const simboloVal = (document.getElementById('unidadSimbolo')?.value || document.getElementById('unidadCodigo')?.value || '').trim() || null;
    const payload = { nombre: nombreVal, descripcion: descripcionVal };
    if (simboloVal) {
        if (window.UNIDADES_HAS_SIMBOLO) payload.simbolo = simboloVal;
        else if (window.UNIDADES_HAS_CODIGO) payload.codigo = simboloVal;
        // si ninguna de las dos columnas existe, no añadimos la clave al payload
    }
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
