import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

const discoveryData = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  value: Math.floor(Math.random() * 200 + 50),
}));

const emailData = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}`,
  enviados: Math.floor(Math.random() * 300 + 100),
  abertos: Math.floor(Math.random() * 150 + 50),
  respondidos: Math.floor(Math.random() * 40 + 5),
}));

const callData = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}`,
  ligacoes: Math.floor(Math.random() * 50 + 10),
  atendidas: Math.floor(Math.random() * 25 + 5),
}));

const conversionData = [
  { month: "Jan", taxa: 2.1 }, { month: "Fev", taxa: 3.4 }, { month: "Mar", taxa: 3.8 },
  { month: "Abr", taxa: 5.2 }, { month: "Mai", taxa: 6.1 }, { month: "Jun", taxa: 7.4 },
];

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
        <p className="text-xs text-muted-foreground">Métricas detalhadas do Growth Engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-medium text-foreground mb-3">Empresas Descobertas (30 dias)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={discoveryData}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(223,100%,59%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(223,100%,59%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(220,15%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220,15%,50%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="value" name="Empresas" stroke="hsl(223,100%,59%)" strokeWidth={2} fill="url(#ag)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-medium text-foreground mb-3">Emails (14 dias)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emailData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(220,15%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220,15%,50%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="enviados" name="Enviados" fill="hsl(223,100%,59%)" radius={[2,2,0,0]} />
                <Bar dataKey="abertos" name="Abertos" fill="hsl(199,89%,48%)" radius={[2,2,0,0]} />
                <Bar dataKey="respondidos" name="Respondidos" fill="hsl(142,70%,45%)" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-medium text-foreground mb-3">Ligações IA (14 dias)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={callData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(220,15%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220,15%,50%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="ligacoes" name="Ligações" stroke="hsl(223,100%,59%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="atendidas" name="Atendidas" stroke="hsl(142,70%,45%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-medium text-foreground mb-3">Taxa de Conversão (%)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={conversionData}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142,70%,45%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(142,70%,45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220,15%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220,15%,50%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="taxa" name="Taxa %" stroke="hsl(142,70%,45%)" strokeWidth={2} fill="url(#cg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
