import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, X, Phone, Mail, Globe, MapPin, User, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Lead = {
  id: string;
  church_name: string | null;
  business_name?: string | null;
  pastor_name: string | null;
  owner_name?: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  score: number | null;
  source: string | null;
  call_attempts: number | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  language: string | null;
  resultado_ligacao: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const columns = ["NOVO", "ANALISADO", "CONTATADO", "LINK ENVIADO", "RESPONDEU", "DEMO", "TESTE", "CLIENTE"];

const statusToColumn: Record<string, string> = {
  novo: "NOVO",
  descoberto: "NOVO",
  analisado: "ANALISADO",
  em_contato: "CONTATADO",
  link_enviado: "LINK ENVIADO",
  falou_com_pastor: "RESPONDEU",
  sem_resposta: "CONTATADO",
  sem_resposta_parcial: "CONTATADO",
  demo: "DEMO",
  teste: "TESTE",
  cliente: "CLIENTE",
};

const columnToStatus: Record<string, string> = {
  "NOVO": "novo",
  "ANALISADO": "analisado",
  "CONTATADO": "em_contato",
  "LINK ENVIADO": "link_enviado",
  "RESPONDEU": "falou_com_pastor",
  "DEMO": "demo",
  "TESTE": "teste",
  "CLIENTE": "cliente",
};

const colColors: Record<string, string> = {
  "NOVO": "bg-info",
  "ANALISADO": "bg-warning",
  "CONTATADO": "bg-primary",
  "LINK ENVIADO": "bg-orange-500",
  "RESPONDEU": "bg-success",
  "DEMO": "bg-warning",
  "TESTE": "bg-info",
  "CLIENTE": "bg-success",
};

const langLabels: Record<string, string> = {
  pt: "🇧🇷 Português",
  en: "🇺🇸 English",
  es: "🇪🇸 Español",
};

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      setLeads((data as Lead[]) || []);
    };
    fetchLeads();
    const channel = supabase
      .channel("pipeline-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => fetchLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getColumn = (lead: Lead) => statusToColumn[lead.status || "novo"] || "NOVO";

  const handleDrop = async (column: string) => {
    if (!dragging) return;
    const newStatus = columnToStatus[column];
    await supabase.from("leads").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", dragging);
    setLeads(prev => prev.map(l => l.id === dragging ? { ...l, status: newStatus } : l));
    setDragging(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Pipeline</h1>
        <p className="text-xs text-muted-foreground">Gerenciamento do funil de vendas</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4">
        {columns.map(col => {
          const colLeads = leads.filter(l => getColumn(l) === col);
          return (
            <div
              key={col}
              className="min-w-[190px] w-[190px] shrink-0"
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(col)}
            >
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className={`w-2 h-2 rounded-full ${colColors[col]}`} />
                <span className="text-xxs font-semibold text-muted-foreground uppercase tracking-wider">{col}</span>
                <span className="text-xxs text-muted-foreground ml-auto">{colLeads.length}</span>
              </div>
              <div className="space-y-1.5 min-h-[200px] bg-muted/30 rounded-lg p-1.5">
                {colLeads.map(lead => (
                  <motion.div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragging(lead.id)}
                    onClick={() => setSelectedLead(lead)}
                    layout
                    className="bg-card border border-border rounded-md p-2.5 cursor-pointer hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-medium text-foreground leading-tight">{lead.business_name || lead.church_name || "—"}</p>
                      <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-xxs text-muted-foreground">{lead.owner_name || lead.pastor_name || "—"}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]">{lead.language === "pt" ? "🇧🇷" : lead.language === "es" ? "🇪🇸" : "🇺🇸"}</span>
                        <span className="text-xxs text-primary font-medium">{lead.score || 0}</span>
                      </div>
                      <span className="text-xxs text-muted-foreground">
                        {lead.last_contact_at
                          ? formatDistanceToNow(new Date(lead.last_contact_at), { addSuffix: true, locale: ptBR })
                          : "—"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Side Panel */}
      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end"
            onClick={() => setSelectedLead(null)}
          >
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-96 bg-card border-l border-border h-full overflow-y-auto p-5 space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selectedLead.business_name || selectedLead.church_name || "—"}</h2>
                  <p className="text-xs text-muted-foreground">{[selectedLead.city, selectedLead.state].filter(Boolean).join(", ")}</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-1 hover:bg-muted rounded-md transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Language badge */}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  colColors[getColumn(selectedLead)]
                } bg-opacity-20`}>
                  {getColumn(selectedLead)}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">
                  {langLabels[selectedLead.language || "en"] || selectedLead.language}
                </span>
              </div>

              {/* Info grid */}
              <div className="space-y-3">
                {[
                  { icon: User, label: "Proprietário", value: selectedLead.owner_name || selectedLead.pastor_name },
                  { icon: Phone, label: "Telefone", value: selectedLead.phone },
                  { icon: Mail, label: "Email", value: selectedLead.email },
                  { icon: Globe, label: "Website", value: selectedLead.website },
                  { icon: MapPin, label: "Localização", value: [selectedLead.city, selectedLead.state].filter(Boolean).join(", ") },
                  { icon: Hash, label: "Fonte", value: selectedLead.source },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xxs text-muted-foreground uppercase tracking-wider">{label}</p>
                      <p className="text-xs text-foreground">{value || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Score */}
              <div>
                <p className="text-xxs text-muted-foreground uppercase tracking-wider mb-1">Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${selectedLead.score || 0}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-primary">{selectedLead.score || 0}</span>
                </div>
              </div>

              {/* Call info */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xxs text-muted-foreground uppercase tracking-wider">Histórico de Contato</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tentativas de ligação</span>
                  <span className="text-foreground font-medium">{selectedLead.call_attempts || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Resultado da ligação</span>
                  <span className={`font-medium ${
                    selectedLead.resultado_ligacao === "interessado" ? "text-success" :
                    selectedLead.resultado_ligacao === "nao_interessado" ? "text-destructive" :
                    "text-foreground"
                  }`}>
                    {({
                      atendeu: "Atendeu",
                      ocupado: "Ocupado",
                      nao_atendeu: "Não atendeu",
                      interessado: "Interessado",
                      nao_interessado: "Não interessado",
                      pediu_retorno: "Pediu retorno",
                    } as Record<string, string>)[selectedLead.resultado_ligacao || ""] || "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Último contato</span>
                  <span className="text-foreground">
                    {selectedLead.last_contact_at
                      ? formatDistanceToNow(new Date(selectedLead.last_contact_at), { addSuffix: true, locale: ptBR })
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Próximo follow-up</span>
                  <span className="text-foreground">
                    {selectedLead.next_follow_up_at
                      ? formatDistanceToNow(new Date(selectedLead.next_follow_up_at), { addSuffix: true, locale: ptBR })
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xxs text-muted-foreground uppercase tracking-wider mb-1">Notas</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{selectedLead.notes || "Sem notas"}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
