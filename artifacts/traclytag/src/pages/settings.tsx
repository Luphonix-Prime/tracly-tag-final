import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 text-outline font-bold text-[10px] uppercase tracking-widest mb-6">
        <span>System Settings</span>
      </div>
      <Card className="border border-border-subtle shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 text-safety-blue" />
            <div>
              <CardTitle className="text-xl font-bold text-midnight-navy">Global Configuration</CardTitle>
              <CardDescription>Manage your industrial interface settings here.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-on-surface-variant">Settings modules are currently offline for maintenance.</p>
        </CardContent>
      </Card>
    </div>
  );
}
