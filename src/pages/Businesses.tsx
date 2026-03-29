import { useState, useEffect } from "react";
import { Search, Filter, ExternalLink, ChevronRight, MapPin, Phone, User } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type Contact = {
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

const tagStatusColors: Record<string, string> = {
  novo: "bg-info/10 text-info",
  analisado: "bg-warning/10 text-warning",
  em_contato: "bg-primary/10 text-primary",
  contatado: "bg-primary/10 text-primary",
  respondeu: "bg-success/10 text-success",
  demo: "bg-success/10 text-success",
  teste: "bg-info/10 text-info",
  cliente: "bg-success/20 text-success",
};

const getStageTag = (tags: string[] | null): string => {
  const stagePriority = ["cliente", "teste", "demo", "respondeu", "link_enviado", "em_contato", "contatado", "analisado", "novo"];
  for (const stage of stagePriority) {
    if ((tags || []).includes(stage)) return stage;
  }
  return "novo";
};

export default function Businesses() {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchContacts = async () => {
      const { data } = await supabase
        .from("crm_contacts")
        .select("*")
        .order("created_at", { ascending: false });
      setContacts((data as Contact[]) || []);
      setLoading(false);
    };
    fetchContacts();

    const channel = supabase
      .channel("crm-contacts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_contacts" }, () => {
        fetchContacts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = contacts.filter(c =>
    (c.company || c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.notes || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const detail = selected ? contacts.find(c => c.id === selected) : null;

  const getDisplayName = (c: Contact) => c.company || c.name || "—";

  const DetailContent = ({ contact }: { contact: Contact }) => {
    const stage = getStageTag(contact.tags);
    const stageColor = tagStatusColors[stage] || "bg-muted text-muted-foreground";
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">{getDisplayName(contact)}</h2>
          <p className="text-sm text-muted-foreground">{contact.notes || "—"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${stageColor}`}>
            {stage}
          </span>
          {(contact.tags || []).filter(t => t !== stage).map(tag => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">{tag}</span>
          ))}
        </div>
        <div className="space-y-3">
          {[
            ["Contato", contact.name],
            ["Email", contact.email],
            ["Telefone", contact.phone],
            ["Notas", contact.notes],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xxs text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-sm md:text-xs text-foreground">{val || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-lg font-semibold text-foreground">Empresas</h1>
        <p className="text-sm md:text-xs text-muted-foreground">
          {loading ? "Carregando..." : `${contacts.length} empresas no CRM`}
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5 md:py-1.5 flex-1">
          <Search className="w-4 h-4 md:w-3.5 md:h-3.5 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empresas..."
            className="bg-transparent text-sm md:text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
          />
        </div>
        <button className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-2.5 md:py-1.5 text-sm md:text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Filter className="w-4 h-4 md:w-3.5 md:h-3.5" />
          <span className="hidden md:inline">Filtros</span>
        </button>
      </div>

      {/* Mobile: Card list | Desktop: Table */}
      {isMobile ? (
        <div className="space-y-2">
          {filtered.length === 0 && !loading && (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
            </div>
          )}
          {filtered.map(c => {
            const stage = getStageTag(c.tags);
            const stageColor = tagStatusColors[stage] || "bg-muted text-muted-foreground";
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelected(c.id)}
                className="bg-card rounded-2xl border border-border p-4 active:scale-[0.98] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{getDisplayName(c)}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                      {c.name && c.company && (
                        <span className="flex items-center gap-1 text-xs">
                          <User className="w-3 h-3" />{c.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                      {c.notes && (
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3" />{c.notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                    <span className={`text-xxs px-2 py-0.5 rounded-full font-medium ${stageColor}`}>
                      {stage}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                  <div className="flex-1 flex flex-wrap gap-1">
                    {(c.tags || []).filter(t => t !== stage).slice(0, 3).map(tag => (
                      <span key={tag} className="text-xxs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg bg-primary/10">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Desktop table view */
        <div className="flex gap-4">
          <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Empresa", "Contato", "Telefone", "Notas", "Tags", "Status", ""].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xxs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">
                        Nenhuma empresa encontrada.
                      </td>
                    </tr>
                  )}
                  {filtered.map(c => {
                    const stage = getStageTag(c.tags);
                    const stageColor = tagStatusColors[stage] || "bg-muted text-muted-foreground";
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c.id)}
                        className={`border-b border-border cursor-pointer transition-colors ${selected === c.id ? "bg-primary/5" : "hover:bg-muted/50"}`}
                      >
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-medium text-foreground">{getDisplayName(c)}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.name || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.phone || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">{c.notes || "—"}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {(c.tags || []).filter(t => t !== stage).slice(0, 3).map(tag => (
                              <span key={tag} className="text-xxs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xxs px-2 py-0.5 rounded-full font-medium ${stageColor}`}>
                            {stage}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {c.phone && (
                            <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {detail && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-80 bg-card rounded-lg border border-border p-4 shrink-0"
            >
              <DetailContent contact={detail} />
            </motion.div>
          )}
        </div>
      )}

      {/* Mobile detail sheet */}
      {isMobile && (
        <Sheet open={!!detail} onOpenChange={(open) => !open && setSelected(null)}>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-card border-border pb-8">
            <SheetTitle className="sr-only">Detalhes da empresa</SheetTitle>
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4 mt-2" />
            {detail && <DetailContent contact={detail} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
