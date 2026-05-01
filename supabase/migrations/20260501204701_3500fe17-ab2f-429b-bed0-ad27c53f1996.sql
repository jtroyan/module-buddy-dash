-- Helper: obtener el programa de origen de un módulo (su principal si es copia)
CREATE OR REPLACE FUNCTION public.programa_origen_modulo(_modulo_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.programa_id FROM public.modulos p
     WHERE p.id = (SELECT m.modulo_principal_id FROM public.modulos m WHERE m.id = _modulo_id)),
    (SELECT m.programa_id FROM public.modulos m WHERE m.id = _modulo_id)
  )
$$;

-- Endurecer RLS en actividades: las copias no se pueden editar (no deberían existir, pero por si acaso).
-- Solo admins pueden insertar/borrar.
DROP POLICY IF EXISTS auth_update_actividades ON public.actividades;
CREATE POLICY auth_update_actividades ON public.actividades
FOR UPDATE
TO authenticated
USING (
  -- La actividad debe pertenecer a un módulo principal o que NO sea copia
  NOT EXISTS (
    SELECT 1 FROM public.modulos m
    WHERE m.id = actividades.modulo_id AND m.modulo_principal_id IS NOT NULL
  )
)
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.modulos m
    WHERE m.id = actividades.modulo_id AND m.modulo_principal_id IS NOT NULL
  )
);

-- Mejorar detectar_modulos_comunes: si solo hay 1 grupo, igual contar; y devolver siempre, no salir si no admin
-- Ya tiene seguridad — está bien.

-- Permitir que usuarios autenticados (no solo admin) puedan ejecutar la detección manual sería un cambio de scope; mantenemos solo admin.
