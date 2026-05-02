import { useState } from "react";
import { useCustomerAuth, type CustomerUser } from "@/hooks/use-customer-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CustomerAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (user: CustomerUser) => void;
}

export function CustomerAuthModal({ open, onOpenChange, onSuccess }: CustomerAuthModalProps) {
  const { setCustomer } = useCustomerAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });

  const resetErrors = () => setError("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Accesso non riuscito"); return; }
      setCustomer(data);
      onSuccess?.(data);
      onOpenChange(false);
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(registerForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registrazione non riuscita"); return; }
      setCustomer(data);
      onSuccess?.(data);
      onOpenChange(false);
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Accedi per prenotare</DialogTitle>
          <DialogDescription>
            Crea un account gratuito o accedi per completare la prenotazione.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "login" | "register"); resetErrors(); }}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Accedi</TabsTrigger>
            <TabsTrigger value="register">Registrati</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="mario@esempio.it"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Accesso..." : "Accedi"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Non hai un account?{" "}
                <button type="button" className="underline" onClick={() => { setTab("register"); resetErrors(); }}>
                  Registrati gratis
                </button>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="reg-first">Nome</Label>
                  <Input
                    id="reg-first"
                    value={registerForm.firstName}
                    onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                    placeholder="Mario"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-last">Cognome</Label>
                  <Input
                    id="reg-last"
                    value={registerForm.lastName}
                    onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                    placeholder="Rossi"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  placeholder="mario@esempio.it"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  placeholder="min. 6 caratteri"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg-phone">Telefono <span className="text-muted-foreground">(opzionale)</span></Label>
                <Input
                  id="reg-phone"
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  placeholder="+39 ..."
                />
              </div>
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrazione..." : "Crea account"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Hai già un account?{" "}
                <button type="button" className="underline" onClick={() => { setTab("login"); resetErrors(); }}>
                  Accedi
                </button>
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
