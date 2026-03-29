import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, X, Phone, Mail, User, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Lead = {
  id: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  tags: string[] | null;
  notes: string | null;
  last_contact: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const columns = ["NOVO", "ANALISADO", "CONTATADO", "LINK ENVIADO", "RESPONDEU", "DEMO", "TESTE", "CLIENTE"];

const tagToColumn = (tags: string[] | null): string => {
  const t = tags || [];
  if (t.includes("cliente")) return "CLIENTE";
  if (t.includes("teste")) return "TESTE";
  if (t.includes("demo")) return "DEMO";
  if (t.includes("respondeu")) return "RESPONDEU";
  if (t.includes("link_enviado")) return "LINK ENVIADO";
  if (t.includes("em_contato") || t.includes("contatado")) return "CONTATADO";
  if (t.includes("analisado")) return "ANALISADO";
  return "NOVO";
};

const columnToTag: Record<string, string> = {
  "NOVO": "novo",
  "ANALISADO": "analisado",
  "CONTATADO": "em_contato",
  "LINK ENVIADO": "link_enviado",
  "RESPONDEU": "respondeu",
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


export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase.from("crm_contacts").select("*").order("created_at", { ascending: false });
      setLeads((data as Lead[]) || []);
    };
    fetchLeads();
    const channel = supabase
      .channel("pipeline-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_contacts" }, () => fetchLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getColumn = (lead: Lead) => tagToColumn(lead.tags);

  const handleDrop = async (column: string) => {
    if (!dragging) return;
    const newTag = columnToTag[column];
    const lead = leads.find(l => l.id === dragging);
    if (!lead) return;
    // Replace pipeline stage tags with the new one, keeping other tags (like "scraper", niche, etc.)
    const stageTags = new Set(Object.values(columnToTag));
    const otherTags = (lead.tags || []).filter(t => !stageTags.has(t));
    const newTags = [...otherTags, newTag];
    await supabase.from("crm_contacts").update({ tags: newTags, updated_at: new Date().toISOString() }).eq("id", dragging);
    setLeads(prev => prev.map(l => l.id === dragging ? { ...l, tags: newTags } : l));
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
                      <p className="text-xs font-medium text-foreground leading-tight">{lead.company || lead.name || "—"}</p>
                      <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-xxs text-muted-foreground">{lead.name || "—"}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xxs text-primary font-medium">{(lead.tags || []).filter(t => !["scraper", "plannus-voice", "novo"].includes(t)).join(", ") || "—"}</span>
                      </div>
                      <span className="text-xxs text-muted-foreground">
                        {lead.last_contact
                          ? formatDistanceToNow(new Date(lead.last_contact), { addSuffix: true, locale: ptBR })
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
                  <h2 className="text-base font-semibold text-foreground">{selectedLead.company || selectedLead.name || "—"}</h2>
                  <p className="text-xs text-muted-foreground">{selectedLead.notes || "—"}</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-1 hover:bg-muted rounded-md transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Stage badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  colColors[getColumn(selectedLead)]
                } bg-opacity-20`}>
                  {getColumn(selectedLead)}
                </span>
                {(selectedLead.tags || []).map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">{tag}</span>
                ))}
              </div>

              {/* Info grid */}
              <div className="space-y-3">
                {[
                  { icon: User, label: "Contato", value: selectedLead.name },
                  { icon: Phone, label: "Telefone", value: selectedLead.phone },
                  { icon: Mail, label: "Email", value: selectedLead.email },
                  { icon: Hash, label: "Tags", value: (selectedLead.tags || []).join(", ") },
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

              {/* Contact history */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xxs text-muted-foreground uppercase tracking-wider">Histórico de Contato</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Último contato</span>
                  <span className="text-foreground">
                    {selectedLead.last_contact
                      ? formatDistanceToNow(new Date(selectedLead.last_contact), { addSuffix: true, locale: ptBR })
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
