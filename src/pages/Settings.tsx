import { motion } from "framer-motion";
import { Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Configurações</h1>
        <p className="text-xs text-muted-foreground">Configurações do Growth Engine</p>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {/* General */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Geral</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xxs text-muted-foreground uppercase tracking-wider">Nome da Empresa</label>
              <input defaultValue="Plannus Voice" className="mt-1 w-full bg-muted border border-border rounded-md px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xxs text-muted-foreground uppercase tracking-wider">Email de Contato</label>
              <input defaultValue="growth@plannusvoice.com" className="mt-1 w-full bg-muted border border-border rounded-md px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary/50" />
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">IA & Automação</h3>
          <div className="space-y-2">
            {[
              ["Discovery AI", "Buscar empresas automaticamente"],
              ["Website Analyzer", "Analisar websites automaticamente"],
              ["Lead Enrichment", "Enriquecer dados de leads"],
              ["Outreach", "Enviar emails automaticamente"],
              ["AI Caller", "Realizar ligações automáticas"],
            ].map(([name, desc]) => (
              <div key={name} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-xs font-medium text-foreground">{name}</p>
                  <p className="text-xxs text-muted-foreground">{desc}</p>
                </div>
                <button className="w-9 h-5 bg-primary rounded-full relative">
                  <span className="absolute right-0.5 top-0.5 w-4 h-4 bg-primary-foreground rounded-full" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors">
          <Save className="w-3.5 h-3.5" /> Salvar Configurações
        </button>
      </motion.div>
    </div>
  );
}
