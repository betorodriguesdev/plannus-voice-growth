import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Search, Globe, MapPin, Zap, Loader2, CheckCircle2 } from "lucide-react";

const queries = [
  "business in São Paulo", "small business New York", "entrepreneur services Miami",
  "service business Chicago", "professional services Los Angeles", "small business Houston",
  "business owner Dallas", "service provider Phoenix", "entrepreneur network Atlanta",
  "business services Seattle", "professional services Boston", "small business Denver",
];

const recentFinds = [
  { name: "Alpha Services Melbourne", city: "Melbourne", country: "Austrália", score: 87 },
  { name: "Tech Solutions Brussels", city: "Bruxelas", country: "Bélgica", score: 74 },
  { name: "Pro Business Roma", city: "Roma", country: "Itália", score: 91 },
  { name: "Global Services München", city: "Munique", country: "Alemanha", score: 80 },
];

export default function AIDiscovery() {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);

  const startSearch = () => {
    setRunning(true);
    setCompleted(0);
    const interval = setInterval(() => {
      setCompleted(prev => {
        if (prev >= queries.length) {
          clearInterval(interval);
          setRunning(false);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Descoberta IA</h1>
        <p className="text-xs text-muted-foreground">Busca automática de empresas usando inteligência artificial</p>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-2 bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Discovery AI Worker</h3>
              <p className="text-xxs text-muted-foreground">Motor de busca automática de empresas</p>
            </div>
            <button
              onClick={startSearch}
              disabled={running}
              className="ml-auto px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {running ? "Executando..." : "Executar Busca"}
            </button>
          </div>

          {/* Query progress */}
          <div className="space-y-1.5">
            {queries.map((q, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                {i < completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                ) : i === completed && running ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className={`text-xs ${i < completed ? "text-foreground" : "text-muted-foreground"}`}>{q}</span>
                {i < completed && <span className="text-xxs text-success ml-auto">{Math.floor(Math.random() * 30 + 5)} encontradas</span>}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Finds */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-medium text-foreground mb-3">Descobertas Recentes</h3>
          <div className="space-y-3">
            {recentFinds.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                  <p className="text-xxs text-muted-foreground">{f.city}, {f.country}</p>
                </div>
                <span className="text-xxs font-medium text-primary">{f.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workers Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { name: "Discovery AI", desc: "Busca de empresas", status: running ? "Ativo" : "Inativo", icon: Search },
          { name: "Website Analyzer", desc: "Análise de websites", status: "Inativo", icon: Globe },
          { name: "Lead Enrichment", desc: "Enriquecimento de dados", status: "Inativo", icon: Zap },
          { name: "Outreach", desc: "Automação de contato", status: "Inativo", icon: Brain },
          { name: "AI Caller", desc: "Ligações automáticas", status: "Inativo", icon: Zap },
        ].map((w, i) => (
          <div key={i} className="bg-card rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <w.icon className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">{w.name}</span>
            </div>
            <p className="text-xxs text-muted-foreground mb-2">{w.desc}</p>
            <span className={`text-xxs px-2 py-0.5 rounded-full font-medium ${w.status === "Ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {w.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
