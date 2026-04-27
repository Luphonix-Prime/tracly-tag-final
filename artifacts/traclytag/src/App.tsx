import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Companies from "@/pages/companies";
import Users from "@/pages/users";
import Products from "@/pages/products";
import Locations from "@/pages/locations";
import Batches from "@/pages/production/batches";
import Codes from "@/pages/production/codes";
import Summary from "@/pages/production/summary";
import StockReport from "@/pages/reports/stock";
import ProductReport from "@/pages/reports/product";
import MarkedByLog from "@/pages/reports/marked-by";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function RedirectToDashboard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/dashboard");
  }, [setLocation]);
  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { data: user, isLoading, error } = useGetCurrentUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && error && (error as any).status === 401) {
      setLocation("/login");
    }
  }, [isLoading, error, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={RedirectToDashboard} />
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/companies"><ProtectedRoute component={Companies} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route path="/products"><ProtectedRoute component={Products} /></Route>
      <Route path="/locations"><ProtectedRoute component={Locations} /></Route>
      <Route path="/production/batches"><ProtectedRoute component={Batches} /></Route>
      <Route path="/production/codes"><ProtectedRoute component={Codes} /></Route>
      <Route path="/production/summary"><ProtectedRoute component={Summary} /></Route>
      <Route path="/reports/stock"><ProtectedRoute component={StockReport} /></Route>
      <Route path="/reports/product"><ProtectedRoute component={ProductReport} /></Route>
      <Route path="/reports/marked-by"><ProtectedRoute component={MarkedByLog} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;