import { Link, useLocation } from "wouter";
import { useGetCurrentUser, useLogout, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { 
  LayoutDashboard, Building2, Users, Package, MapPin, 
  Layers, QrCode, FileText, PackageCheck, BarChart3, ListOrdered, LogOut
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
    {
      title: "Master Data",
      items: [
        ...(isMaster ? [{ title: "Companies", href: "/companies", icon: Building2 }] : []),
        { title: "Users", href: "/users", icon: Users },
        { title: "Products", href: "/products", icon: Package },
        { title: "Locations", href: "/locations", icon: MapPin },
      ]
    },
    {
      title: "Production",
      items: [
        { title: "Batches", href: "/production/batches", icon: Layers },
        { title: "Generate Codes", href: "/production/codes", icon: QrCode },
        { title: "Summary", href: "/production/summary", icon: PackageCheck },
      ]
    },
    {
      title: "Reports",
      items: [
        { title: "Stock Report", href: "/reports/stock", icon: BarChart3 },
        { title: "Product Report", href: "/reports/product", icon: FileText },
        { title: "Marked By Log", href: "/reports/marked-by", icon: ListOrdered },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r bg-sidebar flex-shrink-0 flex flex-col hidden md:flex">
        <div className="h-14 border-b flex items-center px-4 font-semibold text-lg tracking-tight">
          <QrCode className="mr-2 h-5 w-5 text-primary" />
          TraclyTag
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <Link href="/dashboard" className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === "/dashboard" ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
              )}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </div>
            
            {navigation.slice(1).map((group, i) => (
              <div key={i} className="space-y-1">
                <h4 className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
                  {group.title}
                </h4>
                {group.items?.map((item, j) => (
                  <Link key={j} href={item.href} className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location === item.href || location.startsWith(item.href + "/") ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                  )}>
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 md:hidden">
            <QrCode className="h-5 w-5 text-primary" />
            <span className="font-semibold">TraclyTag</span>
          </div>
          <div className="hidden md:flex items-center text-sm text-muted-foreground">
            {user.companyName ? `Company: ${user.companyName}` : "Global Admin"}
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <ThemeToggle />
            <div className="flex items-center gap-3 border-l pl-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium leading-none">{user.username}</span>
                <Badge variant="outline" className="mt-1 text-[10px] uppercase h-4 px-1">{user.role.replace('_', ' ')}</Badge>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user.username.substring(0,2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="ml-1 text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Log out</span>
              </Button>
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}