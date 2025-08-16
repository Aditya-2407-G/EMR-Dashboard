import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmrDataProvider } from "@/context/EmrDataContext";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

/**
 * Router component that defines the application routes
 * Uses React Router DOM for client-side routing
 */
function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Main App component
 * Provides global providers for UI components, data management, and routing
 */
function App() {
  return (
    <EmrDataProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </EmrDataProvider>
  );
}

export default App;
