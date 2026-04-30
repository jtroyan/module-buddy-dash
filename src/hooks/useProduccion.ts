import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Programa = { id: string; nombre: string; orden: number };
export type Modulo = {
  id: string; programa_id: string; numero: number | null; nombre: string; orden: number;
  es_comun: boolean; modulo_principal_id: string | null;
};
export type Actividad = {
  id: string; modulo_id: string; categoria: string; nombre_actividad: string;
  valor: string | null; estado: string; observacion: string | null; orden: number;
};

export function useProgramas() {
  return useQuery({
    queryKey: ['programas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programas').select('*').order('orden');
      if (error) throw error;
      return data as Programa[];
    },
  });
}

export function useModulos(programaId?: string | null) {
  return useQuery({
    queryKey: ['modulos', programaId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('modulos').select('*').order('orden').limit(2000);
      if (programaId) q = q.eq('programa_id', programaId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Modulo[];
    },
  });
}

/**
 * Trae actividades incluyendo las del módulo principal cuando se piden módulos copia.
 * Devuelve también un mapa { copiaId -> principalId } para que la UI sepa de dónde heredar.
 */
export function useActividades(modulos: Modulo[]) {
  // IDs efectivos a consultar: para copias usamos su principal
  const effectiveIds = Array.from(new Set(
    modulos.map((m) => m.modulo_principal_id ?? m.id)
  ));

  return useQuery({
    queryKey: ['actividades', effectiveIds.slice().sort().join(',')],
    queryFn: async () => {
      if (effectiveIds.length === 0) return [] as Actividad[];
      const { data, error } = await supabase
        .from('actividades').select('*').in('modulo_id', effectiveIds).order('orden').limit(20000);
      if (error) throw error;
      return data as Actividad[];
    },
    enabled: effectiveIds.length > 0,
  });
}

/** Devuelve las actividades que aplican a un módulo (las suyas, o las del principal si es copia). */
export function actividadesDeModulo(modulo: Modulo, todas: Actividad[]): Actividad[] {
  const sourceId = modulo.modulo_principal_id ?? modulo.id;
  return todas.filter((a) => a.modulo_id === sourceId);
}
