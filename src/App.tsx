import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Businesses from "./pages/Businesses";
import Calls from "./pages/Calls";
import Events from "./pages/Events";
import Pipeline from "./pages/Pipeline";
import AIDiscovery from "./pages/AIDiscovery";
import ContactAutomation from "./pages/ContactAutomation";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/Settings";
import CalendarPage from "./pages/Calendar";
import BookDemo from "./pages/BookDemo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/businesses" element={<Businesses />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/events" element={<Events />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/discovery" element={<AIDiscovery />} />
            <Route path="/automation" element={<ContactAutomation />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/book-demo" element={<BookDemo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
