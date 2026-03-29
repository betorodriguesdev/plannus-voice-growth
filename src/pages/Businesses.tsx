import { useState, useEffect } from "react";
import { Search, Filter, ExternalLink, ChevronDown, ChevronRight, MapPin, Phone, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const statusMap: Record<string, string> = {
  novo: "Novo",
  descoberto: "Descoberto",
  analisado: "Analisado",
  em_contato: "Contatado",
  falou_com_pastor: "Respondeu",
  sem_resposta: "Sem Resposta",
  demo: "Demo",
  teste: "Teste",
  cliente: "Cliente",
};

const statusColors: Record<string, string> = {
  Novo: "bg-info/10 text-info",
  Descoberto: "bg-primary/10 text-primary",
  Analisado: "bg-warning/10 text-warning",
  Contatado: "bg-primary/10 text-primary",
  Respondeu: "bg-success/10 text-success",
  "Sem Resposta": "bg-destructive/10 text-destructive",
  Demo: "bg-success/10 text-success",
  Teste: "bg-info/10 text-info",
  Cliente: "bg-success/20 text-success",
};

export default function Businesses() {
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Tables<"leads">[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      setLeads(data || []);
      setLoading(false);
    };
    fetchLeads();

    const channel = supabase
      .channel("leads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = leads.filter(c =>
    ((c as any).business_name || c.church_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.city || "").toLowerCase().includes(search.toLowerCase()) ||
    ((c as any).owner_name || c.pastor_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const detail = selected ? leads.find(c => c.id === selected) : null;
  const getStatus = (s: string | null) => statusMap[s || "novo"] || s || "Novo";

  const getBusinessName = (lead: Tables<"leads">) => (lead as any).business_name || lead.church_name || "—";
  const getOwnerName = (lead: Tables<"leads">) => (lead as any).owner_name || lead.pastor_name;

  const DetailContent = ({ lead }: { lead: Tables<"leads"> }) => {
    const displayStatus = getStatus(lead.status);
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">{getBusinessName(lead)}</h2>
          <p className="text-sm text-muted-foreground">{[lead.city, lead.state].filter(Boolean).join(", ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[displayStatus] || "bg-muted text-muted-foreground"}`}>
            {displayStatus}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">
            {(lead as any).language === "pt" ? "🇧🇷 PT" : (lead as any).language === "es" ? "🇪🇸 ES" : "🇺🇸 EN"}
          </span>
        </div>
        <div className="space-y-3">
          {[
            ["Proprietário", getOwnerName(lead)],
            ["Website", lead.website],
            ["Email", lead.email],
            ["Telefone", lead.phone],
            ["Fonte", lead.source],
            ["Tentativas", String(lead.call_attempts || 0)],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xxs text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-sm md:text-xs text-foreground">{val || "—"}</p>
            </div>
          ))}
          <div>
            <p className="text-xxs text-muted-foreground uppercase tracking-wider">Score</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${lead.score || 0}%` }} />
              </div>
              <span className="text-sm font-semibold text-primary">{lead.score || 0}</span>
            </div>
          </div>
          <div>
            <p className="text-xxs text-muted-foreground uppercase tracking-wider mb-1">Notas</p>
            <textarea
              defaultValue={lead.notes || ""}
              placeholder="Adicionar notas..."
              className="w-full bg-muted rounded-xl p-3 text-sm md:text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none h-20 border border-border focus:border-primary/50"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-lg font-semibold text-foreground">Empresas</h1>
        <p className="text-sm md:text-xs text-muted-foreground">
          {loading ? "Carregando..." : `${leads.length} empresas no CRM`}
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
            const displayStatus = getStatus(c.status);
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
                    <p className="text-sm font-semibold text-foreground truncate">{getBusinessName(c)}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                      {getOwnerName(c) && (
                        <span className="flex items-center gap-1 text-xs">
                          <User className="w-3 h-3" />{getOwnerName(c)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                      {(c.city || c.state) && (
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3" />{[c.city, c.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                    <span className={`text-xxs px-2 py-0.5 rounded-full font-medium ${statusColors[displayStatus] || "bg-muted text-muted-foreground"}`}>
                      {displayStatus}
                    </span>
                    <span className="text-xs">{(c as any).language === "pt" ? "🇧🇷" : (c as any).language === "es" ? "🇪🇸" : "🇺🇸"}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${c.score || 0}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-primary shrink-0">{c.score || 0}</span>
                  </div>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg bg-primary/10">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                    </a>
                  )}
                  {c.website && (
                    <a href={`https://${c.website}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg bg-muted">
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
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
                    {["Empresa", "Proprietário", "Fonte", "Idioma", "Cidade", "Score", "Status", ""].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xxs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">
                        Nenhuma empresa encontrada.
                      </td>
                    </tr>
                  )}
                  {filtered.map(c => {
                    const displayStatus = getStatus(c.status);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c.id)}
                        className={`border-b border-border cursor-pointer transition-colors ${selected === c.id ? "bg-primary/5" : "hover:bg-muted/50"}`}
                      >
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-medium text-foreground">{getBusinessName(c)}</p>
                          <p className="text-xxs text-muted-foreground">{c.website || ""}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{getOwnerName(c) || "—"}</td>
                        <td className="px-4 py-2.5">
                          {(() => {
                            const s = (c.source || "").toLowerCase();
                            const isScraper = s.includes("scrape") || s.includes("google") || s.includes("maps") || s === "";
                            return (
                              <span className={`text-xxs px-2 py-0.5 rounded-full font-medium ${isScraper ? "bg-info/10 text-info" : "bg-accent text-accent-foreground"}`}>
                                {isScraper ? "🔍 Scraper" : "📱 App"}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          <span className="text-xs">{(c as any).language === "pt" ? "🇧🇷 PT" : (c as any).language === "es" ? "🇪🇸 ES" : "🇺🇸 EN"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${c.score || 0}%` }} />
                            </div>
                            <span className="text-xs font-medium text-foreground">{c.score || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xxs px-2 py-0.5 rounded-full font-medium ${statusColors[displayStatus] || "bg-muted text-muted-foreground"}`}>
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {c.website && (
                            <a href={`https://${c.website}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
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
              <DetailContent lead={detail} />
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
            {detail && <DetailContent lead={detail} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
