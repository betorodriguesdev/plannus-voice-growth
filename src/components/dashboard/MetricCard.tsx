import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: LucideIcon;
  sparkData: number[];
}

export function MetricCard({ title, value, change, icon: Icon }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-all active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 md:w-7 md:h-7 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 md:w-3.5 md:h-3.5 text-primary" />
        </div>
      </div>
      <p className="text-2xl md:text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-xs md:text-xxs text-muted-foreground leading-tight">{title}</span>
      </div>
      <div className="flex items-center gap-1 mt-1">
        {isPositive ? (
          <TrendingUp className="w-3 h-3 text-success" />
        ) : (
          <TrendingDown className="w-3 h-3 text-destructive" />
        )}
        <span className={`text-xxs font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
          {isPositive ? "+" : ""}{change}%
        </span>
      </div>
    </motion.div>
  );
}
