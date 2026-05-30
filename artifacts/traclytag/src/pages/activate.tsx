import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Monitor, CheckCircle2, ShieldAlert, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";

export default function Activate() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading } = useGetCurrentUser();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValidCode, setIsValidCode] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<"pending" | "approved" | "denied" | "expired" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Parse redirect if user is not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      sessionStorage.setItem("auth_redirect", "/activate");
      toast.info("Please log in to authorize your device.");
      setLocation("/login");
    }
  }, [user, isUserLoading, setLocation]);

  const formatCode = (value: string) => {
    // Keep only alphanumeric uppercase
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleaned.length <= 4) {
      return cleaned;
    } else {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
  };

  const verifyCode = async () => {
    const cleanCode = code.replace("-", "");
    if (cleanCode.length !== 8) {
      toast.error("Please enter a valid 8-character activation code.");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch(`/api/auth/device/verify-code?user_code=${code}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify activation code.");
      }

      setDeviceStatus(data.status);
      setIsValidCode(true);
      toast.success("Code verified successfully!");
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired device code.");
      setIsValidCode(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAuthorization = async (approve: boolean) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/device/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_code: code, approve }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to authorize device.");
      }

      if (approve) {
        setSuccess(true);
        toast.success("Device authorized successfully!");
      } else {
        toast.info("Device request denied.");
        setLocation("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to authorize device.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <AnimatePresence mode="wait">
        {!isValidCode ? (
          <motion.div
            key="input-code"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <Card className="border border-border/80 shadow-2xl backdrop-blur-sm bg-card/90">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-full mb-2">
                  <KeyRound className="h-6 w-6 text-indigo-600 animate-pulse" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">Activate Device</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Enter the 8-character code shown on your device to log in or link it.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block text-center">
                    User Activation Code
                  </label>
                  <Input
                    type="text"
                    placeholder="ABCD-EFGH"
                    value={code}
                    onChange={handleInputChange}
                    maxLength={9}
                    className="h-14 text-center text-2xl font-mono tracking-widest uppercase border-gray-300 dark:border-gray-700/80 rounded-2xl focus-visible:ring-indigo-500"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  onClick={verifyCode}
                  disabled={isVerifying || code.replace("-", "").length !== 8}
                  className="w-full h-12 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Code...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setLocation("/dashboard")}
                  className="w-full h-10 rounded-full text-xs text-muted-foreground hover:bg-muted"
                >
                  Back to Dashboard
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ) : success ? (
          <motion.div
            key="success-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="border border-green-500/30 shadow-2xl bg-card/95 text-center">
              <CardContent className="pt-8 pb-6 space-y-4">
                <div className="mx-auto inline-flex items-center justify-center p-3 bg-green-500/10 rounded-full">
                  <CheckCircle2 className="h-10 w-10 text-green-500 animate-bounce" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Success!</h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Your device has been authorized successfully and logged into your account.
                </p>
                <div className="pt-2 text-[11px] text-muted-foreground bg-muted p-2.5 rounded-xl border font-mono">
                  Authorized User: {user.username}
                </div>
              </CardContent>
              <CardFooter className="flex justify-center pb-6">
                <Button
                  onClick={() => setLocation("/dashboard")}
                  className="rounded-full px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  Go to Dashboard
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="approval-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="border border-indigo-500/30 shadow-2xl bg-card/95">
              <CardHeader className="text-center">
                <div className="mx-auto inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-full mb-2">
                  <Monitor className="h-7 w-7 text-indigo-600" />
                </div>
                <CardTitle className="text-xl font-bold">Approve Device Authorization?</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  A device is requesting access to your TraclyTag account.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2.5 bg-muted/60 p-4 rounded-2xl border text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested By:</span>
                    <span className="font-semibold text-foreground">Smart Terminal Simulator</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User Code:</span>
                    <span className="font-mono font-bold text-indigo-600">{code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Account:</span>
                    <span className="font-semibold text-foreground">{user.username} ({user.email})</span>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start text-xs text-amber-600 dark:text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <p>
                    Only approve this if you see the exact same code on the device screen. Approving gives the device full operational permissions.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="grid grid-cols-2 gap-3 pb-6">
                <Button
                  variant="outline"
                  onClick={() => handleAuthorization(false)}
                  disabled={isSubmitting}
                  className="rounded-full h-11 hover:bg-muted font-medium border-gray-300 dark:border-gray-700"
                >
                  Deny Request
                </Button>
                <Button
                  onClick={() => handleAuthorization(true)}
                  disabled={isSubmitting}
                  className="rounded-full h-11 text-white bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold shadow-md shadow-indigo-600/15"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving...
                    </>
                  ) : (
                    "Approve Access"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
