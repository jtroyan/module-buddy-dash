import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Programa = {
  id: string;
  nombre: string;
  orden: number;
};

export type Modulo = {
  id: string;
  programa_id: string;
  numero: number | null;
  nombre: string;
  orden: number;
};

export type Actividad = {
  id: string;
  modulo_id: string;
  categoria: string;
  nombre_actividad: string;
  valor: string | null;
  estado: string;
  observacion: string | null;
  orden: number;
};

export function useProgramas() {
  return useQuery({
    queryKey: ['programas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programas')
        .select('*')
        .order('orden');
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

export function useActividades(moduloIds?: string[]) {
  return useQuery({
    queryKey: ['actividades', moduloIds?.length ? moduloIds.slice().sort().join(',') : 'all'],
    queryFn: async () => {
      let q = supabase.from('actividades').select('*').order('orden').limit(20000);
      if (moduloIds && moduloIds.length > 0) {
        q = q.in('modulo_id', moduloIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Actividad[];
    },
    enabled: moduloIds === undefined || moduloIds.length > 0,
  });
}
