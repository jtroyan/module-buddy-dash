-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users_view_own_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admins_view_all_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_manage_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Columnas para módulos comunes
ALTER TABLE public.modulos
  ADD COLUMN es_comun BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN modulo_principal_id UUID REFERENCES public.modulos(id) ON DELETE SET NULL;

CREATE INDEX idx_modulos_principal ON public.modulos(modulo_principal_id);

-- 3. Cambiar RLS de programas/modulos/actividades: lectura pública para autenticados, escritura solo admin
DROP POLICY IF EXISTS "acceso_escritura_programas" ON public.programas;
DROP POLICY IF EXISTS "acceso_lectura_programas" ON public.programas;
DROP POLICY IF EXISTS "acceso_escritura_modulos" ON public.modulos;
DROP POLICY IF EXISTS "acceso_lectura_modulos" ON public.modulos;
DROP POLICY IF EXISTS "acceso_escritura_actividades" ON public.actividades;
DROP POLICY IF EXISTS "acceso_lectura_actividades" ON public.actividades;

CREATE POLICY "auth_read_programas" ON public.programas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_programas" ON public.programas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "auth_read_modulos" ON public.modulos FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_modulos" ON public.modulos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "auth_read_actividades" ON public.actividades FOR SELECT TO authenticated USING (true);
-- Cualquier usuario autenticado puede actualizar el estado de actividades (es app de seguimiento colaborativo)
CREATE POLICY "auth_update_actividades" ON public.actividades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_insert_delete_actividades" ON public.actividades FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_delete_actividades" ON public.actividades FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Función para detectar y marcar módulos comunes (por nombre normalizado)
CREATE OR REPLACE FUNCTION public.detectar_modulos_comunes()
RETURNS TABLE(grupos_detectados INT, copias_marcadas INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_grupos INT := 0;
  v_copias INT := 0;
BEGIN
  -- Reset
  UPDATE public.modulos SET es_comun = false, modulo_principal_id = NULL;

  -- Para cada nombre normalizado que aparezca en >1 programa, elegir principal (programa con menor orden, luego modulo.orden)
  WITH normalizado AS (
    SELECT m.id, m.programa_id, m.orden AS m_orden, p.orden AS p_orden,
           lower(btrim(regexp_replace(m.nombre, '\s+', ' ', 'g'))) AS clave
    FROM public.modulos m
    JOIN public.programas p ON p.id = m.programa_id
  ),
  grupos AS (
    SELECT clave, COUNT(DISTINCT programa_id) AS n_prog
    FROM normalizado GROUP BY clave HAVING COUNT(DISTINCT programa_id) > 1
  ),
  ranked AS (
    SELECT n.id, n.clave,
           ROW_NUMBER() OVER (PARTITION BY n.clave ORDER BY n.p_orden, n.m_orden, n.id) AS rn,
           FIRST_VALUE(n.id) OVER (PARTITION BY n.clave ORDER BY n.p_orden, n.m_orden, n.id) AS principal_id
    FROM normalizado n
    JOIN grupos g ON g.clave = n.clave
  )
  UPDATE public.modulos m
  SET es_comun = true,
      modulo_principal_id = CASE WHEN r.rn = 1 THEN NULL ELSE r.principal_id END
  FROM ranked r
  WHERE m.id = r.id;

  SELECT COUNT(*) INTO v_grupos FROM (
    SELECT 1 FROM public.modulos WHERE es_comun = true AND modulo_principal_id IS NULL
  ) x;
  SELECT COUNT(*) INTO v_copias FROM public.modulos WHERE modulo_principal_id IS NOT NULL;

  RETURN QUERY SELECT v_grupos, v_copias;
END;
$$;

-- 5. Función para borrar actividades de copias (las copias heredan del principal)
CREATE OR REPLACE FUNCTION public.limpiar_actividades_copias()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_borradas INT;
BEGIN
  WITH del AS (
    DELETE FROM public.actividades
    WHERE modulo_id IN (SELECT id FROM public.modulos WHERE modulo_principal_id IS NOT NULL)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_borradas FROM del;
  RETURN v_borradas;
END;
$$;

-- 6. Triggers updated_at en user_roles ya manejado por set_updated_at existente (no aplica, solo created_at)
