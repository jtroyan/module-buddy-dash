import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Settings, UserPlus, Upload, RefreshCw, Loader2, Layers, FolderPlus, FilePlus, Download, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Panel de administración</DialogTitle>
          <DialogDescription>Gestiona usuarios, datos, módulos comunes y respaldos.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="usuarios" className="mt-2">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="usuarios" className="gap-1 text-xs"><UserPlus className="h-3.5 w-3.5" />Usuarios</TabsTrigger>
            <TabsTrigger value="importar" className="gap-1 text-xs"><Upload className="h-3.5 w-3.5" />Importar</TabsTrigger>
            <TabsTrigger value="programa" className="gap-1 text-xs"><FolderPlus className="h-3.5 w-3.5" />Programa</TabsTrigger>
            <TabsTrigger value="modulo" className="gap-1 text-xs"><FilePlus className="h-3.5 w-3.5" />Módulo</TabsTrigger>
            <TabsTrigger value="comunes" className="gap-1 text-xs"><Layers className="h-3.5 w-3.5" />Comunes</TabsTrigger>
            <TabsTrigger value="backup" className="gap-1 text-xs"><Database className="h-3.5 w-3.5" />Backup</TabsTrigger>
          </TabsList>
          <TabsContent value="usuarios" className="mt-4"><CrearUsuario /></TabsContent>
          <TabsContent value="importar" className="mt-4"><ImportarExcel /></TabsContent>
          <TabsContent value="programa" className="mt-4"><CrearPrograma /></TabsContent>
          <TabsContent value="modulo" className="mt-4"><CrearModulo /></TabsContent>
          <TabsContent value="comunes" className="mt-4"><GestionComunes /></TabsContent>
          <TabsContent value="backup" className="mt-4"><BackupRestaurar /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────── Usuarios
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
      </form>
    </Card>
  );
}

// ─────────────────────────────────────────────── Importar Excel (sin cambios mayores)
function ImportarExcel() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [resumen, setResumen] = useState<{ programas: number; modulos: number; actividades: number } | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setResumen(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const { data: maxProg } = await supabase.from('programas').select('orden').order('orden', { ascending: false }).limit(1);
      let nextProgOrden = (maxProg?.[0]?.orden ?? -1) + 1;
      let cProg = 0, cMod = 0, cAct = 0;

      for (const sheetName of wb.SheetNames) {
        if (/^(resumen|portada|índice|indice)$/i.test(sheetName)) continue;
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        if (rows.length < 2) continue;
        const headerIdx = rows.findIndex((r) => r.filter((c) => c != null && String(c).trim() !== '').length >= 3);
        if (headerIdx < 0) continue;
        const headers = rows[headerIdx].map((h) => (h == null ? '' : String(h).trim()));

        const nombrePrograma = sheetName.trim();
        let programaId: string;
        const { data: existProg } = await supabase.from('programas').select('id').eq('nombre', nombrePrograma).maybeSingle();
        if (existProg) programaId = existProg.id;
        else {
          const { data: ins, error: insErr } = await supabase.from('programas').insert({ nombre: nombrePrograma, orden: nextProgOrden++ }).select('id').single();
          if (insErr) throw insErr;
          programaId = ins.id; cProg++;
        }

        let nMod = 0;
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.filter((c) => c != null && String(c).trim() !== '').length < 1) continue;
          let numero: number | null = null;
          let nombreModulo = '';
          for (let c = 0; c < r.length; c++) {
            const v = r[c];
            if (v == null || String(v).trim() === '') continue;
            if (numero == null && !isNaN(Number(v)) && String(v).length < 4) numero = Number(v);
            else if (!nombreModulo) { nombreModulo = String(v).trim(); break; }
          }
          if (!nombreModulo) continue;
          const { data: insMod, error: errMod } = await supabase.from('modulos').insert({ programa_id: programaId, numero, nombre: nombreModulo, orden: nMod++ }).select('id').single();
          if (errMod) continue;
          cMod++;

          let ord = 0;
          const acts: any[] = [];
          for (let c = 0; c < headers.length; c++) {
            const h = headers[c]; if (!h) continue;
            const v = r[c]; if (v == null || String(v).trim() === '') continue;
            if (/m[óo]dulo|nombre|n[°º]|^#$/i.test(h) && c < 2) continue;
            acts.push({ modulo_id: insMod.id, categoria: detectarCategoria(h), nombre_actividad: h, valor: String(v).trim(), estado: 'Revisión', orden: ord++ });
          }
          if (acts.length > 0) {
            const { error: errAct } = await supabase.from('actividades').insert(acts);
            if (!errAct) cAct += acts.length;
          }
        }
      }
      await supabase.rpc('detectar_modulos_comunes');
      await supabase.rpc('limpiar_actividades_copias');
      setResumen({ programas: cProg, modulos: cMod, actividades: cAct });
      toast.success(`Importado: ${cProg} programas, ${cMod} módulos, ${cAct} actividades`);
      qc.invalidateQueries();
    } catch (err) {
      toast.error('Error: ' + (err as Error).message);
    } finally {
      setBusy(false); e.target.value = '';
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <p className="text-sm text-muted-foreground">Cada hoja = un programa. Si ya existe, se reutiliza y se le agregan los nuevos módulos.</p>
      <Label htmlFor="xlsx" className="block">
        <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors">
          {busy ? <div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin h-6 w-6 text-primary" /><span className="text-sm">Procesando…</span></div>
            : <div className="flex flex-col items-center gap-2"><Upload className="h-6 w-6 text-muted-foreground" /><span className="text-sm font-medium">Click para seleccionar .xlsx / .xls</span></div>}
        </div>
        <input id="xlsx" type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} disabled={busy} />
      </Label>
      {resumen && <div className="text-sm bg-estado-ok-bg text-estado-ok p-3 rounded-lg">✓ {resumen.programas} programas · {resumen.modulos} módulos · {resumen.actividades} actividades</div>}
    </Card>
  );
}

// ─────────────────────────────────────────────── Crear programa
function CrearPrograma() {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data: maxProg } = await supabase.from('programas').select('orden').order('orden', { ascending: false }).limit(1);
    const orden = (maxProg?.[0]?.orden ?? -1) + 1;
    const { error } = await supabase.from('programas').insert({ nombre: nombre.trim(), orden });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Programa "${nombre}" creado`);
    setNombre('');
    qc.invalidateQueries();
  };

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="np">Nombre del programa académico</Label>
          <Input id="np" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Tecnología en Desarrollo de Software" />
        </div>
        <Button type="submit" disabled={busy || !nombre.trim()} className="w-full">
          {busy ? <Loader2 className="animate-spin h-4 w-4" /> : 'Crear programa'}
        </Button>
      </form>
    </Card>
  );
}

// ─────────────────────────────────────────────── Crear módulo
function CrearModulo() {
  const qc = useQueryClient();
  const [programas, setProgramas] = useState<{ id: string; nombre: string }[]>([]);
  const [modulosExistentes, setModulosExistentes] = useState<Array<{ id: string; nombre: string; programa_id: string; numero: number | null }>>([]);
  const [programaId, setProgramaId] = useState('');
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [esComun, setEsComun] = useState(false);
  const [heredarDe, setHeredarDe] = useState<string>(''); // id de un módulo principal existente
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: ps } = await supabase.from('programas').select('id,nombre').order('orden');
      setProgramas(ps ?? []);
      // Solo módulos principales (no copias): pueden ser fuente de herencia
      const { data: ms } = await supabase.from('modulos').select('id,nombre,programa_id,numero').is('modulo_principal_id', null).order('nombre').limit(2000);
      setModulosExistentes(ms ?? []);
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programaId) { toast.error('Selecciona un programa'); return; }
    setBusy(true);
    try {
      const { data: maxOrden } = await supabase.from('modulos').select('orden').eq('programa_id', programaId).order('orden', { ascending: false }).limit(1);
      const orden = (maxOrden?.[0]?.orden ?? -1) + 1;
      const num = numero.trim() ? Number(numero) : null;

      // Caso 1: heredar de un módulo existente -> es copia común
      if (esComun && heredarDe) {
        const principal = modulosExistentes.find((m) => m.id === heredarDe);
        if (!principal) throw new Error('Módulo principal no encontrado');
        // Asegurar que el principal está marcado como común
        await supabase.from('modulos').update({ es_comun: true, modulo_principal_id: null }).eq('id', heredarDe);
        const { error } = await supabase.from('modulos').insert({
          programa_id: programaId,
          nombre: principal.nombre,
          numero: num ?? principal.numero,
          orden,
          es_comun: true,
          modulo_principal_id: heredarDe,
        });
        if (error) throw error;
        toast.success(`Módulo común creado (hereda de ${principal.nombre})`);
      } else {
        // Caso 2: módulo nuevo (puede marcarse como común principal)
        if (!nombre.trim()) throw new Error('Falta el nombre');
        const { error } = await supabase.from('modulos').insert({
          programa_id: programaId,
          nombre: nombre.trim(),
          numero: num,
          orden,
          es_comun: esComun,
          modulo_principal_id: null,
        });
        if (error) throw error;
        toast.success(esComun ? 'Módulo creado como común (principal)' : 'Módulo creado');
      }

      setNombre(''); setNumero(''); setEsComun(false); setHeredarDe('');
      qc.invalidateQueries();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Programa destino</Label>
          <Select value={programaId} onValueChange={setProgramaId}>
            <SelectTrigger><SelectValue placeholder="Selecciona el programa" /></SelectTrigger>
            <SelectContent>
              {programas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40">
          <Checkbox id="ec" checked={esComun} onCheckedChange={(v) => { setEsComun(!!v); if (!v) setHeredarDe(''); }} />
          <Label htmlFor="ec" className="cursor-pointer text-sm">
            Marcar como módulo común
          </Label>
        </div>

        {esComun && (
          <div className="space-y-1.5 pl-3 border-l-2 border-accent">
            <Label>Heredar de un módulo existente (opcional)</Label>
            <Select value={heredarDe || 'nuevo'} onValueChange={(v) => setHeredarDe(v === 'nuevo' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="nuevo">— Crear nuevo módulo común (será el principal) —</SelectItem>
                {modulosExistentes.map((m) => {
                  const prog = programas.find((p) => p.id === m.programa_id);
                  return (
                    <SelectItem key={m.id} value={m.id} className="whitespace-normal">
                      {m.numero != null ? `#${m.numero} ` : ''}{m.nombre} · {prog?.nombre ?? ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Si heredas, este módulo mostrará las actividades y el porcentaje del módulo principal y no se podrá editar desde aquí.
            </p>
          </div>
        )}

        {!heredarDe && (
          <>
            <div className="grid grid-cols-[80px_1fr] gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="num">N°</Label>
                <Input id="num" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="1" inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nm">Nombre del módulo</Label>
                <Input id="nm" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Fundamentos de programación" />
              </div>
            </div>
          </>
        )}

        <Button type="submit" disabled={busy || !programaId} className="w-full">
          {busy ? <Loader2 className="animate-spin h-4 w-4" /> : 'Crear módulo'}
        </Button>
      </form>
    </Card>
  );
}

// ─────────────────────────────────────────────── Comunes
function GestionComunes() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<{ grupos: number; copias: number; borradas: number } | null>(null);

  const ejecutar = async () => {
    setBusy(true); setResultado(null);
    const { data: det, error: e1 } = await supabase.rpc('detectar_modulos_comunes');
    if (e1) { toast.error('Detectar: ' + e1.message); setBusy(false); return; }
    const { data: del, error: e2 } = await supabase.rpc('limpiar_actividades_copias');
    if (e2) { toast.error('Limpiar: ' + e2.message); setBusy(false); return; }
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
      <p className="text-sm text-muted-foreground">
        Agrupa módulos con el mismo nombre en varios programas. El primero queda como principal y los demás heredan estado y porcentaje.
      </p>
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

// ─────────────────────────────────────────────── Backup / Restaurar
function BackupRestaurar() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  const exportar = async () => {
    setBusy(true);
    try {
      const [{ data: programas }, { data: modulos }, { data: actividades }] = await Promise.all([
        supabase.from('programas').select('*').order('orden'),
        supabase.from('modulos').select('*').order('orden').limit(20000),
        supabase.from('actividades').select('*').order('orden').limit(100000),
      ]);
      const dump = {
        version: 1,
        exportado_en: new Date().toISOString(),
        programas: programas ?? [],
        modulos: modulos ?? [],
        actividades: actividades ?? [],
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-produccion-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Backup descargado (${dump.programas.length} programas · ${dump.modulos.length} módulos · ${dump.actividades.length} actividades)`);
    } catch (err) {
      toast.error('Error: ' + (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restaurar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Esto BORRARÁ todos los programas, módulos y actividades actuales y los reemplazará por el backup. ¿Continuar?')) {
      e.target.value = ''; return;
    }
    setRestaurando(true);
    try {
      const text = await file.text();
      const dump = JSON.parse(text);
      if (!dump.programas || !dump.modulos || !dump.actividades) throw new Error('Backup inválido');

      // Borrar en orden inverso (FK virtual: actividades -> modulos -> programas)
      await supabase.from('actividades').delete().not('id', 'is', null);
      await supabase.from('modulos').delete().not('id', 'is', null);
      await supabase.from('programas').delete().not('id', 'is', null);

      // Insertar por lotes para evitar payloads gigantes
      const chunk = <T,>(arr: T[], n: number) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
        return out;
      };

      for (const lote of chunk(dump.programas, 500)) {
        const { error } = await supabase.from('programas').insert(lote);
        if (error) throw new Error('Programas: ' + error.message);
      }
      for (const lote of chunk(dump.modulos, 500)) {
        const { error } = await supabase.from('modulos').insert(lote);
        if (error) throw new Error('Módulos: ' + error.message);
      }
      for (const lote of chunk(dump.actividades, 1000)) {
        const { error } = await supabase.from('actividades').insert(lote);
        if (error) throw new Error('Actividades: ' + error.message);
      }
      toast.success(`Restaurado: ${dump.programas.length} programas · ${dump.modulos.length} módulos · ${dump.actividades.length} actividades`);
      qc.invalidateQueries();
    } catch (err) {
      toast.error('Error: ' + (err as Error).message);
    } finally {
      setRestaurando(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold mb-1">Exportar backup completo</h4>
          <p className="text-sm text-muted-foreground">Descarga un archivo JSON con todos los programas, módulos, actividades y estados actuales.</p>
        </div>
        <Button onClick={exportar} disabled={busy} className="w-full gap-2">
          {busy ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />}
          Descargar backup .json
        </Button>
      </Card>

      <Card className="p-4 space-y-3 border-destructive/30">
        <div>
          <h4 className="font-semibold mb-1 text-destructive">Restaurar desde backup</h4>
          <p className="text-sm text-muted-foreground">Reemplaza TODOS los datos por el contenido del archivo. Operación destructiva.</p>
        </div>
        <Label htmlFor="rj" className="block">
          <div className="border-2 border-dashed border-destructive/30 rounded-lg p-4 text-center cursor-pointer hover:bg-destructive/5 transition-colors">
            {restaurando ? <Loader2 className="animate-spin h-5 w-5 mx-auto text-destructive" /> : <span className="text-sm">Click para seleccionar backup .json</span>}
          </div>
          <input id="rj" type="file" accept=".json,application/json" className="hidden" onChange={restaurar} disabled={restaurando} />
        </Label>
      </Card>
    </div>
  );
}
