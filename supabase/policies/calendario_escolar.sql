-- Crear tabla calendario_escolar si no existe
CREATE TABLE IF NOT EXISTS public.calendario_escolar (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    descripcion text,
    fecha_inicio timestamp with time zone NOT NULL,
    fecha_fin timestamp with time zone,
    tipo_evento text NOT NULL DEFAULT 'evento'::text,
    estado text NOT NULL DEFAULT 'activo'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT calendario_escolar_pkey PRIMARY KEY (id),
    CONSTRAINT calendario_escolar_tipo_evento_check CHECK ((tipo_evento = ANY (ARRAY['clase'::text, 'reunion'::text, 'evaluacion'::text, 'actividad'::text, 'feriado'::text, 'evento'::text]))),
    CONSTRAINT calendario_escolar_estado_check CHECK ((estado = ANY (ARRAY['activo'::text, 'inactivo'::text, 'cancelado'::text])))
);

-- Habilitar RLS en la tabla calendario_escolar
ALTER TABLE public.calendario_escolar ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver calendario_escolar" ON public.calendario_escolar;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear calendario_escolar" ON public.calendario_escolar;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar calendario_escolar" ON public.calendario_escolar;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar calendario_escolar" ON public.calendario_escolar;

-- Política para SELECT: permitir ver todos los eventos (público)
CREATE POLICY "calendario_escolar_select_policy" ON public.calendario_escolar
    FOR SELECT USING (true);

-- Política para INSERT: permitir crear eventos a todos los usuarios autenticados
CREATE POLICY "calendario_escolar_insert_policy" ON public.calendario_escolar
    FOR INSERT WITH CHECK (true);

-- Política para UPDATE: permitir actualizar eventos a todos los usuarios autenticados
CREATE POLICY "calendario_escolar_update_policy" ON public.calendario_escolar
    FOR UPDATE USING (true) WITH CHECK (true);

-- Política para DELETE: permitir eliminar eventos a todos los usuarios autenticados
CREATE POLICY "calendario_escolar_delete_policy" ON public.calendario_escolar
    FOR DELETE USING (true);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_calendario_escolar_fecha_inicio ON public.calendario_escolar(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_calendario_escolar_tipo_evento ON public.calendario_escolar(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_calendario_escolar_estado ON public.calendario_escolar(estado);

-- Insertar algunos eventos de ejemplo
INSERT INTO public.calendario_escolar (titulo, descripcion, fecha_inicio, fecha_fin, tipo_evento, estado) 
VALUES
    ('Inicio del Año Escolar 2025', 'Ceremonia de inicio del año académico', '2025-01-15 08:00:00+00', '2025-01-15 10:00:00+00', 'evento', 'activo'),
    ('Reunión de Padres - 1er Grado', 'Reunión informativa para padres de primer grado', '2025-01-20 16:00:00+00', '2025-01-20 18:00:00+00', 'reunion', 'activo'),
    ('Evaluación Diagnóstica', 'Evaluación inicial para todos los estudiantes', '2025-01-25 08:00:00+00', '2025-01-25 12:00:00+00', 'evaluacion', 'activo')
ON CONFLICT (id) DO NOTHING;