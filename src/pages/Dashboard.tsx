import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Church, Search, Smartphone, Phone, CalendarCheck, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getLeadSourceType } from "@/lib/lead-source";

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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      let allLeads: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data } = await supabase.from("leads").select("status, source, metadata").range(from, from + PAGE_SIZE - 1);
        if (!data || data.length === 0) break;
        allLeads = allLeads.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      const { count: callCount } = await supabase.from("call_logs").select("*", { count: "exact", head: true });
      const { count: demoCount } = await supabase.from("calendar_events").select("*", { count: "exact", head: true }).eq("event_type", "demo");

      const all = allLeads;
      setStats({
        totalLeads: all.length,
        scraperLeads: all.filter(l => getLeadSourceType(l.source, l.metadata) === "scraper").length,
        appLeads: all.filter(l => getLeadSourceType(l.source, l.metadata) === "app").length,
        qualified: all.filter(l => (l.status || "") !== "novo").length,
        contacted: all.filter(l => ["em_contato", "falou_com_pastor"].includes(l.status || "")).length,
        calls: callCount || 0,
        demos: demoCount || 0,
        clients: all.filter(l => l.status === "cliente").length,
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
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm md:text-xs text-muted-foreground">Visão geral do Plannus Voice Growth Engine</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
