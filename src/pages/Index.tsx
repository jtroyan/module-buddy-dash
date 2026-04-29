import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dashboard } from '@/components/Dashboard';
import { Kanban } from '@/components/Kanban';
import { TablaDetallada } from '@/components/TablaDetallada';
import { useProgramas, useModulos, useActividades } from '@/hooks/useProduccion';
import { LayoutDashboard, KanbanSquare, Table2, GraduationCap } from 'lucide-react';

const Index = () => {
  const [programaId, setProgramaId] = useState<string>('all');

  const { data: programas = [], isLoading: lp } = useProgramas();
  const { data: modulos = [], isLoading: lm } = useModulos(
    programaId === 'all' ? null : programaId,
  );
  const moduloIds = useMemo(() => modulos.map((m) => m.id), [modulos]);
  const { data: actividades = [], isLoading: la } = useActividades(moduloIds);

  const cargando = lp || lm || la;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="gradient-primary text-primary-foreground shadow-lg">
        <div className="container max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center shadow-glow">
                <GraduationCap className="h-7 w-7 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
                  Producción de Recursos Educativos
                </h1>
                <p className="text-sm text-primary-foreground/80 mt-0.5">
                  Seguimiento de módulos virtuales por programa académico
                </p>
              </div>
            </div>

            <div className="md:max-w-md w-full">
              <Select value={programaId} onValueChange={setProgramaId}>
                <SelectTrigger className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground backdrop-blur hover:bg-primary-foreground/15 h-11">
                  <SelectValue placeholder="Programa académico" />
                </SelectTrigger>
                <SelectContent className="max-w-[90vw]">
                  <SelectItem value="all">📚 Todos los programas</SelectItem>
                  {programas.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="whitespace-normal">
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="container max-w-7xl mx-auto px-4 py-6">
        {cargando ? (
          <LoadingState />
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList className="bg-card shadow-card border h-11 p-1">
              <TabsTrigger value="dashboard" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="kanban" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground gap-2">
                <KanbanSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
              <TabsTrigger value="tabla" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground gap-2">
                <Table2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tabla detallada</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-4">
              <Dashboard
                programas={programaId === 'all' ? programas : programas.filter((p) => p.id === programaId)}
                modulos={modulos}
                actividades={actividades}
              />
            </TabsContent>

            <TabsContent value="kanban" className="mt-4">
              <Kanban modulos={modulos} actividades={actividades} />
            </TabsContent>

            <TabsContent value="tabla" className="mt-4">
              <TablaDetallada modulos={modulos} actividades={actividades} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="container max-w-7xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
        Sistema de seguimiento de producción · {modulos.length} módulos · {actividades.length} actividades
      </footer>
    </div>
  );
};

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    </div>
  );
}

export default Index;
