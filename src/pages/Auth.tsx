import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) toast.error(error === "Invalid login credentials" ? "Credenciales inválidas" : error);
    else toast.success("Bienvenido");
  };

  return (
    <div className="min-h-screen grid place-items-center gradient-primary p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="h-14 w-14 rounded-2xl gradient-accent grid place-items-center shadow-glow">
            <GraduationCap className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-center">Producción Académica</h1>
          <p className="text-sm text-muted-foreground text-center">Acceso restringido. Solicita tu cuenta al administrador.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full h-11" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Iniciar sesión"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
