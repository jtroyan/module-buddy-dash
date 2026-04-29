
-- Tabla de programas académicos
CREATE TABLE public.programas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de módulos virtuales
CREATE TABLE public.modulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programa_id UUID NOT NULL REFERENCES public.programas(id) ON DELETE CASCADE,
  numero INTEGER,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_modulos_programa ON public.modulos(programa_id);

-- Tabla de actividades de producción (flexible para todas las categorías)
-- categoria: 'banner' | 'video' | 'ruta' | 'plan_aula' | 'ccd' | 'tecnopedagogica'
CREATE TABLE public.actividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  nombre_actividad TEXT NOT NULL,
  valor TEXT,
  estado TEXT NOT NULL DEFAULT 'Revisión',
  observacion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_actividades_modulo ON public.actividades(modulo_id);
CREATE INDEX idx_actividades_categoria ON public.actividades(categoria);
CREATE INDEX idx_actividades_estado ON public.actividades(estado);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_programas_updated BEFORE UPDATE ON public.programas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_modulos_updated BEFORE UPDATE ON public.modulos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_actividades_updated BEFORE UPDATE ON public.actividades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS (acceso abierto para esta versión interna)
ALTER TABLE public.programas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_lectura_programas" ON public.programas FOR SELECT USING (true);
CREATE POLICY "acceso_escritura_programas" ON public.programas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "acceso_lectura_modulos" ON public.modulos FOR SELECT USING (true);
CREATE POLICY "acceso_escritura_modulos" ON public.modulos FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "acceso_lectura_actividades" ON public.actividades FOR SELECT USING (true);
CREATE POLICY "acceso_escritura_actividades" ON public.actividades FOR ALL USING (true) WITH CHECK (true);
