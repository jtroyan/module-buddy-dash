import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { CATEGORIAS, isCompleto, type CategoriaKey } from '@/lib/produccion';
import { EstadoSelect } from './EstadoSelect';
import { actividadesDeModulo, type Actividad, type Modulo, type Programa } from '@/hooks/useProduccion';
import { Search, ExternalLink, Link2 } from 'lucide-react';

interface Props {
  modulos: Modulo[];
  actividades: Actividad[];
  programas: Programa[];
}

export function TablaDetallada({ modulos, actividades, programas }: Props) {
  const [filtro, setFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaKey | 'todas'>('todas');

  // Mapa programa_id -> nombre corto, para mostrar de qué programa viene el principal en módulos comunes
  const nombrePrograma = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of programas) m.set(p.id, p.nombre);
    return m;
  }, [programas]);

  // Mapa para resolver el programa del módulo principal (cuando es copia)
  const programaPrincipalDeCopia = useMemo(() => {
    // Si tenemos solo un subset de módulos cargados (filtrado), igual sirve si el principal está en la lista
    const m = new Map<string, string>(); // moduloId -> programa_id del principal
    const all = new Map<string, Modulo>();
    for (const x of modulos) all.set(x.id, x);
    for (const x of modulos) {
      if (x.modulo_principal_id) {
        const p = all.get(x.modulo_principal_id);
        if (p) m.set(x.id, p.programa_id);
      }
    }
    return m;
  }, [modulos]);

  const modulosFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return modulos;
    return modulos.filter((m) =>
      m.nombre.toLowerCase().includes(q) || String(m.numero ?? '').includes(q),
    );
  }, [modulos, filtro]);

  // Para cada módulo (incluso copia), traemos sus actividades efectivas (heredadas si es copia)
  const actsPorModulo = useMemo(() => {
    const m = new Map<string, Actividad[]>();
    for (const mod of modulos) {
      const all = actividadesDeModulo(mod, actividades);
      const filt = categoriaFiltro === 'todas' ? all : all.filter((a) => a.categoria === categoriaFiltro);
      m.set(mod.id, filt);
    }
    return m;
  }, [modulos, actividades, categoriaFiltro]);

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar módulo por nombre o número…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <FilterChip active={categoriaFiltro === 'todas'} onClick={() => setCategoriaFiltro('todas')}>
              Todas
            </FilterChip>
            {CATEGORIAS.map((c) => (
              <FilterChip
                key={c.key}
                active={categoriaFiltro === c.key}
                onClick={() => setCategoriaFiltro(c.key)}
              >
                {c.icon} {c.label}
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Mostrando <strong className="text-foreground">{modulosFiltrados.length}</strong> de {modulos.length} módulos
        </div>
      </Card>

      <Accordion type="multiple" className="space-y-2">
        {modulosFiltrados.map((m) => {
          const acts = actsPorModulo.get(m.id) ?? [];
          const total = acts.length;
          const completadas = acts.filter((a) => isCompleto(a.estado)).length;
          const pct = total > 0 ? (completadas / total) * 100 : 0;
          const esCopia = !!m.modulo_principal_id;
          const progPrincipalId = programaPrincipalDeCopia.get(m.id);
          const nombreProgPrincipal = progPrincipalId ? nombrePrograma.get(progPrincipalId) : null;

          return (
            <AccordionItem
              key={m.id}
              value={m.id}
              className="border rounded-xl bg-card shadow-card overflow-hidden data-[state=open]:shadow-card-lg"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
                <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  {m.numero != null && (
                    <span className="text-xs font-mono text-muted-foreground shrink-0 w-8">#{m.numero}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{m.nombre}</span>
                      {m.es_comun && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent-foreground border border-accent/30">
                          <Link2 className="h-2.5 w-2.5" />
                          {esCopia
                            ? `Común — heredado de ${nombreProgPrincipal ?? 'programa principal'}`
                            : 'Común — principal'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden flex-1 max-w-[200px]">
                        <div className="h-full gradient-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {completadas}/{total} · {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {total === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Sin actividades en esta categoría
                  </div>
                ) : (
                  <ActividadesPorCategoria actividades={acts} />
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
        {modulosFiltrados.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No se encontraron módulos con esos criterios.
          </Card>
        )}
      </Accordion>
    </div>
  );
}

function ActividadesPorCategoria({ actividades }: { actividades: Actividad[] }) {
  const agrupadas = useMemo(() => {
    const m = new Map<string, Actividad[]>();
    for (const a of actividades) {
      if (!m.has(a.categoria)) m.set(a.categoria, []);
      m.get(a.categoria)!.push(a);
    }
    return m;
  }, [actividades]);

  return (
    <div className="space-y-3">
      {CATEGORIAS.filter((c) => agrupadas.has(c.key)).map((c) => {
        const items = agrupadas.get(c.key)!;
        return (
          <div key={c.key}>
            <div className="flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>{c.icon}</span>
              <span style={{ color: c.color }}>{c.label}</span>
              <Badge variant="outline" className="text-[10px] h-5">{items.length}</Badge>
            </div>
            <div className="grid gap-1.5">
              {items.map((a) => (
                <ActividadRow key={a.id} actividad={a} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActividadRow({ actividad }: { actividad: Actividad }) {
  const isUrl = actividad.valor && /^https?:\/\//i.test(actividad.valor);
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{actividad.nombre_actividad}</div>
        {actividad.valor && !isUrl && (
          <div className="text-xs text-muted-foreground truncate">{actividad.valor}</div>
        )}
        {isUrl && (
          <a
            href={actividad.valor!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ver enlace
          </a>
        )}
        {actividad.observacion && actividad.observacion !== 'N/A' && (
          <div className="text-xs text-muted-foreground italic mt-0.5">
            💬 {actividad.observacion}
          </div>
        )}
      </div>
      <EstadoSelect actividadId={actividad.id} estado={actividad.estado} />
    </div>
  );
}

function FilterChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active
          ? 'gradient-primary text-primary-foreground shadow-sm'
          : 'bg-muted text-muted-foreground hover:bg-muted/70'
      }`}
    >
      {children}
    </button>
  );
}
