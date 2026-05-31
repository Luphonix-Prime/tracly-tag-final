import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetCurrentUser, useLogout, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { 
  LayoutDashboard, Building2, Users, Package, MapPin, 
  Layers, QrCode, FileText, PackageCheck, BarChart3, ListOrdered, LogOut, Menu,
  Link as LinkIcon, ScanBarcode, Settings, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user } = useGetCurrentUser();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        setLocation("/login");
      }
    });
  };

  if (!user) return null;

  const isMaster = user.role === "master";

  const navigation = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ...(isMaster ? [{ title: "Companies", href: "/companies", icon: Building2 }] : []),
    { title: "Users", href: "/users", icon: Users },
    { title: "Products", href: "/products", icon: Package },
    { title: "Locations", href: "/locations", icon: MapPin },
    { title: "Batches", href: "/production/batches", icon: Layers },
    { title: "Generate Codes", href: "/production/codes", icon: QrCode },
    { title: "Mapping Code", href: "/mapping-code", icon: LinkIcon },
    { title: "Customer Scan", href: "/customer-scan", icon: ScanBarcode },
    { title: "Summary", href: "/production/summary", icon: PackageCheck },
    { title: "Reports", href: "/reports/stock", icon: BarChart3 },
  ];

  const bottomNavigation = [
    { title: "Settings", href: "/settings", icon: Settings },
    { title: "Support", href: "/support", icon: HelpCircle },
  ];

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("traclytag_sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("traclytag_sidebar_collapsed", String(nextState));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className={cn(
        "border-r border-white/10 bg-midnight-navy text-white flex-shrink-0 flex flex-col hidden md:flex transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="h-14 border-b border-white/10 flex items-center px-4 font-semibold text-lg tracking-tight text-white justify-between overflow-hidden">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-safety-blue shrink-0 animate-pulse" />
            {!isCollapsed && <span className="font-bold tracking-tight">TracelyTag</span>}
          </div>
          {!isCollapsed && <span className="text-[10px] text-white/40 font-mono">v2.4</span>}
        </div>
        <div className="p-3 flex-1 overflow-y-auto space-y-6">
          <div className="space-y-6">
            <div className="space-y-1">
              {navigation.map((item, i) => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
                return (
                  <Link key={i} href={item.href} className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                    isCollapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "px-4 py-2.5 gap-3",
                    isActive ? "bg-safety-blue text-white shadow-lg shadow-safety-blue/20" : "text-white/70 hover:bg-white/5 hover:text-white"
                  )} title={isCollapsed ? item.title : undefined}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                );
              })}
            </div>
            
            <div className="pt-4 border-t border-white/10 space-y-1">
              {bottomNavigation.map((item, i) => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
                return (
                  <Link key={i} href={item.href} className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                    isCollapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "px-4 py-2.5 gap-3",
                    isActive ? "bg-safety-blue text-white shadow-lg shadow-safety-blue/20" : "text-white/70 hover:bg-white/5 hover:text-white"
                  )} title={isCollapsed ? item.title : undefined}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Node status indicator matching Mockup */}
        <div className="p-3 border-t border-white/10">
          {isCollapsed ? (
            <div className="flex justify-center p-2.5 bg-white/5 rounded-lg border border-white/10 w-10 h-10 mx-auto" title="Production Node 04: Active">
              <div className="w-2 h-2 rounded-full bg-success-emerald animate-pulse"></div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Instance</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success-emerald animate-pulse"></div>
                <span className="text-xs text-white font-bold">Production Node 04</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950/20">
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hidden md:flex cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4 md:hidden">
              <QrCode className="h-5 w-5 text-safety-blue" />
              <span className="font-semibold text-midnight-navy dark:text-white">TracelyTag</span>
            </div>
            <div className="hidden md:flex items-center text-sm font-medium text-slate-500 dark:text-slate-400">
              {user.companyName ? `Company: ${user.companyName}` : "Global Admin"}
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <ThemeToggle />
            <div className="flex items-center gap-3 border-l pl-4 border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold leading-none text-midnight-navy dark:text-white">{user.username}</span>
                <Badge variant="outline" className="mt-1 text-[9px] uppercase h-4 px-1.5 border-safety-blue/30 text-safety-blue bg-safety-blue/5">{user.role.replace('_', ' ')}</Badge>
              </div>
              <Avatar className="h-8 w-8 border border-safety-blue/20">
                <AvatarFallback className="bg-safety-blue/10 text-safety-blue text-xs font-semibold">
                  {user.username.substring(0,2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Log out</span>
              </Button>
            </div>
          </div>
        </header>
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}