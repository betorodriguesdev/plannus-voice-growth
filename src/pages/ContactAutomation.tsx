import { motion } from "framer-motion";
import { Mail, Phone, Clock, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

const workflows = [
  { id: 1, business: "Empresa Alpha São Paulo", step: "Email enviado", status: "Aguardando resposta", time: "Há 12h" },
  { id: 2, business: "Tech Solutions Berlin", step: "Ligação agendada", status: "Tentativa 1 em 2h", time: "Há 1d" },
  { id: 3, business: "Serviços Plus Zurique", step: "Email enviado", status: "Respondeu!", time: "Há 2h" },
  { id: 4, business: "Business Co Sydney", step: "Ligação tentativa 2", status: "Sem resposta", time: "Há 3d" },
  { id: 5, business: "Empresa Beta Milano", step: "Email enviado", status: "Aguardando", time: "Há 6h" },
];

const stats = [
  { label: "Emails na fila", value: 42, icon: Mail },
  { label: "Ligações hoje", value: 8, icon: Phone },
  { label: "Aguardando resposta", value: 156, icon: Clock },
  { label: "Respostas recebidas", value: 23, icon: CheckCircle2 },
];

export default function ContactAutomation() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Automação de Contato</h1>
        <p className="text-xs text-muted-foreground">Gerenciamento de outreach automático</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-lg border border-border p-3">
            <s.icon className="w-4 h-4 text-primary mb-2" />
            <p className="text-xl font-semibold text-foreground">{s.value}</p>
            <p className="text-xxs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Workflow Diagram */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-xs font-medium text-foreground mb-4">Fluxo de Automação</h3>
        <div className="flex items-center gap-2 justify-center py-4">
          {["Nova Empresa", "Email", "48h espera", "Sem resposta?", "Ligação IA", "Follow-up"].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-primary/10 text-primary text-xxs font-medium rounded-md border border-primary/20">
                {step}
              </div>
              {i < 5 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* Active Workflows */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-xs font-medium text-foreground">Workflows Ativos</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Empresa", "Etapa", "Status", "Tempo"].map(h => (
                <th key={h} className="text-left px-4 py-2 text-xxs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workflows.map(w => (
              <tr key={w.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="px-4 py-2.5 text-xs font-medium text-foreground">{w.business}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{w.step}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xxs px-2 py-0.5 rounded-full font-medium ${
                    w.status.includes("Respondeu") ? "bg-success/10 text-success" :
                    w.status.includes("Sem") ? "bg-destructive/10 text-destructive" :
                    "bg-warning/10 text-warning"
                  }`}>{w.status}</span>
                </td>
                <td className="px-4 py-2.5 text-xxs text-muted-foreground">{w.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
