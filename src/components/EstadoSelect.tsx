import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ESTADOS_PRINCIPALES, colorEstado, normalizarEstado } from '@/lib/produccion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  actividadId: string;
  estado: string;
  className?: string;
  /** Si true, el control queda solo lectura (módulo común visto desde un programa que no es el de origen). */
  readOnly?: boolean;
  /** Tooltip a mostrar cuando está bloqueado. */
  readOnlyReason?: string;
}

export function EstadoSelect({ actividadId, estado, className, readOnly, readOnlyReason }: Props) {
  const qc = useQueryClient();
  const [valor, setValor] = useState(normalizarEstado(estado));
  const [saving, setSaving] = useState(false);
  const colors = colorEstado(valor);

  const onChange = async (nuevo: string) => {
    if (readOnly) return;
    const prev = valor;
    setValor(nuevo);
    setSaving(true);
    const { error } = await supabase
      .from('actividades')
      .update({ estado: nuevo })
      .eq('id', actividadId);
    setSaving(false);
    if (error) {
      setValor(prev);
      toast.error('No se pudo actualizar el estado');
      return;
    }
    toast.success('Estado actualizado');
    qc.invalidateQueries({ queryKey: ['actividades'] });
  };

  if (readOnly) {
    return (
      <span
        title={readOnlyReason ?? 'Solo lectura'}
        className={cn(
          'h-7 px-2.5 py-0 text-xs font-medium border rounded-full inline-flex items-center min-w-[100px] gap-1.5 opacity-80 cursor-not-allowed',
          colors.bg, colors.fg, colors.border,
          className,
        )}
      >
        🔒 {valor}
      </span>
    );
  }

  return (
    <Select value={valor} onValueChange={onChange} disabled={saving}>
      <SelectTrigger
        className={cn(
          'h-7 px-2.5 py-0 text-xs font-medium border rounded-full w-auto min-w-[100px] gap-1.5',
          colors.bg, colors.fg, colors.border,
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ESTADOS_PRINCIPALES.map((e) => (
          <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
