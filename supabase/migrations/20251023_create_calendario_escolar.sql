-- Crear tabla calendario_escolar
create table if not exists public.calendario_escolar (
    id uuid not null default extensions.uuid_generate_v4(),
    titulo text not null,
    descripcion text,
    fecha_inicio timestamp with time zone not null,
    fecha_fin timestamp with time zone,
    tipo_evento text not null default 'evento',
    estado text not null default 'activo',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint calendario_escolar_pkey primary key (id),
    constraint calendario_escolar_tipo_evento_check check (tipo_evento in ('clase', 'reunion', 'evaluacion', 'actividad', 'feriado', 'evento')),
    constraint calendario_escolar_estado_check check (estado in ('activo', 'inactivo', 'cancelado'))
);

-- Habilitar RLS en la tabla calendario_escolar
alter table public.calendario_escolar enable row level security;

-- Eliminar políticas existentes si existen
drop policy if exists "Usuarios autenticados pueden ver calendario_escolar" on public.calendario_escolar;
drop policy if exists "Usuarios autenticados pueden crear calendario_escolar" on public.calendario_escolar;
drop policy if exists "Usuarios autenticados pueden actualizar calendario_escolar" on public.calendario_escolar;
drop policy if exists "Usuarios autenticados pueden eliminar calendario_escolar" on public.calendario_escolar;

-- Política para SELECT: permitir ver todos los eventos a usuarios autenticados
create policy "Usuarios autenticados pueden ver calendario_escolar"
on public.calendario_escolar for select
to authenticated
using (true);

-- Política para INSERT: permitir crear eventos a usuarios autenticados
create policy "Usuarios autenticados pueden crear calendario_escolar"
on public.calendario_escolar for insert
to authenticated
with check (true);

-- Política para UPDATE: permitir actualizar eventos a usuarios autenticados
create policy "Usuarios autenticados pueden actualizar calendario_escolar"
on public.calendario_escolar for update
to authenticated
using (true)
with check (true);

-- Política para DELETE: permitir eliminar eventos a usuarios autenticados
create policy "Usuarios autenticados pueden eliminar calendario_escolar"
on public.calendario_escolar for delete
to authenticated
using (true);

-- Crear índices para mejorar rendimiento
create index if not exists idx_calendario_escolar_fecha_inicio on public.calendario_escolar(fecha_inicio);
create index if not exists idx_calendario_escolar_tipo_evento on public.calendario_escolar(tipo_evento);
create index if not exists idx_calendario_escolar_estado on public.calendario_escolar(estado);

-- Función para actualizar updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger para actualizar updated_at en calendario_escolar
drop trigger if exists handle_updated_at on public.calendario_escolar;
create trigger handle_updated_at
    before update on public.calendario_escolar
    for each row execute procedure public.handle_updated_at();

-- Insertar algunos eventos de ejemplo
insert into public.calendario_escolar (titulo, descripcion, fecha_inicio, fecha_fin, tipo_evento, estado) values
    ('Inicio del Año Escolar 2025', 'Ceremonia de inicio del año académico', '2025-01-15 08:00:00+00', '2025-01-15 10:00:00+00', 'evento', 'activo'),
    ('Reunión de Padres - 1er Grado', 'Reunión informativa para padres de primer grado', '2025-01-20 16:00:00+00', '2025-01-20 18:00:00+00', 'reunion', 'activo'),
    ('Evaluación Diagnóstica', 'Evaluación inicial para todos los estudiantes', '2025-01-25 08:00:00+00', '2025-01-25 12:00:00+00', 'evaluacion', 'activo'),
    ('Día de la Bandera', 'Celebración del día de la bandera nacional', '2025-02-27 09:00:00+00', '2025-02-27 11:00:00+00', 'actividad', 'activo'),
    ('Vacaciones de Invierno', 'Receso invernal', '2025-07-15 00:00:00+00', '2025-07-29 23:59:59+00', 'feriado', 'activo');