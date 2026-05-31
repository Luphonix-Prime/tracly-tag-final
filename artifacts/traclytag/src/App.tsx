import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { Loader2, Lock } from "lucide-react";
import { useEffect } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import PublicVerify from "@/pages/public-verify";
import Activate from "@/pages/activate";
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

import MappingCode from "@/pages/mapping-code";
import CustomerScan from "@/pages/customer-scan";
import Settings from "@/pages/settings";
import Support from "@/pages/support";

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

  const currentPlan = (user as any).subscriptionPlan || "free";
  const path = window.location.pathname;

  const getRequiredPlan = (path: string) => {
    if (path.startsWith("/production/codes") || path.startsWith("/production/summary") || path.startsWith("/reports")) {
      return "enterprise";
    }
    if (path.startsWith("/production/batches") || path.startsWith("/mapping-code") || path.startsWith("/customer-scan")) {
      return "standard";
    }
    return "free";
  };

  const isPlanSufficient = (required: string, current: string) => {
    if (current === "enterprise") return true;
    if (current === "standard") return required !== "enterprise";
    return required === "free";
  };

  const requiredPlan = getRequiredPlan(path);
  const isAllowed = isPlanSufficient(requiredPlan, currentPlan);

  if (!isAllowed) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-lg mx-auto font-sans">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-md mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">Upgrade Subscription Required</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
            The module at <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400">{path}</code> is restricted to companies on the <strong className="capitalize">{requiredPlan} plan</strong> or higher. You are currently on the <strong className="capitalize">{currentPlan} plan</strong>.
          </p>
          <a
            href="http://localhost:5000/pricing"
            className="inline-flex items-center justify-center bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg hover:shadow-teal-500/20 active:scale-[0.98]"
          >
            Upgrade Plan Now
          </a>
        </div>
      </AppLayout>
    );
  }

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
      <Route path="/code/:serial" component={PublicVerify} />
      <Route path="/activate" component={Activate} />
      <Route path="/" component={RedirectToDashboard} />
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/companies"><ProtectedRoute component={Companies} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route path="/products"><ProtectedRoute component={Products} /></Route>
      <Route path="/locations"><ProtectedRoute component={Locations} /></Route>
      <Route path="/production/batches"><ProtectedRoute component={Batches} /></Route>
      <Route path="/production/codes"><ProtectedRoute component={Codes} /></Route>
      <Route path="/mapping-code"><ProtectedRoute component={MappingCode} /></Route>
      <Route path="/customer-scan"><ProtectedRoute component={CustomerScan} /></Route>
      <Route path="/production/summary"><ProtectedRoute component={Summary} /></Route>
      <Route path="/reports/stock"><ProtectedRoute component={StockReport} /></Route>
      <Route path="/reports/product"><ProtectedRoute component={ProductReport} /></Route>
      <Route path="/reports/marked-by"><ProtectedRoute component={MarkedByLog} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      <Route path="/support"><ProtectedRoute component={Support} /></Route>
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