import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Search, Bell } from "lucide-react";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          {/* Mobile: Logo | Desktop: Search */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">PLANNUS VOICE</span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-secondary rounded-md px-3 py-1.5 w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar empresas, eventos, leads..."
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
            <kbd className="text-xxs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile search icon */}
            <button className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors">
              <Search className="w-4.5 h-4.5 text-muted-foreground" />
            </button>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors relative">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
              U
            </div>
          </div>
        </header>

        {/* Main content — add bottom padding on mobile for nav */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}
