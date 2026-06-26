import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function BrandedPortal() {
  const [, setLocation] = useLocation();
  const [company, setCompany] = useState<{ name: string; id: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serial, setSerial] = useState("");

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const hostname = window.location.hostname;
        const res = await fetch(`/api/companies/public/by-domain?domain=${encodeURIComponent(hostname)}`);
        if (!res.ok) {
          throw new Error("Company not registered for this domain");
        }
        const data = await res.json();
        setCompany(data);
      } catch (err: any) {
        setError(err.message || "Failed to load portal configuration");
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) return;
    setLocation(`/code/${encodeURIComponent(serial.trim())}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium animate-pulse text-slate-400">Loading verification portal...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4 font-sans">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-white">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold">Portal Error</h2>
            <p className="text-sm text-slate-400">
              {error || "This custom domain is not linked to any registered company portal."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-white px-4 py-8 font-sans relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="my-auto w-full max-w-lg mx-auto space-y-8 z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-lg mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{company.name}</h1>
          <p className="text-sm text-slate-400 font-medium">Secure Verification Portal</p>
        </div>

        {/* Input Card */}
        <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-xl shadow-2xl rounded-2xl">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2 text-center sm:text-left">
              <h2 className="text-lg font-bold text-white">Verify Product Authenticity</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter the unique serial number or GS1 secure code printed on your product package to confirm its legitimacy on the blockchain audit log.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="e.g., 20260626_112439_27AABCD1234::EFLQ8JJ87"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  className="w-full bg-slate-950/80 border-slate-800 focus-visible:border-blue-500 focus-visible:ring-0 rounded-xl py-3 px-4 text-sm text-white font-mono placeholder:text-slate-600 transition-all h-12"
                />
              </div>

              <Button
                type="submit"
                disabled={!serial.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold h-12 rounded-xl transition-all shadow-lg hover:shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>Verify Product</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-600 uppercase tracking-widest mt-8 z-10">
        Secured by TracelyTag cryptographic ledger
      </div>
    </div>
  );
}
