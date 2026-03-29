import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, Phone, Mail, RotateCcw, Monitor, Cross, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format,
  isSameDay, isSameMonth, eachDayOfInterval, addMonths, subMonths,
  addWeeks, subWeeks, getHours, getMinutes
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type EventType = "ligacao_ia" | "email" | "follow_up" | "demo" | "evento_cristao" | "ai_call_retry" | "call";

const EVENT_COLORS: Record<string, string> = {
  ligacao_ia: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  ai_call_retry: "bg-red-500/20 text-red-400 border-red-500/30",
  call: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  email: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  follow_up: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  demo: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  evento_cristao: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const EVENT_LABELS: Record<string, string> = {
  ligacao_ia: "Ligação IA",
  ai_call_retry: "Re-tentativa",
  call: "Ligação",
  email: "Email",
  follow_up: "Follow-up",
  demo: "Demo",
  evento_cristao: "Evento Cristão",
};

const EVENT_ICONS: Record<string, typeof Phone> = {
  ligacao_ia: Phone,
  ai_call_retry: RotateCcw,
  call: Phone,
  email: Mail,
  follow_up: RotateCcw,
  demo: Monitor,
  evento_cristao: Cross,
};

type ViewMode = "day" | "week" | "month";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [events, setEvents] = useState<Tables<"calendar_events">[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Tables<"calendar_events"> | null>(null);
  const [showNewEvent, setShowNewEvent] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from("calendar_events").select("*").order("start_time", { ascending: true });
      setEvents(data || []);
    };
    fetchEvents();
    const channel = supabase
      .channel("calendar-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  const navigate = (dir: number) => {
    if (viewMode === "month") setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getEventsForDay = (day: Date) => events.filter(e => isSameDay(new Date(e.start_time), day));

  const headerLabel = () => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (viewMode === "week") return `${format(weekDays[0], "d MMM", { locale: ptBR })} — ${format(weekDays[6], "d MMM yyyy", { locale: ptBR })}`;
    return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  };

  const EventChip = ({ event }: { event: Tables<"calendar_events"> }) => {
    const type = event.event_type || "call";
    const Icon = EVENT_ICONS[type] || Phone;
    return (
      <button
        onClick={() => setSelectedEvent(event)}
        className={`w-full text-left rounded px-1.5 py-0.5 text-[11px] border truncate flex items-center gap-1 ${EVENT_COLORS[type] || EVENT_COLORS.call} hover:brightness-125 transition-all cursor-pointer`}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span className="truncate">{event.title}</span>
      </button>
    );
  };

  const TimeGrid = ({ days }: { days: Date[] }) => (
    <div className="flex-1 overflow-auto">
      <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div className="sticky top-0 z-10 bg-background border-b border-border" />
        {days.map(day => (
          <div key={day.toISOString()} className={`sticky top-0 z-10 bg-background border-b border-l border-border px-2 py-2 text-center ${isSameDay(day, new Date()) ? "bg-primary/5" : ""}`}>
            <div className="text-[11px] text-muted-foreground uppercase">{format(day, "EEE", { locale: ptBR })}</div>
            <div className={`text-lg font-semibold ${isSameDay(day, new Date()) ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</div>
          </div>
        ))}
        {hours.map(hour => (
          <>
            <div key={`t-${hour}`} className="h-16 border-b border-border pr-2 text-right">
              <span className="text-[10px] text-muted-foreground -mt-2 block">{`${hour}:00`}</span>
            </div>
            {days.map(day => {
              const dayEvents = getEventsForDay(day).filter(e => getHours(new Date(e.start_time)) === hour);
              return (
                <div key={`${day.toISOString()}-${hour}`} className={`h-16 border-b border-l border-border p-0.5 relative ${isSameDay(day, new Date()) ? "bg-primary/[0.02]" : ""}`}>
                  {dayEvents.map(ev => {
                    const startDate = new Date(ev.start_time);
                    const endDate = ev.end_time ? new Date(ev.end_time) : new Date(startDate.getTime() + 30 * 60000);
                    const duration = (endDate.getTime() - startDate.getTime()) / 3600000;
                    const topOffset = (getMinutes(startDate) / 60) * 64;
                    return (
                      <div
                        key={ev.id}
                        className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] border cursor-pointer hover:brightness-125 transition-all ${EVENT_COLORS[ev.event_type || "call"] || EVENT_COLORS.call}`}
                        style={{ top: topOffset, height: Math.max(duration * 64, 20) }}
                        onClick={() => setSelectedEvent(ev)}
                      >
                        <div className="font-medium truncate">{ev.title}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );

  const MonthGrid = () => (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
          <div key={d} className="text-center text-[11px] text-muted-foreground py-2 border-b border-border font-medium uppercase">{d}</div>
        ))}
        {monthDays.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          return (
            <div key={day.toISOString()} className={`min-h-[100px] border-b border-r border-border p-1 ${!isCurrentMonth ? "opacity-30" : ""} ${isSameDay(day, new Date()) ? "bg-primary/5" : ""}`}>
              <div className={`text-[11px] mb-1 ${isSameDay(day, new Date()) ? "text-primary font-bold" : "text-muted-foreground"}`}>{format(day, "d")}</div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => <EventChip key={ev.id} event={ev} />)}
                {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} mais</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <h2 className="text-sm font-semibold text-foreground capitalize">{headerLabel()}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-md p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1 text-[11px] rounded transition-colors ${viewMode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 overflow-hidden flex flex-col">
          {viewMode === "month" ? <MonthGrid /> : <TimeGrid days={viewMode === "day" ? [currentDate] : weekDays} />}
        </motion.div>
      </AnimatePresence>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-sm">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span className="text-foreground">{format(new Date(selectedEvent.start_time), "dd/MM/yyyy HH:mm")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><Badge variant="outline" className={`text-[10px] ${EVENT_COLORS[selectedEvent.event_type || "call"] || ""}`}>{EVENT_LABELS[selectedEvent.event_type || "call"] || selectedEvent.event_type}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-foreground">{selectedEvent.status}</span></div>
                {selectedEvent.description && (
                  <div><span className="text-muted-foreground">Descrição</span><p className="text-foreground mt-1">{selectedEvent.description}</p></div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
