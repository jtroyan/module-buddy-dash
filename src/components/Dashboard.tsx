import { Card } from '@/components/ui/card';
import { CATEGORIAS, isCompleto, type CategoriaKey } from '@/lib/produccion';
import type { Actividad, Modulo, Programa } from '@/hooks/useProduccion';
import { useMemo } from 'react';
import { CheckCircle2, Clock, AlertCircle, BookOpen, Layers, TrendingUp } from 'lucide-react';

interface Props {
  programas: Programa[];
  modulos: Modulo[];
  actividades: Actividad[];
}

export function Dashboard({ programas, modulos, actividades }: Props) {
  const stats = useMemo(() => {
    const total = actividades.length;
    const completadas = actividades.filter((a) => isCompleto(a.estado)).length;
    const pendientes = actividades.filter((a) => /pendiente/i.test(a.estado)).length;
    const enRevision = total - completadas - pendientes;
    const pct = total > 0 ? (completadas / total) * 100 : 0;
    return { total, completadas, pendientes, enRevision, pct };
  }, [actividades]);

  const porCategoria = useMemo(() => {
    return CATEGORIAS.map((c) => {
      const items = actividades.filter((a) => a.categoria === c.key);
      const ok = items.filter((a) => isCompleto(a.estado)).length;
      return {
        ...c,
        total: items.length,
        completadas: ok,
        pct: items.length > 0 ? (ok / items.length) * 100 : 0,
      };
    });
  }, [actividades]);

  const porPrograma = useMemo(() => {
    return programas.map((p) => {
      const mods = modulos.filter((m) => m.programa_id === p.id);
      const moduloIds = new Set(mods.map((m) => m.id));
      const acts = actividades.filter((a) => moduloIds.has(a.modulo_id));
      const ok = acts.filter((a) => isCompleto(a.estado)).length;
      return {
        ...p,
        modulos: mods.length,
        actividades: acts.length,
        completadas: ok,
        pct: acts.length > 0 ? (ok / acts.length) * 100 : 0,
      };
    });
  }, [programas, modulos, actividades]);

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Programas"
          value={programas.length}
          icon={<Layers className="h-5 w-5" />}
          gradient="gradient-primary"
        />
        <KpiCard
          label="Módulos virtuales"
          value={modulos.length}
          icon={<BookOpen className="h-5 w-5" />}
          gradient="gradient-primary"
        />
        <KpiCard
          label="Actividades totales"
          value={stats.total}
          icon={<TrendingUp className="h-5 w-5" />}
          gradient="gradient-primary"
        />
        <KpiCard
          label="Avance global"
          value={`${stats.pct.toFixed(1)}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          gradient="gradient-accent"
          highlight
        />
      </div>

      {/* Mini stats de estado */}
      <div className="grid grid-cols-3 gap-4">
        <EstadoStat
          label="Completadas"
          value={stats.completadas}
          total={stats.total}
          color="ok"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <EstadoStat
          label="En revisión"
          value={stats.enRevision}
          total={stats.total}
          color="revision"
          icon={<Clock className="h-4 w-4" />}
        />
        <EstadoStat
          label="Pendientes"
          value={stats.pendientes}
          total={stats.total}
          color="pendiente"
          icon={<AlertCircle className="h-4 w-4" />}
        />
      </div>

      {/* Por categoría */}
      <div>
        <h3 className="text-lg font-display font-semibold mb-3">Avance por área de producción</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {porCategoria.map((c) => (
            <Card key={c.key} className="p-5 shadow-card hover:shadow-card-lg transition-all border-l-4" style={{ borderLeftColor: c.color }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-2xl mb-1">{c.icon}</div>
                  <div className="font-display font-semibold text-foreground">{c.label}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold" style={{ color: c.color }}>
                    {c.pct.toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {c.completadas} / {c.total} completadas
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Por programa */}
      <div>
        <h3 className="text-lg font-display font-semibold mb-3">Avance por programa académico</h3>
        <div className="space-y-3">
          {porPrograma.map((p) => (
            <Card key={p.id} className="p-5 shadow-card">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-foreground line-clamp-2">{p.nombre}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.modulos} módulos · {p.completadas} / {p.actividades} actividades completadas
                  </div>
                </div>
                <div className="text-2xl font-display font-bold text-primary shrink-0">
                  {p.pct.toFixed(1)}%
                </div>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full gradient-primary transition-all"
                  style={{ width: `${p.pct}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, icon, gradient, highlight,
}: { label: string; value: string | number; icon: React.ReactNode; gradient: string; highlight?: boolean }) {
  return (
    <Card className={`p-5 shadow-card border-0 ${gradient} text-primary-foreground ${highlight ? 'shadow-glow' : ''}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90 mb-2">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <div className="text-3xl font-display font-bold">{value}</div>
    </Card>
  );
}

function EstadoStat({
  label, value, total, color, icon,
}: { label: string; value: number; total: number; color: 'ok' | 'revision' | 'pendiente'; icon: React.ReactNode }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const colorMap = {
    ok: 'text-estado-ok bg-estado-ok-bg',
    revision: 'text-estado-revision bg-estado-revision-bg',
    pendiente: 'text-estado-pendiente bg-estado-pendiente-bg',
  };
  return (
    <Card className="p-4 shadow-card">
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium mb-2 ${colorMap[color]}`}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-display font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground">{pct.toFixed(1)}% del total</div>
    </Card>
  );
}
