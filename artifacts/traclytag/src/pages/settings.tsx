import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Link2, ShieldAlert, Database, Layers, KeyRound } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMappingCodeVisibility } from "@/hooks/use-mapping-code-visibility";
import { useDevOptionsVisibility } from "@/hooks/use-dev-options-visibility";
import { useDatamatrixUrlMode } from "@/hooks/use-datamatrix-url-mode";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { usePackagingHierarchyVisibility } from "@/hooks/use-packaging-hierarchy-visibility";
import { usePackagingLevelVisibility } from "@/hooks/use-packaging-level-visibility";
import { useConfirmAlerts } from "@/hooks/useConfirmAlerts";

export default function Settings() {
  const { hideMappingCode, toggleVisibility } = useMappingCodeVisibility();
  const { hideDevOptions, hideSsoOptions, setDevVisibility, setSsoVisibility } = useDevOptionsVisibility();
  const { datamatrixUrlMode, setUrlMode } = useDatamatrixUrlMode();
  const { hidePackagingHierarchy, toggleVisibility: togglePackagingHierarchyVisibility } = usePackagingHierarchyVisibility();
  const { hidePackagingLevel, toggleVisibility: togglePackagingLevelVisibility } = usePackagingLevelVisibility();
  const { confirmCount, updateConfirmCount } = useConfirmAlerts();
  const { data: currentUser } = useGetCurrentUser();

  const [enableOtpSystem, setEnableOtpSystem] = useState(true);
  const [enableCustomerScanOtp, setEnableCustomerScanOtp] = useState(true);

  useEffect(() => {
    fetch("/api/system-config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (typeof data.enableOtpSystem === "boolean") {
            setEnableOtpSystem(data.enableOtpSystem);
          }
          if (typeof data.enableCustomerScanOtp === "boolean") {
            setEnableCustomerScanOtp(data.enableCustomerScanOtp);
          }
        }
      })
      .catch(() => {});
  }, []);

  const toggleOtpSystem = async (enabled: boolean) => {
    setEnableOtpSystem(enabled);
    try {
      await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableOtpSystem: enabled }),
      });
    } catch (err) {
      // ignore
    }
  };

  const toggleCustomerScanOtp = async (enabled: boolean) => {
    setEnableCustomerScanOtp(enabled);
    try {
      await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableCustomerScanOtp: enabled }),
      });
    } catch (err) {
      // ignore
    }
  };

  const [hideRecentSerialization, setHideRecentSerialization] = useState(() => {
    return localStorage.getItem("traclytag_hide_recent_serialization") === "true";
  });

  const toggleRecentSerialization = (checked: boolean) => {
    localStorage.setItem("traclytag_hide_recent_serialization", String(checked));
    setHideRecentSerialization(checked);
    window.dispatchEvent(new Event("traclytag_recent_serialization_visibility_changed"));
  };

  const isSuperMaster = currentUser?.role === "super_master";

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
          {!isSuperMaster && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6 font-semibold">
              Only Super Master users can configure global system settings.
            </p>
          )}

          {isSuperMaster && (
            <>
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

              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-safety-blue/10 rounded-lg text-safety-blue mt-0.5">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="packaging-hierarchy-toggle" className="text-sm font-bold text-midnight-navy dark:text-white cursor-pointer">
                      Hide Packaging Hierarchy
                    </Label>
                    <p className="text-xs text-on-surface-variant dark:text-slate-400">
                      When enabled, the "Packaging Hierarchy" (Shipper and Pallet inputs) will be hidden from the product creation screen.
                    </p>
                  </div>
                </div>
                <Switch
                  id="packaging-hierarchy-toggle"
                  checked={hidePackagingHierarchy}
                  onCheckedChange={togglePackagingHierarchyVisibility}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-safety-blue/10 rounded-lg text-safety-blue mt-0.5">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="packaging-level-toggle" className="text-sm font-bold text-midnight-navy dark:text-white cursor-pointer">
                      Hide Packaging Level Selection
                    </Label>
                    <p className="text-xs text-on-surface-variant dark:text-slate-400">
                      When enabled, the "Packaging Level" dropdown will be hidden from the code generation form.
                    </p>
                  </div>
                </div>
                <Switch
                  id="packaging-level-toggle"
                  checked={hidePackagingLevel}
                  onCheckedChange={togglePackagingLevelVisibility}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-safety-blue/10 rounded-lg text-safety-blue mt-0.5">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="datamatrix-url-toggle" className="text-sm font-bold text-midnight-navy dark:text-white cursor-pointer">
                      Use URL-based DataMatrix Codes
                    </Label>
                    <p className="text-xs text-on-surface-variant dark:text-slate-400">
                      When enabled, scanning the generated DataMatrix barcodes will direct scanners/phones to the product verification URL.
                    </p>
                  </div>
                </div>
                <Switch
                  id="datamatrix-url-toggle"
                  checked={datamatrixUrlMode}
                  onCheckedChange={setUrlMode}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500 mt-0.5">
                    <Database className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="recent-serialization-toggle" className="text-sm font-bold text-midnight-navy dark:text-white cursor-pointer">
                      Hide Recent Product Serialization on Dashboard
                    </Label>
                    <p className="text-xs text-on-surface-variant dark:text-slate-400">
                      When enabled, the "Recent Product Serialization" table will be hidden from the executive dashboard.
                    </p>
                  </div>
                </div>
                <Switch
                  id="recent-serialization-toggle"
                  checked={hideRecentSerialization}
                  onCheckedChange={toggleRecentSerialization}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 mt-0.5">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dev-options-toggle" className="text-sm font-bold text-midnight-navy dark:text-white cursor-pointer">
                      Hide Developer & Demo Options on Login Page
                    </Label>
                    <p className="text-xs text-on-surface-variant dark:text-slate-400">
                      When enabled, the "Device Sim", "Passkey Sign In", "Demo Credentials", and "SMTP Test" options will be hidden from the login screen.
                    </p>
                  </div>
                </div>
                <Switch
                  id="dev-options-toggle"
                  checked={hideDevOptions}
                  onCheckedChange={setDevVisibility}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 mt-0.5">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sso-options-toggle" className="text-sm font-bold text-midnight-navy dark:text-white cursor-pointer">
                      Hide Microsoft & GitHub SSO Options on Login Page
                    </Label>
                    <p className="text-xs text-on-surface-variant dark:text-slate-400">
                      When enabled, the Microsoft and GitHub SSO buttons will be hidden from the login screen.
                    </p>
                  </div>
                </div>
                <Switch
                  id="sso-options-toggle"
                  checked={hideSsoOptions}
                  onCheckedChange={setSsoVisibility}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 mt-0.5">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="otp-system-toggle" className="text-sm font-bold text-midnight-navy dark:text-white cursor-pointer">
                      Enable Login OTP Verification System
                    </Label>
                    <p className="text-xs text-on-surface-variant dark:text-slate-400">
                      When enabled, standard user accounts will be required to verify email OTP during login. When disabled, login bypasses OTP step.
                    </p>
                  </div>
                </div>
                <Switch
                  id="otp-system-toggle"
                  checked={enableOtpSystem}
                  onCheckedChange={toggleOtpSystem}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-teal-500/10 rounded-lg text-teal-500 mt-0.5">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="customer-scan-otp-toggle" className="text-sm font-bold text-midnight-navy dark:text-white cursor-pointer">
                      Enable OTP in Customer Scan Verification
                    </Label>
                    <p className="text-xs text-on-surface-variant dark:text-slate-400">
                      When enabled, customers must send and enter an email OTP code to verify product authenticity. When disabled, OTP step is omitted.
                    </p>
                  </div>
                </div>
                <Switch
                  id="customer-scan-otp-toggle"
                  checked={enableCustomerScanOtp}
                  onCheckedChange={toggleCustomerScanOtp}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 mt-0.5">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirm-alerts-count" className="text-sm font-bold text-midnight-navy dark:text-white cursor-pointer">
                      Number of Edit Confirmation Alerts
                    </Label>
                    <p className="text-xs text-on-surface-variant dark:text-slate-400">
                      Set how many confirmation dialogs a user must confirm when saving edited section changes.
                    </p>
                  </div>
                </div>
                <select
                  id="confirm-alerts-count"
                  value={confirmCount}
                  onChange={(e) => updateConfirmCount(Number(e.target.value))}
                  className="bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 Alert</option>
                  <option value={2}>2 Alerts</option>
                  <option value={3}>3 Alerts</option>
                  <option value={4}>4 Alerts</option>
                  <option value={5}>5 Alerts</option>
                </select>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
