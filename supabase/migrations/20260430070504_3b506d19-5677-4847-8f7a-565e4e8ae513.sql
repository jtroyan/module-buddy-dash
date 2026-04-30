REVOKE EXECUTE ON FUNCTION public.detectar_modulos_comunes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.limpiar_actividades_copias() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.detectar_modulos_comunes()
RETURNS TABLE(grupos_detectados INT, copias_marcadas INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_grupos INT := 0; v_copias INT := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden ejecutar esta función';
  END IF;
  UPDATE public.modulos SET es_comun = false, modulo_principal_id = NULL;
  WITH normalizado AS (
    SELECT m.id, m.programa_id, m.orden AS m_orden, p.orden AS p_orden,
           lower(btrim(regexp_replace(m.nombre, '\s+', ' ', 'g'))) AS clave
    FROM public.modulos m JOIN public.programas p ON p.id = m.programa_id
  ),
  grupos AS (
    SELECT clave FROM normalizado GROUP BY clave HAVING COUNT(DISTINCT programa_id) > 1
  ),
  ranked AS (
    SELECT n.id, n.clave,
           ROW_NUMBER() OVER (PARTITION BY n.clave ORDER BY n.p_orden, n.m_orden, n.id) AS rn,
           FIRST_VALUE(n.id) OVER (PARTITION BY n.clave ORDER BY n.p_orden, n.m_orden, n.id) AS principal_id
    FROM normalizado n JOIN grupos g ON g.clave = n.clave
  )
  UPDATE public.modulos m
  SET es_comun = true,
      modulo_principal_id = CASE WHEN r.rn = 1 THEN NULL ELSE r.principal_id END
  FROM ranked r WHERE m.id = r.id;

  SELECT COUNT(*) INTO v_grupos FROM public.modulos WHERE es_comun = true AND modulo_principal_id IS NULL;
  SELECT COUNT(*) INTO v_copias FROM public.modulos WHERE modulo_principal_id IS NOT NULL;
  RETURN QUERY SELECT v_grupos, v_copias;
END;
$$;

CREATE OR REPLACE FUNCTION public.limpiar_actividades_copias()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_borradas INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden ejecutar esta función';
  END IF;
  WITH del AS (
    DELETE FROM public.actividades
    WHERE modulo_id IN (SELECT id FROM public.modulos WHERE modulo_principal_id IS NOT NULL)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_borradas FROM del;
  RETURN v_borradas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.detectar_modulos_comunes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.limpiar_actividades_copias() TO authenticated;
