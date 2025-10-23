-- =====================================
-- SQL PARA EJECUTAR EN SUPABASE
-- Crear tabla calendario_escolar y políticas RLS
-- =====================================

-- 1. CREAR TABLA calendario_escolar
CREATE TABLE IF NOT EXISTS public.calendario_escolar (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    descripcion text,
    fecha_inicio timestamp with time zone NOT NULL,
    fecha_fin timestamp with time zone,
    tipo_evento text NOT NULL DEFAULT 'evento',
    estado text NOT NULL DEFAULT 'activo',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT calendario_escolar_pkey PRIMARY KEY (id)
);

-- 2. AGREGAR CONSTRAINTS DE VALIDACIÓN
ALTER TABLE public.calendario_escolar 
DROP CONSTRAINT IF EXISTS calendario_escolar_tipo_evento_check;

ALTER TABLE public.calendario_escolar 
ADD CONSTRAINT calendario_escolar_tipo_evento_check 
CHECK (tipo_evento IN ('clase', 'reunion', 'evaluacion', 'actividad', 'feriado', 'evento'));

ALTER TABLE public.calendario_escolar 
DROP CONSTRAINT IF EXISTS calendario_escolar_estado_check;

ALTER TABLE public.calendario_escolar 
ADD CONSTRAINT calendario_escolar_estado_check 
CHECK (estado IN ('activo', 'inactivo', 'cancelado'));

-- 3. HABILITAR ROW LEVEL SECURITY
ALTER TABLE public.calendario_escolar ENABLE ROW LEVEL SECURITY;

-- 4. ELIMINAR POLÍTICAS EXISTENTES (por si ya existen)
DROP POLICY IF EXISTS "calendario_escolar_select_policy" ON public.calendario_escolar;
DROP POLICY IF EXISTS "calendario_escolar_insert_policy" ON public.calendario_escolar;
DROP POLICY IF EXISTS "calendario_escolar_update_policy" ON public.calendario_escolar;
DROP POLICY IF EXISTS "calendario_escolar_delete_policy" ON public.calendario_escolar;

-- 5. CREAR POLÍTICAS RLS MÁS PERMISIVAS
-- Permitir SELECT a todos (público)
CREATE POLICY "calendario_escolar_select_policy" 
ON public.calendario_escolar FOR SELECT 
USING (true);

-- Permitir INSERT a usuarios autenticados
CREATE POLICY "calendario_escolar_insert_policy" 
ON public.calendario_escolar FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Permitir UPDATE a usuarios autenticados
CREATE POLICY "calendario_escolar_update_policy" 
ON public.calendario_escolar FOR UPDATE 
TO authenticated
USING (true) 
WITH CHECK (true);

-- Permitir DELETE a usuarios autenticados
CREATE POLICY "calendario_escolar_delete_policy" 
ON public.calendario_escolar FOR DELETE 
TO authenticated
USING (true);

-- 6. CREAR ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_calendario_escolar_fecha_inicio 
ON public.calendario_escolar(fecha_inicio);

CREATE INDEX IF NOT EXISTS idx_calendario_escolar_tipo_evento 
ON public.calendario_escolar(tipo_evento);

CREATE INDEX IF NOT EXISTS idx_calendario_escolar_estado 
ON public.calendario_escolar(estado);

-- 7. INSERTAR DATOS DE EJEMPLO (solo si no existen)
INSERT INTO public.calendario_escolar (titulo, descripcion, fecha_inicio, fecha_fin, tipo_evento, estado) 
SELECT * FROM (
    VALUES 
        ('Inicio del Año Escolar 2025', 'Ceremonia de inicio del año académico', '2025-01-15 08:00:00+00'::timestamp with time zone, '2025-01-15 10:00:00+00'::timestamp with time zone, 'evento', 'activo'),
        ('Reunión de Padres - 1er Grado', 'Reunión informativa para padres de primer grado', '2025-01-20 16:00:00+00'::timestamp with time zone, '2025-01-20 18:00:00+00'::timestamp with time zone, 'reunion', 'activo'),
        ('Evaluación Diagnóstica', 'Evaluación inicial para todos los estudiantes', '2025-01-25 08:00:00+00'::timestamp with time zone, '2025-01-25 12:00:00+00'::timestamp with time zone, 'evaluacion', 'activo'),
        ('Día de la Bandera', 'Celebración del día de la bandera nacional', '2025-02-27 09:00:00+00'::timestamp with time zone, '2025-02-27 11:00:00+00'::timestamp with time zone, 'actividad', 'activo'),
        ('Vacaciones de Invierno', 'Receso invernal', '2025-07-15 00:00:00+00'::timestamp with time zone, '2025-07-29 23:59:59+00'::timestamp with time zone, 'feriado', 'activo')
) AS v(titulo, descripcion, fecha_inicio, fecha_fin, tipo_evento, estado)
WHERE NOT EXISTS (
    SELECT 1 FROM public.calendario_escolar WHERE titulo = v.titulo
);

-- 8. VERIFICAR CREACIÓN
SELECT 'Tabla calendario_escolar creada exitosamente' as mensaje,
       COUNT(*) as registros_ejemplo
FROM public.calendario_escolar;