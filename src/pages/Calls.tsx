import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone, Play, Pause, Clock, ChevronRight, Volume2,
  MessageSquare, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface CallLog {
  id: string;
  retell_call_id: string | null;
  call_status: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  to_number: string | null;
  transcript: string | null;
  summary: string | null;
  sentiment: string | null;
  attempt_number: number | null;
  lead_id: string | null;
  metadata: any;
  leads?: { church_name: string | null; business_name?: string | null; pastor_name: string | null; owner_name?: string | null } | null;
}

interface RetellCallData {
  recording_url: string | null;
  transcript: string | null;
  transcript_object: Array<{ role: string; content: string }> | null;
  call_analysis: { call_summary?: string; user_sentiment?: string } | null;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function SentimentIcon({ sentiment }: { sentiment: string | null }) {
  if (sentiment === "Positive") return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (sentiment === "Negative") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function statusColor(status: string | null) {
  switch (status) {
    case "ended": return "bg-emerald-500/15 text-emerald-600 border-emerald-500/20";
    case "initiated": return "bg-amber-500/15 text-amber-600 border-amber-500/20";
    case "error": return "bg-red-500/15 text-red-600 border-red-500/20";
    default: return "bg-muted text-muted-foreground";
  }
}

function statusLabel(status: string | null) {
  switch (status) {
    case "ended": return "Finalizada";
    case "initiated": return "Iniciada";
    case "error": return "Erro";
    case "no-answer": return "Sem resposta";
    default: return status || "—";
  }
}

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const seek = (val: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val[0];
      setCurrentTime(val[0]);
    }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
      <audio ref={audioRef} src={url} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground active:scale-95 transition-transform shadow-lg"
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <div className="flex-1 space-y-1.5">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={seek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
        <Volume2 className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function TranscriptViewer({ transcript, transcriptObject }: { transcript: string | null; transcriptObject: Array<{ role: string; content: string }> | null }) {
  if (transcriptObject && transcriptObject.length > 0) {
    return (
      <div className="space-y-3">
        {transcriptObject.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "agent" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "agent"
                ? "bg-muted text-foreground rounded-bl-md"
                : "bg-primary/10 text-foreground rounded-br-md"
            }`}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {msg.role === "agent" ? "🤖 Plannus Voice IA" : "👤 Proprietário"}
              </span>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transcript) {
    return (
      <div className="bg-muted/50 rounded-2xl p-4">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{transcript}</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 rounded-2xl p-6 text-center">
      <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Transcrição não disponível</p>
    </div>
  );
}

export default function Calls() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [retellData, setRetellData] = useState<RetellCallData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCalls = async () => {
    const { data } = await supabase
      .from("call_logs")
      .select("*, leads(church_name, business_name, pastor_name, owner_name)")
      .order("started_at", { ascending: false })
      .limit(200);
    // Only show calls that have recordings
    const withRecordings = ((data as any) || []).filter((call: any) => {
      const meta = call.metadata as any;
      return meta?.recording_url;
    });
    setCalls(withRecordings);
    setLoading(false);
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const syncFromRetell = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("retell-sync");
      if (error) throw error;
      toast.success(`Sincronizado! ${data.synced} novas, ${data.updated} atualizadas (${data.total_retell} total no Retell)`);
      await fetchCalls();
    } catch (e: any) {
      console.error("Sync error:", e);
      toast.error("Erro ao sincronizar: " + (e.message || "erro desconhecido"));
    }
    setSyncing(false);
  };

  const openCall = async (call: CallLog) => {
    setSelectedCall(call);
    setRetellData(null);

    // First check if we already have recording data in metadata
    const meta = call.metadata as any;
    if (meta?.recording_url || meta?.transcript_object) {
      setRetellData({
        recording_url: meta.recording_url || null,
        transcript: call.transcript,
        transcript_object: meta.transcript_object || null,
        call_analysis: meta.call_analysis || null,
      });
      return;
    }

    // Fallback: fetch from Retell API
    if (call.retell_call_id) {
      setLoadingDetail(true);
      try {
        const { data, error } = await supabase.functions.invoke("retell-recording", {
          body: { call_id: call.retell_call_id },
        });
        if (!error && data) {
          setRetellData(data as RetellCallData);
        }
      } catch (e) {
        console.error("Error fetching recording:", e);
      }
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Ligações IA</h1>
          <p className="text-sm text-muted-foreground">{calls.length} chamadas registradas</p>
        </div>
        <button
          onClick={syncFromRetell}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar Retell"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call, i) => (
            <motion.button
              key={call.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => openCall(call)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all active:scale-[0.98] text-left group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                call.call_status === "ended" ? "bg-emerald-500/15" : "bg-muted"
              }`}>
                <Phone className={`w-4 h-4 ${
                  call.call_status === "ended" ? "text-emerald-600" : "text-muted-foreground"
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {(call as any).leads?.business_name || (call as any).leads?.church_name || call.to_number || "Desconhecido"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{formatTime(call.started_at)}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(call.duration_seconds)}
                  </span>
                  <SentimentIcon sentiment={call.sentiment} />
                </div>
              </div>

              <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor(call.call_status)}`}>
                {statusLabel(call.call_status)}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
            </motion.button>
          ))}
        </div>
      )}

      <Sheet open={!!selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] bg-card border-border p-0">
          <SheetTitle className="sr-only">Detalhes da ligação</SheetTitle>
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-2" />
          
          {selectedCall && (
            <ScrollArea className="h-full px-5 pb-10">
              <div className="py-4 border-b border-border mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {(selectedCall as any).leads?.business_name || (selectedCall as any).leads?.church_name || selectedCall.to_number || "Ligação"}
                </h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <Badge variant="outline" className={`text-xs ${statusColor(selectedCall.call_status)}`}>
                    {statusLabel(selectedCall.call_status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatTime(selectedCall.started_at)}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDuration(selectedCall.duration_seconds)}
                  </span>
                  <SentimentIcon sentiment={selectedCall.sentiment} />
                </div>
                {((selectedCall as any).leads?.owner_name || (selectedCall as any).leads?.pastor_name) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Proprietário: {(selectedCall as any).leads.owner_name || (selectedCall as any).leads.pastor_name}
                  </p>
                )}
                {selectedCall.to_number && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    📞 {selectedCall.to_number}
                  </p>
                )}
              </div>

              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Carregando gravação...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {(retellData?.call_analysis?.call_summary || selectedCall.summary) && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Resumo</h3>
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                        <p className="text-sm text-foreground leading-relaxed">
                          {retellData?.call_analysis?.call_summary || selectedCall.summary}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Gravação</h3>
                    {retellData?.recording_url ? (
                      <AudioPlayer url={retellData.recording_url} />
                    ) : (
                      <div className="bg-muted/30 rounded-2xl p-6 text-center">
                        <Volume2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Gravação não disponível</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Transcrição</h3>
                    <TranscriptViewer
                      transcript={retellData?.transcript || selectedCall.transcript}
                      transcriptObject={retellData?.transcript_object || null}
                    />
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
