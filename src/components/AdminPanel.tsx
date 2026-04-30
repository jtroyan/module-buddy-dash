import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Settings, UserPlus, Upload, RefreshCw, Loader2, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Categorías reconocidas en el Excel — keywords -> key interna
const CATEGORIA_KEYWORDS: Array<{ key: string; patterns: RegExp[] }> = [
  { key: 'banner', patterns: [/banner/i] },
  { key: 'video', patterns: [/video/i] },
  { key: 'ruta', patterns: [/ruta/i] },
  { key: 'plan_aula', patterns: [/plan.*aula/i, /aula/i] },
  { key: 'ccd', patterns: [/ccd/i] },
  { key: 'tecnopedagogica', patterns: [/tecnoped/i, /ficha/i] },
];

function detectarCategoria(texto: string): string {
  for (const c of CATEGORIA_KEYWORDS) for (const p of c.patterns) if (p.test(texto)) return c.key;
  return 'otra';
}

export function AdminPanel() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
          <Settings className="h-4 w-4" /> Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Panel de administración</DialogTitle>
          <DialogDescription>Gestiona usuarios, importa datos y mantiene módulos comunes.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="usuarios" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="usuarios" className="gap-1.5"><UserPlus className="h-4 w-4" />Usuarios</TabsTrigger>
            <TabsTrigger value="importar" className="gap-1.5"><Upload className="h-4 w-4" />Importar</TabsTrigger>
            <TabsTrigger value="comunes" className="gap-1.5"><Layers className="h-4 w-4" />Comunes</TabsTrigger>
          </TabsList>
          <TabsContent value="usuarios" className="mt-4"><CrearUsuario /></TabsContent>
          <TabsContent value="importar" className="mt-4"><ImportarExcel onDone={() => setOpen(false)} /></TabsContent>
          <TabsContent value="comunes" className="mt-4"><GestionComunes /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CrearUsuario() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { email: email.trim(), password, role },
    });
    setBusy(false);
    if (error || (data && (data as any).error)) {
      toast.error((data as any)?.error ?? error?.message ?? 'Error');
      return;
    }
    toast.success(`Usuario ${email} creado`);
    setEmail(''); setPassword(''); setRole('user');
  };

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ne">Correo</Label>
          <Input id="ne" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np">Contraseña inicial (≥ 8 caracteres)</Label>
          <Input id="np" type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Rol</Label>
          <Select value={role} onValueChange={(v) => setRole(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuario (puede editar estados)</SelectItem>
              <SelectItem value="admin">Administrador (control total)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Loader2 className="animate-spin h-4 w-4" /> : 'Crear usuario'}
        </Button>
        <p className="text-xs text-muted-foreground">El usuario podrá iniciar sesión inmediatamente con ese correo y contraseña.</p>
      </form>
    </Card>
  );
}

function ImportarExcel({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [resumen, setResumen] = useState<{ programas: number; modulos: number; actividades: number } | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setResumen(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });

      // Próximo orden disponible para programas
      const { data: maxProg } = await supabase.from('programas').select('orden').order('orden', { ascending: false }).limit(1);
      let nextProgOrden = (maxProg?.[0]?.orden ?? -1) + 1;

      let cProg = 0, cMod = 0, cAct = 0;

      for (const sheetName of wb.SheetNames) {
        if (/^(resumen|portada|índice|indice)$/i.test(sheetName)) continue;
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        if (rows.length < 2) continue;

        // Buscar fila de encabezados (la primera con varias celdas no nulas)
        let headerIdx = rows.findIndex((r) => r.filter((c) => c != null && String(c).trim() !== '').length >= 3);
        if (headerIdx < 0) continue;
        const headers = rows[headerIdx].map((h) => (h == null ? '' : String(h).trim()));

        // Programa: si ya existe por nombre, lo reusamos; si no, lo creamos
        const nombrePrograma = sheetName.trim();
        let programaId: string;
        const { data: existProg } = await supabase.from('programas').select('id').eq('nombre', nombrePrograma).maybeSingle();
        if (existProg) {
          programaId = existProg.id;
        } else {
          const { data: ins, error: insErr } = await supabase.from('programas')
            .insert({ nombre: nombrePrograma, orden: nextProgOrden++ }).select('id').single();
          if (insErr) throw insErr;
          programaId = ins.id;
          cProg++;
        }

        // Cada fila siguiente = un módulo
        let nMod = 0;
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.filter((c) => c != null && String(c).trim() !== '').length < 1) continue;

          // Heurística: primera columna numérica = número, segunda no vacía = nombre
          let numero: number | null = null;
          let nombreModulo = '';
          for (let c = 0; c < r.length; c++) {
            const v = r[c];
            if (v == null || String(v).trim() === '') continue;
            if (numero == null && !isNaN(Number(v)) && String(v).length < 4) {
              numero = Number(v);
            } else if (!nombreModulo) {
              nombreModulo = String(v).trim();
              break;
            }
          }
          if (!nombreModulo) continue;

          // Crear módulo
          const { data: insMod, error: errMod } = await supabase.from('modulos')
            .insert({ programa_id: programaId, numero, nombre: nombreModulo, orden: nMod++ })
            .select('id').single();
          if (errMod) continue;
          cMod++;

          // Actividades: cada columna restante con valor
          let ord = 0;
          const actsToInsert: any[] = [];
          for (let c = 0; c < headers.length; c++) {
            const h = headers[c];
            if (!h) continue;
            const v = r[c];
            if (v == null || String(v).trim() === '') continue;
            // Saltar columna de número/nombre del módulo
            if (/m[óo]dulo|nombre|n[°º]|^#$/i.test(h) && c < 2) continue;
            const cat = detectarCategoria(h);
            actsToInsert.push({
              modulo_id: insMod.id,
              categoria: cat,
              nombre_actividad: h,
              valor: String(v).trim(),
              estado: 'Revisión',
              orden: ord++,
            });
          }
          if (actsToInsert.length > 0) {
            const { error: errAct } = await supabase.from('actividades').insert(actsToInsert);
            if (!errAct) cAct += actsToInsert.length;
          }
        }
      }

      // Re-detectar comunes y limpiar copias
      await supabase.rpc('detectar_modulos_comunes');
      await supabase.rpc('limpiar_actividades_copias');

      setResumen({ programas: cProg, modulos: cMod, actividades: cAct });
      toast.success(`Importado: ${cProg} programas, ${cMod} módulos, ${cAct} actividades`);
      qc.invalidateQueries();
    } catch (err) {
      toast.error('Error importando: ' + (err as Error).message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h4 className="font-semibold mb-1">Importar desde Excel</h4>
        <p className="text-sm text-muted-foreground">
          Cada hoja del Excel se importa como un programa. Las columnas se detectan como actividades (banners, videos, rutas, etc.).
          Si un programa con el mismo nombre ya existe, se reutiliza y se le agregan los nuevos módulos.
        </p>
      </div>
      <Label htmlFor="xlsx" className="block">
        <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors">
          {busy ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
              <span className="text-sm">Procesando…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">Click para seleccionar .xlsx / .xls</span>
            </div>
          )}
        </div>
        <input id="xlsx" type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} disabled={busy} />
      </Label>
      {resumen && (
        <div className="text-sm bg-estado-ok-bg text-estado-ok p-3 rounded-lg">
          ✓ {resumen.programas} programas nuevos · {resumen.modulos} módulos · {resumen.actividades} actividades
        </div>
      )}
    </Card>
  );
}

function GestionComunes() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<{ grupos: number; copias: number; borradas: number } | null>(null);

  const ejecutar = async () => {
    setBusy(true);
    setResultado(null);
    const { data: det, error: e1 } = await supabase.rpc('detectar_modulos_comunes');
    if (e1) { toast.error(e1.message); setBusy(false); return; }
    const { data: del, error: e2 } = await supabase.rpc('limpiar_actividades_copias');
    if (e2) { toast.error(e2.message); setBusy(false); return; }
    const row = (det as any[])?.[0];
    setResultado({
      grupos: row?.grupos_detectados ?? 0,
      copias: row?.copias_marcadas ?? 0,
      borradas: (del as any) ?? 0,
    });
    toast.success('Detección completada');
    qc.invalidateQueries();
    setBusy(false);
  };

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h4 className="font-semibold mb-1">Detectar módulos comunes</h4>
        <p className="text-sm text-muted-foreground">
          Agrupa módulos con el mismo nombre que aparecen en varios programas. El primero (por orden de programa) queda como
          principal y los demás heredan su estado. Las actividades de las copias se eliminan para evitar duplicar trabajo.
        </p>
      </div>
      <Button onClick={ejecutar} disabled={busy} className="w-full gap-2">
        {busy ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
        Re-detectar y limpiar
      </Button>
      {resultado && (
        <div className="text-sm bg-muted p-3 rounded-lg space-y-1">
          <div>📦 <strong>{resultado.grupos}</strong> grupos de módulos comunes</div>
          <div>🔗 <strong>{resultado.copias}</strong> copias marcadas (heredan estado)</div>
          <div>🧹 <strong>{resultado.borradas}</strong> actividades duplicadas eliminadas</div>
        </div>
      )}
    </Card>
  );
}
