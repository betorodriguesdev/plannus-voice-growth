import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Church, CalendarDays, Kanban, Brain, Mail, BarChart3, Settings, Zap, Calendar, Phone, Send
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/businesses", icon: Church, label: "Empresas" },
  { to: "/calls", icon: Phone, label: "Ligações IA" },
  { to: "/events", icon: CalendarDays, label: "Eventos" },
  { to: "/calendar", icon: Calendar, label: "Calendário" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline" },
  { to: "/discovery", icon: Brain, label: "Descoberta IA" },
  { to: "/emails", icon: Send, label: "Email Outreach" },
  { to: "/automation", icon: Mail, label: "Automação" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export function AppSidebar() {
  return (
    <aside className="w-[220px] min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-20 flex items-center px-4 border-b border-sidebar-border">
        <img src="/logo-plannus.png" alt="Plannus Voice" className="h-16 w-auto" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">Plannus Voice</p>
            <p className="text-xxs text-sidebar-foreground">Growth Engine</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
