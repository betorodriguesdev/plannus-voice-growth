import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Church, Search, Smartphone, Phone, CalendarCheck, UserCheck, Mail, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    scraperLeads: 0,
    appLeads: 0,
    qualified: 0,
    contacted: 0,
    calls: 0,
    demos: 0,
    clients: 0,
    emailsSent: 0,
    emailOpenRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      let allContacts: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data } = await supabase.from("crm_contacts").select("tags").range(from, from + PAGE_SIZE - 1);
        if (!data || data.length === 0) break;
        allContacts = allContacts.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      const { count: callCount } = await supabase.from("call_logs").select("*", { count: "exact", head: true });
      const { count: demoCount } = await supabase.from("calendar_events").select("*", { count: "exact", head: true }).eq("event_type", "demo");

      // Email stats
      const { data: emailSteps } = await supabase.from("email_steps").select("status, opened_at");
      const allEmailSteps = emailSteps || [];
      const emailsSent = allEmailSteps.filter(s => s.status !== "pending" && s.status !== "cancelled").length;
      const emailsOpened = allEmailSteps.filter(s => s.opened_at).length;
      const emailOpenRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0;

      const all = allContacts;
      setStats({
        totalLeads: all.length,
        scraperLeads: all.filter(l => Array.isArray(l.tags) && l.tags.includes("scraper")).length,
        appLeads: all.filter(l => !Array.isArray(l.tags) || !l.tags.includes("scraper")).length,
        qualified: all.filter(l => !Array.isArray(l.tags) || !l.tags.includes("novo")).length,
        contacted: 0,
        calls: callCount || 0,
        demos: demoCount || 0,
        clients: all.filter(l => Array.isArray(l.tags) && l.tags.includes("cliente")).length,
        emailsSent,
        emailOpenRate,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const metrics = [
    { title: "Total Empresas", value: loading ? "..." : stats.totalLeads.toLocaleString(), change: 0, icon: Church, spark: [0] },
    { title: "Via Scraper", value: loading ? "..." : stats.scraperLeads.toLocaleString(), change: 0, icon: Search, spark: [0] },
    { title: "Via Aplicativo", value: loading ? "..." : stats.appLeads.toLocaleString(), change: 0, icon: Smartphone, spark: [0] },
    { title: "Ligações IA", value: loading ? "..." : stats.calls.toLocaleString(), change: 0, icon: Phone, spark: [0] },
    { title: "Demos Marcadas", value: loading ? "..." : stats.demos.toLocaleString(), change: 0, icon: CalendarCheck, spark: [0] },
    { title: "Clientes", value: loading ? "..." : stats.clients.toLocaleString(), change: 0, icon: UserCheck, spark: [0] },
    { title: "Emails Enviados", value: loading ? "..." : stats.emailsSent.toLocaleString(), change: 0, icon: Mail, spark: [0] },
    { title: "Taxa Abertura", value: loading ? "..." : `${stats.emailOpenRate}%`, change: 0, icon: Eye, spark: [0] },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm md:text-xs text-muted-foreground">Visão geral do Plannus Voice Growth Engine</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {metrics.map((m, i) => (
          <MetricCard key={i} {...m} sparkData={m.spark} />
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-6 md:p-8 text-center">
        <p className="text-xs text-muted-foreground">
          Os gráficos serão populados automaticamente conforme os leads chegarem do scraper.
        </p>
      </div>
    </div>
  );
}
