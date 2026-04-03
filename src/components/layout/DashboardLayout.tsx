import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Search, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email ou senha incorretos");
    } else {
      onLogin();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">A</span>
          </div>
          <div>
            <div className="text-base font-bold text-foreground tracking-tight">PLANNUS VOICE</div>
            <div className="text-xs text-muted-foreground">Growth Engine</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-secondary rounded-md px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-secondary rounded-md px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(!!s);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === null) return null; // loading

  if (!session) return <LoginScreen onLogin={() => setSession(true)} />;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          {/* Mobile: Logo | Desktop: Search */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">PLANNUS VOICE</span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-secondary rounded-md px-3 py-1.5 w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar empresas, eventos, leads..."
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
            <kbd className="text-xxs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile search icon */}
            <button className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors">
              <Search className="w-4.5 h-4.5 text-muted-foreground" />
            </button>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors relative">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
              U
            </div>
          </div>
        </header>

        {/* Main content — add bottom padding on mobile for nav */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}
