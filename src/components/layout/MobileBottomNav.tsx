import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Church, Kanban, BarChart3, Menu, Phone
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  CalendarDays, Brain, Mail, Settings, Zap, Calendar
} from "lucide-react";

const mainTabs = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/businesses", icon: Church, label: "Empresas" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
];

const allNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/businesses", icon: Church, label: "Empresas" },
  { to: "/calls", icon: Phone, label: "Ligações IA" },
  { to: "/events", icon: CalendarDays, label: "Eventos" },
  { to: "/calendar", icon: Calendar, label: "Calendário" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline" },
  { to: "/discovery", icon: Brain, label: "Descoberta IA" },
  { to: "/automation", icon: Mail, label: "Automação" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export function MobileBottomNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mainTabs.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px] ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-primary/15" : ""}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground min-w-[56px]">
              <div className="p-1.5">
                <Menu className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium leading-none">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl pb-8 bg-card border-border">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6 mt-2" />
            <div className="grid grid-cols-4 gap-3 px-2">
              {allNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
