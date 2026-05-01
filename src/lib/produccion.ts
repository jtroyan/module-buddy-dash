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

/**
 * Devuelve el id del programa de origen del módulo (su principal si es copia, o el suyo).
 * Necesita la lista completa de módulos cargados para poder mirar al principal.
 */
export function programaOrigenDeModulo(
  modulo: { id: string; programa_id: string; modulo_principal_id: string | null },
  todosLosModulos: { id: string; programa_id: string }[],
): string {
  if (modulo.modulo_principal_id) {
    const principal = todosLosModulos.find((m) => m.id === modulo.modulo_principal_id);
    if (principal) return principal.programa_id;
  }
  return modulo.programa_id;
}

/** Etiqueta visual para el módulo, agregando indicador de común con el programa de origen. */
export function nombreModulo(
  modulo: { nombre: string; numero: number | null; es_comun: boolean; modulo_principal_id: string | null; programa_id: string; id: string },
  programas: { id: string; nombre: string }[],
  todosLosModulos?: { id: string; programa_id: string }[],
): string {
  const base = modulo.numero != null ? `Módulo ${modulo.numero} — ${modulo.nombre}` : modulo.nombre;
  if (modulo.es_comun) {
    const origenId = todosLosModulos
      ? programaOrigenDeModulo(modulo, todosLosModulos)
      : modulo.programa_id;
    const prog = programas.find((p) => p.id === origenId);
    const corto = prog ? nombreCortoPrograma(prog.nombre) : 'otro programa';
    if (modulo.modulo_principal_id) {
      return `${base}  ·  Módulo común de ${corto} (heredado)`;
    }
    return `${base}  ·  Módulo común — Principal de ${corto}`;
  }
  return base;
}
