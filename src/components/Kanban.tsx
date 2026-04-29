import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CATEGORIAS, isCompleto } from '@/lib/produccion';
import type { Actividad, Modulo } from '@/hooks/useProduccion';

interface Props {
  modulos: Modulo[];
  actividades: Actividad[];
}

const COLUMNAS = [
  { key: 'sin_iniciar', label: 'Sin iniciar / Revisión', color: 'estado-revision' },
  { key: 'en_proceso', label: 'En proceso', color: 'estado-pendiente' },
  { key: 'completado', label: 'Completado', color: 'estado-ok' },
] as const;

type ColumnaKey = typeof COLUMNAS[number]['key'];

function clasificarModulo(actividades: Actividad[]): ColumnaKey {
  if (actividades.length === 0) return 'sin_iniciar';
  const completadas = actividades.filter((a) => isCompleto(a.estado)).length;
  if (completadas === actividades.length) return 'completado';
  if (completadas === 0) return 'sin_iniciar';
  return 'en_proceso';
}

export function Kanban({ modulos, actividades }: Props) {
  const grupos = useMemo(() => {
    const map: Record<ColumnaKey, Array<{ modulo: Modulo; total: number; completadas: number }>> = {
      sin_iniciar: [], en_proceso: [], completado: [],
    };
    const porModulo = new Map<string, Actividad[]>();
    for (const a of actividades) {
      if (!porModulo.has(a.modulo_id)) porModulo.set(a.modulo_id, []);
      porModulo.get(a.modulo_id)!.push(a);
    }
    for (const m of modulos) {
      const acts = porModulo.get(m.id) ?? [];
      const col = clasificarModulo(acts);
      map[col].push({
        modulo: m,
        total: acts.length,
        completadas: acts.filter((a) => isCompleto(a.estado)).length,
      });
    }
    return map;
  }, [modulos, actividades]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNAS.map((col) => {
        const items = grupos[col.key];
        return (
          <div key={col.key} className="flex flex-col bg-card rounded-xl border shadow-card overflow-hidden">
            <div className={`px-4 py-3 border-b bg-${col.color}-bg`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-display font-semibold text-${col.color}`}>{col.label}</h3>
                <Badge variant="secondary" className="font-display">{items.length}</Badge>
              </div>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="p-3 space-y-2">
                {items.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Sin módulos
                  </div>
                )}
                {items.map(({ modulo, total, completadas }) => (
                  <ModuloCard
                    key={modulo.id}
                    modulo={modulo}
                    total={total}
                    completadas={completadas}
                    actividades={actividades.filter((a) => a.modulo_id === modulo.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

function ModuloCard({
  modulo, total, completadas, actividades,
}: { modulo: Modulo; total: number; completadas: number; actividades: Actividad[] }) {
  const pct = total > 0 ? (completadas / total) * 100 : 0;
  const porCat = CATEGORIAS.map((c) => {
    const items = actividades.filter((a) => a.categoria === c.key);
    const ok = items.filter((a) => isCompleto(a.estado)).length;
    return { ...c, total: items.length, ok };
  });

  return (
    <Card className="p-3 hover:shadow-md transition-all cursor-pointer hover:border-primary/40 group">
      <div className="flex items-start gap-2 mb-2">
        {modulo.numero != null && (
          <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
            #{modulo.numero}
          </span>
        )}
        <div className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {modulo.nombre}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full gradient-primary rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-display font-semibold text-muted-foreground tabular-nums">
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {porCat.map((c) => (
          <span
            key={c.key}
            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60"
            title={`${c.label}: ${c.ok}/${c.total}`}
          >
            <span>{c.icon}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {c.ok}/{c.total}
            </span>
          </span>
        ))}
      </div>
    </Card>
  );
}
