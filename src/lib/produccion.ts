export const CATEGORIAS = [
  { key: 'banner', label: 'Banners', icon: '🎨', color: 'hsl(280 70% 55%)' },
  { key: 'video', label: 'Videos', icon: '🎬', color: 'hsl(0 75% 55%)' },
  { key: 'ruta', label: 'Rutas Formativas', icon: '🗺️', color: 'hsl(38 92% 52%)' },
  { key: 'plan_aula', label: 'Plan de Aula', icon: '📋', color: 'hsl(200 85% 45%)' },
  { key: 'ccd', label: 'CCD', icon: '📚', color: 'hsl(142 71% 38%)' },
  { key: 'tecnopedagogica', label: 'Ficha Tecnopedagógica', icon: '🧩', color: 'hsl(218 70% 35%)' },
] as const;

export type CategoriaKey = typeof CATEGORIAS[number]['key'];

export const ESTADOS_PRINCIPALES = [
  'Revisión','OK','Pendiente','Correcto','Sin Revisión','Cargar en drive','N/A',
] as const;

export function normalizarEstado(estado: string | null | undefined): string {
  if (!estado) return 'Revisión';
  const e = estado.trim();
  if (!e) return 'Revisión';
  if (/^https?:\/\//i.test(e)) return 'OK';
  for (const principal of ESTADOS_PRINCIPALES) {
    if (e.toLowerCase() === principal.toLowerCase()) return principal;
  }
  if (e.length > 30) return 'Revisión';
  return e;
}

export function colorEstado(estado: string): { bg: string; fg: string; border: string } {
  const n = normalizarEstado(estado);
  switch (n) {
    case 'OK':
    case 'Correcto':
      return { bg: 'bg-estado-ok-bg', fg: 'text-estado-ok', border: 'border-estado-ok/30' };
    case 'Pendiente':
    case 'Cargar en drive':
      return { bg: 'bg-estado-pendiente-bg', fg: 'text-estado-pendiente', border: 'border-estado-pendiente/30' };
    case 'N/A':
      return { bg: 'bg-estado-na-bg', fg: 'text-estado-na', border: 'border-estado-na/30' };
    case 'Sin Revisión':
      return { bg: 'bg-estado-error-bg', fg: 'text-estado-error', border: 'border-estado-error/30' };
    case 'Revisión':
    default:
      return { bg: 'bg-estado-revision-bg', fg: 'text-estado-revision', border: 'border-estado-revision/30' };
  }
}

export function isCompleto(estado: string): boolean {
  const n = normalizarEstado(estado);
  return n === 'OK' || n === 'Correcto';
}

export function nombreCortoPrograma(nombre: string): string {
  const m = nombre.match(/(?:Tecnolog[íi]a|Tecnol[óo]gico|Ingenier[íi]a) (?:en|del?) ([A-ZÁÉÍÓÚa-záéíóú\s]+?)(?: por| articulad| con|$)/i);
  if (m) return m[1].trim();
  return nombre.length > 50 ? nombre.slice(0, 50) + '…' : nombre;
}

/** Etiqueta visual para el módulo, agregando indicador de común. */
export function nombreModulo(
  modulo: { nombre: string; numero: number | null; es_comun: boolean; modulo_principal_id: string | null; programa_id: string },
  programas: { id: string; nombre: string }[],
): string {
  const base = modulo.numero != null ? `Módulo ${modulo.numero} — ${modulo.nombre}` : modulo.nombre;
  if (modulo.es_comun) {
    if (modulo.modulo_principal_id) {
      return `${base}  ·  Módulo común (heredado)`;
    }
    const prog = programas.find((p) => p.id === modulo.programa_id);
    const corto = prog ? nombreCortoPrograma(prog.nombre) : '';
    return `${base}  ·  Módulo común — Principal de ${corto}`;
  }
  return base;
}
