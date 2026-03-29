import { useState } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";

const events = [
  { id: 1, name: "Conferência Adoração Global", city: "São Paulo", country: "Brasil", date: "2026-04-15", organizer: "ABCM", website: "adoracaoglobal.com.br", status: "Novo" },
  { id: 2, name: "Worship Summit Europe", city: "Amsterdã", country: "Holanda", date: "2026-05-20", organizer: "EWN", website: "worshipsummit.eu", status: "Contato feito" },
  { id: 3, name: "Asia Church Conference", city: "Singapura", country: "Singapura", date: "2026-06-10", organizer: "ACC Asia", website: "asiachurchconf.com", status: "Demo" },
  { id: 4, name: "Encontro de Empreendedores", city: "Lisboa", country: "Portugal", date: "2026-07-01", organizer: "Business CPLP", website: "encontroempreendedores.pt", status: "Novo" },
  { id: 5, name: "Global Mission Fest", city: "Nairobi", country: "Quênia", date: "2026-08-12", organizer: "GMF Africa", website: "globalmissionfest.org", status: "Evento fechado" },
];

const statusOpts = ["Novo", "Contato feito", "Demo", "Evento fechado"];
const statusColors: Record<string, string> = {
  "Novo": "bg-info/10 text-info",
  "Contato feito": "bg-primary/10 text-primary",
  "Demo": "bg-warning/10 text-warning",
  "Evento fechado": "bg-success/10 text-success",
};

export default function Events() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState(events);
  const filtered = data.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = (id: number, status: string) => {
    setData(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Eventos</h1>
        <p className="text-xs text-muted-foreground">Eventos de negócios descobertos</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-1.5 flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar eventos..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1" />
        </div>
        <button className="flex items-center gap-1.5 bg-card border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Filter className="w-3.5 h-3.5" /> Filtros <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Evento", "Cidade", "País", "Data", "Organizador", "Status"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xxs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="px-4 py-2.5">
                  <p className="text-xs font-medium text-foreground">{e.name}</p>
                  <p className="text-xxs text-muted-foreground">{e.website}</p>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.city}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.country}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.date}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.organizer}</td>
                <td className="px-4 py-2.5">
                  <select
                    value={e.status}
                    onChange={ev => updateStatus(e.id, ev.target.value)}
                    className={`text-xxs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${statusColors[e.status] || "bg-muted text-muted-foreground"}`}
                  >
                    {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
