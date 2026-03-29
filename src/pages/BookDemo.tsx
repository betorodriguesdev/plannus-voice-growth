import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock, Check, Zap, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDays, format, isSameDay, startOfWeek, eachDayOfInterval, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

const AVAILABLE_SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

// Simulate some busy slots
const busySlots: Record<string, string[]> = {};
const now = new Date();
busySlots[format(now, "yyyy-MM-dd")] = ["09:00", "14:00"];
busySlots[format(addDays(now, 1), "yyyy-MM-dd")] = ["10:00", "15:00"];

export default function BookDemo() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "form" | "confirmed">("select");

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 1 }),
  }).filter((_, i) => i < 5); // Mon-Fri only

  const getAvailableSlots = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    const busy = busySlots[key] || [];
    return AVAILABLE_SLOTS.filter(s => !busy.includes(s));
  };

  const handleConfirm = () => setStep("confirmed");

  if (step === "confirmed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Demo Agendada!</h1>
          <p className="text-sm text-muted-foreground mb-1">
            {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}
          </p>
          <p className="text-sm text-primary font-medium mb-4">{selectedTime}</p>
          <p className="text-xs text-muted-foreground">
            Você receberá um email com o link da reunião. Obrigado por agendar com a Plannus Voice!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground tracking-tight">PLANNUS VOICE</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-1">Agende uma Demo</h1>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Agente de voz IA para sua empresa
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />30 min</span>
            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />Online</span>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {step === "select" ? (
            <div className="p-6">
              {/* Week navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium text-foreground capitalize">
                  {format(weekDays[0], "d MMM", { locale: ptBR })} — {format(weekDays[4], "d MMM yyyy", { locale: ptBR })}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Day selector */}
              <div className="grid grid-cols-5 gap-2 mb-5">
                {weekDays.map(day => {
                  const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <button
                      key={day.toISOString()}
                      disabled={isPast}
                      onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                      className={`rounded-lg p-3 text-center transition-all border ${
                        isPast
                          ? "opacity-30 cursor-not-allowed border-transparent"
                          : isSelected
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      <div className="text-[10px] uppercase text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</div>
                      <div className="text-lg font-semibold">{format(day, "d")}</div>
                      <div className="text-[10px] text-muted-foreground">{format(day, "MMM", { locale: ptBR })}</div>
                    </button>
                  );
                })}
              </div>

              {/* Time slots */}
              {selectedDate && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-xs text-muted-foreground mb-3">Horários disponíveis:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {getAvailableSlots(selectedDate).map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 rounded-md text-sm font-medium transition-all border ${
                          selectedTime === slot
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  {selectedTime && (
                    <Button className="w-full mt-4 text-xs" onClick={() => setStep("form")}>
                      Continuar
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
              <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span className="capitalize">{selectedDate && format(selectedDate, "EEEE, d MMM yyyy", { locale: ptBR })}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>{selectedTime}</span>
                <button onClick={() => setStep("select")} className="ml-auto text-primary hover:underline">Alterar</button>
              </div>
              <div className="space-y-3">
                <div><Label className="text-xs">Seu nome</Label><Input placeholder="Nome completo" className="mt-1 h-8 text-xs" /></div>
                <div><Label className="text-xs">Email</Label><Input type="email" placeholder="seu@email.com" className="mt-1 h-8 text-xs" /></div>
                <div><Label className="text-xs">Nome da Empresa</Label><Input placeholder="Nome da sua empresa" className="mt-1 h-8 text-xs" /></div>
                <div><Label className="text-xs">Cidade / País</Label><Input placeholder="Ex: São Paulo, Brasil" className="mt-1 h-8 text-xs" /></div>
                <div><Label className="text-xs">Observações (opcional)</Label><Textarea placeholder="Alguma informação adicional..." className="mt-1 text-xs min-h-[60px]" /></div>
                <Button className="w-full text-xs" onClick={handleConfirm}>Confirmar Agendamento</Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
