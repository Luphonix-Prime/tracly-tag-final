import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Link2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMappingCodeVisibility } from "@/hooks/use-mapping-code-visibility";

export default function Settings() {
  const { hideMappingCode, toggleVisibility } = useMappingCodeVisibility();

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      <div className="flex items-center gap-4 text-outline font-bold text-[10px] uppercase tracking-widest mb-6">
        <span>System Settings</span>
      </div>
      <Card className="border border-border-subtle shadow-sm bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 text-safety-blue" />
            <div>
              <CardTitle className="text-xl font-bold text-midnight-navy dark:text-white">Global Configuration</CardTitle>
              <CardDescription className="dark:text-slate-400">Manage your industrial interface settings here.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-safety-blue/10 rounded-lg text-safety-blue mt-0.5">
                <Link2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mapping-code-toggle" className="text-sm font-bold text-midnight-navy dark:text-white cursor-pointer">
                  Hide Mapping Code Link
                </Label>
                <p className="text-xs text-on-surface-variant dark:text-slate-400">
                  When enabled, the "Mapping Code" link will be hidden from the sidebar navigation.
                </p>
              </div>
            </div>
            <Switch
              id="mapping-code-toggle"
              checked={hideMappingCode}
              onCheckedChange={toggleVisibility}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
