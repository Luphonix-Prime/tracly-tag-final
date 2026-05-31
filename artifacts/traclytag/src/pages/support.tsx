import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

export default function Support() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 text-outline font-bold text-[10px] uppercase tracking-widest mb-6">
        <span>Help & Support</span>
      </div>
      <Card className="border border-border-subtle shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-safety-blue" />
            <div>
              <CardTitle className="text-xl font-bold text-midnight-navy">Support Center</CardTitle>
              <CardDescription>Get assistance with the industrial platform.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-on-surface-variant">Please contact your administrator for system support.</p>
        </CardContent>
      </Card>
    </div>
  );
}
