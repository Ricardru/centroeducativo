# 🔧 Solución al Error de Calendario Escolar

## ❌ Problema
Error al insertar eventos en `calendario_escolar`: **"new row violates row-level security policy"**

## 🔍 Causa
La tabla `calendario_escolar` no existe o las políticas RLS no están configuradas correctamente.

## ✅ Solución

### Paso 1: Abrir Supabase Dashboard
1. Ir a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Seleccionar el proyecto `centroeducativo`
3. Ir a **SQL Editor** en el menú lateral

### Paso 2: Ejecutar el SQL de Creación
Copiar y pegar el contenido completo del archivo `SQL_CREAR_CALENDARIO_ESCOLAR.sql` en el SQL Editor y ejecutarlo.

**O ejecutar este SQL directamente:**

```sql
-- CREAR TABLA calendario_escolar
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
    CONSTRAINT calendario_escolar_pkey PRIMARY KEY (id),
    CONSTRAINT calendario_escolar_tipo_evento_check CHECK (tipo_evento IN ('clase', 'reunion', 'evaluacion', 'actividad', 'feriado', 'evento')),
    CONSTRAINT calendario_escolar_estado_check CHECK (estado IN ('activo', 'inactivo', 'cancelado'))
);

-- HABILITAR ROW LEVEL SECURITY
ALTER TABLE public.calendario_escolar ENABLE ROW LEVEL SECURITY;

-- CREAR POLÍTICAS RLS
CREATE POLICY "calendario_escolar_select_policy" ON public.calendario_escolar FOR SELECT USING (true);
CREATE POLICY "calendario_escolar_insert_policy" ON public.calendario_escolar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "calendario_escolar_update_policy" ON public.calendario_escolar FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "calendario_escolar_delete_policy" ON public.calendario_escolar FOR DELETE TO authenticated USING (true);
```

### Paso 3: Verificar la Creación
Ejecutar esta consulta para verificar:
```sql
SELECT COUNT(*) FROM public.calendario_escolar;
```

### Paso 4: Probar desde la Aplicación
1. Abrir `diagnostico-calendario.html` en el navegador
2. Hacer clic en **"1. Verificar Autenticación"**
3. Hacer clic en **"2. Verificar Tabla"** 
4. Hacer clic en **"4. Insertar Evento de Prueba"**

## 🔧 Diagnóstico Adicional

Si el problema persiste, verificar:

### 1. Autenticación
```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Sesión:', session);
```

### 2. Políticas RLS
```sql
SELECT * FROM pg_policies WHERE tablename = 'calendario_escolar';
```

### 3. Permisos de Usuario
```sql
SELECT current_user, session_user, current_setting('role');
```

## 📝 Archivos Afectados
- `js/admin/calendario-escolar.js` - Mejorado el manejo de errores
- `supabase/policies/calendario_escolar.sql` - Políticas actualizadas
- `diagnostico-calendario.html` - Herramienta de diagnóstico

## 🚀 Una vez solucionado
El sistema debería permitir:
- ✅ Crear eventos en el calendario
- ✅ Ver eventos existentes  
- ✅ Editar y eliminar eventos
- ✅ Funciones completas del módulo académico