import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Mail, Eye, MousePointerClick, MessageSquare, AlertTriangle, Play, Pause, Loader2, ChevronRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

type EmailSequence = {
  id: string;
  lead_id: string;
  status: string;
  sender_address: string;
  current_step: number;
  created_at: string;
  stopped_reason: string | null;
};

type EmailStep = {
  id: string;
  sequence_id: string;
  step_number: number;
  subject: string;
  body_html: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
};

type Lead = {
  id: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[] | null;
};

type LeadWithSequence = Lead & {
  sequence?: EmailSequence;
  steps?: EmailStep[];
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Send }> = {
  pending: { label: "Pendente", color: "bg-muted text-muted-foreground", icon: Clock },
  sent: { label: "Enviado", color: "bg-blue-500/10 text-blue-500", icon: Send },
  delivered: { label: "Entregue", color: "bg-green-500/10 text-green-500", icon: Send },
  opened: { label: "Aberto", color: "bg-amber-500/10 text-amber-500", icon: Eye },
  clicked: { label: "Clicado", color: "bg-purple-500/10 text-purple-500", icon: MousePointerClick },
  replied: { label: "Respondeu", color: "bg-emerald-500/10 text-emerald-500", icon: MessageSquare },
  bounced: { label: "Bounce", color: "bg-red-500/10 text-red-500", icon: AlertTriangle },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground", icon: AlertTriangle },
};

const seqStatusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Ativa", color: "bg-green-500/10 text-green-500" },
  paused: { label: "Pausada", color: "bg-amber-500/10 text-amber-500" },
  completed: { label: "Concluída", color: "bg-blue-500/10 text-blue-500" },
  stopped: { label: "Parada", color: "bg-red-500/10 text-red-500" },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function getBestStepStatus(steps: EmailStep[]): string {
  const priority = ["clicked", "opened", "delivered", "sent", "pending", "bounced", "cancelled"];
  for (const p of priority) {
    if (steps.some((s) => s.status === p)) return p;
  }
  return "pending";
}

function getLastAction(steps: EmailStep[]): string {
  const sentSteps = steps
    .filter((s) => s.sent_at || s.opened_at || s.clicked_at)
    .sort((a, b) => {
      const aDate = a.clicked_at || a.opened_at || a.sent_at || "";
      const bDate = b.clicked_at || b.opened_at || b.sent_at || "";
      return bDate.localeCompare(aDate);
    });
  if (sentSteps.length === 0) return "—";
  const s = sentSteps[0];
  if (s.clicked_at) return `Clicou ${timeAgo(s.clicked_at)}`;
  if (s.opened_at) return `Abriu ${timeAgo(s.opened_at)}`;
  if (s.sent_at) return `Enviado ${timeAgo(s.sent_at)}`;
  return "—";
}

export default function EmailCampaigns() {
  const [leads, setLeads] = useState<LeadWithSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [stats, setStats] = useState({
    totalSent: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    activeSeqs: 0,
    bounced: 0,
  });

  const fetchData = async () => {
    // Buscar contacts com email
    const { data: leadsData } = await supabase
      .from("crm_contacts")
      .select("id, name, company, phone, email, notes, tags")
      .not("email", "is", null)
      .order("created_at", { ascending: false });

    // Buscar todas as sequências
    const { data: sequences } = await supabase
      .from("email_sequences")
      .select("*");

    // Buscar todos os steps
    const { data: steps } = await supabase
      .from("email_steps")
      .select("*")
      .order("step_number", { ascending: true });

    const seqMap = new Map<string, EmailSequence>();
    (sequences || []).forEach((s: EmailSequence) => seqMap.set(s.contact_id || s.lead_id, s));

    const stepsMap = new Map<string, EmailStep[]>();
    (steps || []).forEach((s: EmailStep) => {
      const arr = stepsMap.get(s.sequence_id) || [];
      arr.push(s);
      stepsMap.set(s.sequence_id, arr);
    });

    const enriched: LeadWithSequence[] = (leadsData || []).map((lead: Lead) => {
      const seq = seqMap.get(lead.id);
      return {
        ...lead,
        sequence: seq,
        steps: seq ? stepsMap.get(seq.id) || [] : [],
      };
    });

    // Também incluir leads sem email mas com sequência (caso raro)
    setLeads(enriched);

    // Calcular stats
    const allSteps = steps || [];
    setStats({
      totalSent: allSteps.filter((s: EmailStep) => s.status !== "pending" && s.status !== "cancelled").length,
      opened: allSteps.filter((s: EmailStep) => s.opened_at).length,
      clicked: allSteps.filter((s: EmailStep) => s.clicked_at).length,
      replied: allSteps.filter((s: EmailStep) => s.status === "replied").length,
      activeSeqs: (sequences || []).filter((s: EmailSequence) => s.status === "active").length,
      bounced: allSteps.filter((s: EmailStep) => s.status === "bounced").length,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Realtime updates
    const channel = supabase
      .channel("email-tracking")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_steps" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "email_sequences" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const startSequence = async (lead: LeadWithSequence) => {
    if (!lead.email) {
      toast({ title: "Sem email", description: "Este lead não tem email cadastrado", variant: "destructive" });
      return;
    }

    setGenerating(lead.id);
    try {
      // Extract niche and city from notes (format: "nicho | cidade | website")
      const noteParts = (lead.notes || "").split("|").map((s: string) => s.trim());
      const nicho = noteParts[0] || "serviços";
      const cidade = noteParts[1] || "";
      const { data, error } = await supabase.functions.invoke("generate-email-sequence", {
        body: {
          lead_id: lead.id,
          business_name: lead.company || lead.name || "Empresa",
          owner_name: lead.name,
          niche: nicho,
          city: cidade,
        },
      });

      if (error) throw error;

      toast({
        title: "Sequência criada!",
        description: `${data.steps_count} emails gerados por IA para ${lead.company || lead.name}`,
      });

      await fetchData();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const pauseSequence = async (sequenceId: string) => {
    await supabase
      .from("email_sequences")
      .update({ status: "paused" })
      .eq("id", sequenceId);
    await fetchData();
  };

  const resumeSequence = async (sequenceId: string) => {
    await supabase
      .from("email_sequences")
      .update({ status: "active" })
      .eq("id", sequenceId);
    await fetchData();
  };

  const detail = selected ? leads.find((l) => l.id === selected) : null;

  const openRate = stats.totalSent > 0 ? Math.round((stats.opened / stats.totalSent) * 100) : 0;
  const clickRate = stats.totalSent > 0 ? Math.round((stats.clicked / stats.totalSent) * 100) : 0;

  const statCards = [
    { label: "Emails Enviados", value: stats.totalSent, icon: Send },
    { label: "Taxa de Abertura", value: `${openRate}%`, icon: Eye },
    { label: "Taxa de Clique", value: `${clickRate}%`, icon: MousePointerClick },
    { label: "Respostas", value: stats.replied, icon: MessageSquare },
    { label: "Sequências Ativas", value: stats.activeSeqs, icon: Play },
    { label: "Bounces", value: stats.bounced, icon: AlertTriangle },
  ];

  const StepTimeline = ({ steps }: { steps: EmailStep[] }) => (
    <div className="space-y-3">
      {steps
        .sort((a, b) => a.step_number - b.step_number)
        .map((step) => {
          const cfg = statusConfig[step.status] || statusConfig.pending;
          const Icon = cfg.icon;
          return (
            <div key={step.id} className="relative pl-6 pb-3 border-l border-border last:border-l-0">
              <div className={`absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full ${
                step.status === "pending" ? "bg-muted-foreground/30" :
                step.status === "bounced" || step.status === "cancelled" ? "bg-red-500" :
                step.clicked_at ? "bg-purple-500" :
                step.opened_at ? "bg-amber-500" :
                "bg-green-500"
              }`} />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">Email {step.step_number}</p>
                  <span className={`text-xxs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{step.subject}</p>
                <div className="flex gap-3 text-xxs text-muted-foreground">
                  {step.sent_at && <span>Enviado: {timeAgo(step.sent_at)}</span>}
                  {step.opened_at && <span>Aberto: {timeAgo(step.opened_at)}</span>}
                  {step.clicked_at && <span>Clicado: {timeAgo(step.clicked_at)}</span>}
                  {!step.sent_at && step.scheduled_at && (
                    <span>Agendado: {new Date(step.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );

  const DetailContent = ({ lead }: { lead: LeadWithSequence }) => {
    const seq = lead.sequence;
    const seqCfg = seq ? seqStatusConfig[seq.status] || seqStatusConfig.active : null;

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">{lead.company || lead.name || "—"}</h2>
          <p className="text-sm text-muted-foreground">{lead.email}</p>
          <p className="text-xs text-muted-foreground">{lead.notes}</p>
        </div>

        {seq && seqCfg && (
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${seqCfg.color}`}>
              {seqCfg.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {seq.sender_address.split("<")[0].trim()}
            </span>
            {seq.status === "active" && (
              <button onClick={() => pauseSequence(seq.id)} className="ml-auto text-xs text-amber-500 hover:underline flex items-center gap-1">
                <Pause className="w-3 h-3" /> Pausar
              </button>
            )}
            {seq.status === "paused" && (
              <button onClick={() => resumeSequence(seq.id)} className="ml-auto text-xs text-green-500 hover:underline flex items-center gap-1">
                <Play className="w-3 h-3" /> Retomar
              </button>
            )}
          </div>
        )}

        {lead.steps && lead.steps.length > 0 ? (
          <div>
            <h3 className="text-xs font-medium text-foreground mb-3">Timeline da Sequência</h3>
            <StepTimeline steps={lead.steps} />
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-3">Nenhuma sequência iniciada</p>
            <button
              onClick={() => startSequence(lead)}
              disabled={generating === lead.id}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {generating === lead.id ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando copy IA...</>
              ) : (
                <><Play className="w-3.5 h-3.5" /> Iniciar Sequência</>
              )}
            </button>
          </div>
        )}

        {seq?.stopped_reason && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            <p className="text-xs text-red-500">Parada: {seq.stopped_reason}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-lg font-semibold text-foreground">Email Outreach</h1>
        <p className="text-sm md:text-xs text-muted-foreground">
          {loading ? "Carregando..." : `${leads.length} leads com email | Sequências geridas por IA`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-lg border border-border p-3"
          >
            <s.icon className="w-4 h-4 text-primary mb-2" />
            <p className="text-xl font-semibold text-foreground">{s.value}</p>
            <p className="text-xxs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      {isMobile ? (
        <div className="space-y-2">
          {leads.length === 0 && !loading && (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhum lead com email encontrado.</p>
            </div>
          )}
          {leads.map((lead) => {
            const bestStatus = lead.steps && lead.steps.length > 0
              ? getBestStepStatus(lead.steps)
              : null;
            const cfg = bestStatus ? statusConfig[bestStatus] : null;
            const sentCount = lead.steps?.filter((s) => s.status !== "pending" && s.status !== "cancelled").length || 0;
            const totalSteps = lead.steps?.length || 0;

            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelected(lead.id)}
                className="bg-card rounded-2xl border border-border p-4 active:scale-[0.98] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{lead.company || lead.name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                    {cfg ? (
                      <span className={`text-xxs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    ) : (
                      <span className="text-xxs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                        Sem sequência
                      </span>
                    )}
                    {totalSteps > 0 && (
                      <span className="text-xxs text-muted-foreground">{sentCount}/{totalSteps}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xxs text-muted-foreground">
                    {lead.steps && lead.steps.length > 0 ? getLastAction(lead.steps) : "—"}
                  </span>
                  {!lead.sequence ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); startSequence(lead); }}
                      disabled={generating === lead.id}
                      className="text-xxs text-primary font-medium flex items-center gap-1"
                    >
                      {generating === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Iniciar
                    </button>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-4">
          <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Empresa", "Email", "Nicho", "Status", "Step", "Última Ação", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xxs font-medium text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">
                        Nenhum lead com email encontrado. Execute o scraper para capturar emails.
                      </td>
                    </tr>
                  )}
                  {leads.map((lead) => {
                    const bestStatus = lead.steps && lead.steps.length > 0
                      ? getBestStepStatus(lead.steps)
                      : null;
                    const cfg = bestStatus ? statusConfig[bestStatus] : null;
                    const sentCount = lead.steps?.filter((s) => s.status !== "pending" && s.status !== "cancelled").length || 0;
                    const totalSteps = lead.steps?.length || 0;
                    const seqCfg = lead.sequence ? seqStatusConfig[lead.sequence.status] : null;

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelected(lead.id)}
                        className={`border-b border-border cursor-pointer transition-colors ${
                          selected === lead.id ? "bg-primary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-medium text-foreground">{lead.company || lead.name || "—"}</p>
                          <p className="text-xxs text-muted-foreground">{lead.name || ""}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">
                          {lead.email || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {lead.notes}
                        </td>
                        <td className="px-4 py-2.5">
                          {seqCfg ? (
                            <span className={`text-xxs px-2 py-0.5 rounded-full font-medium ${seqCfg.color}`}>
                              {seqCfg.label}
                            </span>
                          ) : (
                            <span className="text-xxs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {totalSteps > 0 ? (
                            <div className="flex items-center gap-1.5">
                              {cfg && (
                                <span className={`text-xxs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                              )}
                              <span className="text-xxs text-muted-foreground">{sentCount}/{totalSteps}</span>
                            </div>
                          ) : (
                            <span className="text-xxs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xxs text-muted-foreground">
                          {lead.steps && lead.steps.length > 0 ? getLastAction(lead.steps) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {!lead.sequence ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); startSequence(lead); }}
                              disabled={generating === lead.id}
                              className="text-xxs bg-primary/10 text-primary px-2.5 py-1 rounded-md font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {generating === lead.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              Iniciar
                            </button>
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
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
              className="w-80 bg-card rounded-lg border border-border p-4 shrink-0 max-h-[calc(100vh-12rem)] overflow-y-auto"
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
            <SheetTitle className="sr-only">Detalhes da sequência</SheetTitle>
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4 mt-2" />
            {detail && <DetailContent lead={detail} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
