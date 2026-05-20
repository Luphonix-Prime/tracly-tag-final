import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ShieldCheck, Loader2, AlertCircle, Calendar, Landmark, Package, MapPin, QrCode } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface VerificationDetails {
  id: number;
  productId: number;
  productName: string;
  batchId: number | null;
  batchNumber: string | null;
  level: string;
  rawString: string;
  serialNumber: string | null;
  ssccCode: string | null;
  mapped: boolean;
  mappedAt: string | null;
  mappedByUserId: number | null;
  mappedByUsername: string | null;
  locationId: number | null;
  locationName: string | null;
  createdAt: string;
  mfgDate: string | null;
  expiryDate: string | null;
  marketedBy: string | null;
  registrationNo: string | null;
  companyName: string | null;
  companyAddress: string | null;
}

export default function PublicVerify() {
  const { serial } = useParams<{ serial: string }>();
  const [, setLocation] = useLocation();
  
  const [data, setData] = useState<VerificationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serial) {
      setError("No serial number provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/codes/public/${encodeURIComponent(serial)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Invalid certificate or serial number not found.");
          }
          throw new Error("Unable to complete authenticity check at this time.");
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "An unexpected error occurred.");
        setLoading(false);
      });
  }, [serial]);

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4 md:py-12 overflow-x-hidden">
      {/* Decorative premium background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6 z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Brand header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium tracking-wide">
            <QrCode className="h-3.5 w-3.5" />
            <span>TraclyTag GS1 Cloud Authenticator</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1.5">Genuine Product Verification</h1>
        </div>

        {loading ? (
          <Card className="border-border/60 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse font-medium">
                Querying verification logs from secure ledger...
              </p>
            </CardContent>
          </Card>
        ) : error || !data ? (
          <Card className="border-destructive/30 shadow-xl overflow-hidden bg-card/65 backdrop-blur-md">
            <div className="h-2 bg-destructive animate-pulse" />
            <CardHeader className="text-center pt-8 pb-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
                <AlertCircle className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold text-destructive">Verification Failed</CardTitle>
              <CardDescription className="px-2 mt-1">
                Authenticity check could not be completed successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center pb-8">
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm max-w-sm mx-auto">
                <p className="font-semibold text-destructive mb-1">Warning</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {error || "This unique serial number is unregistered, invalid, or has not been activated. Please proceed with extreme caution as this product may be counterfeit."}
                </p>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                Serial Token ID: <span className="font-semibold text-foreground">{serial}</span>
              </div>
              <div className="pt-4 flex gap-3 justify-center">
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="h-9 px-4">
                  Retry Scan
                </Button>
                <Button size="sm" onClick={() => setLocation("/login")} className="h-9 px-4">
                  Admin Sign In
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-4 justify-center text-[10px] text-muted-foreground">
              Securely monitored by TraclyTag Blockchain Ledger
            </CardFooter>
          </Card>
        ) : (
          <Card className="border-green-500/30 shadow-2xl overflow-hidden bg-card/75 backdrop-blur-md">
            {/* Glowing active header bar */}
            <div className="h-2 bg-green-500" />
            
            <CardHeader className="text-center pt-6 pb-4 border-b">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600 mb-2 border border-green-500/20 shadow-inner">
                <ShieldCheck className="h-7 w-7 animate-pulse" />
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border-green-500/30 font-bold px-3 py-1 text-xs uppercase tracking-wide">
                Genuine Product
              </Badge>
              <CardTitle className="text-xl font-bold mt-2">Authenticity Verified</CardTitle>
              <CardDescription className="text-xs">
                This item has been successfully verified via TraclyTag GS1 Registry.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Product Specifications Section */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span>Product Specifications</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border bg-muted/20 text-sm">
                  <div className="col-span-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Product Name</span>
                    <span className="font-bold text-foreground text-base leading-snug">{data.productName}</span>
                  </div>
                  <div className="col-span-2 border-t pt-2.5 mt-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Brand Owner (Marketed By)</span>
                    <span className="font-semibold text-primary">{data.marketedBy || "N/A"}</span>
                  </div>
                  <div className="col-span-2 border-t pt-2.5 mt-1 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Unique Serial ID</span>
                      <span className="font-mono font-bold text-green-600 dark:text-green-400 break-all">{data.serialNumber || data.ssccCode || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Mfg License No</span>
                      <span className="font-mono text-xs font-semibold">{data.registrationNo || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch & Timeline Section */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Batch & Timeline Details</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border bg-muted/20 text-sm">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Batch Code</span>
                    <span className="font-mono font-bold text-primary">{data.batchNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Packaging Level</span>
                    <span className="uppercase font-mono text-xs font-semibold block bg-background py-0.5 px-2 rounded border border-border w-max">
                      {data.level}
                    </span>
                  </div>
                  <div className="col-span-2 border-t pt-2.5 mt-1 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Manufacturing Date</span>
                      <span className="font-semibold text-foreground">
                        {data.mfgDate ? format(new Date(data.mfgDate), "MMMM d, yyyy") : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Expiration Date</span>
                      <span className="font-semibold text-destructive">
                        {data.expiryDate ? format(new Date(data.expiryDate), "MMMM d, yyyy") : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manufacturer Section */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-primary" />
                  <span>Corporate Origin & Safety</span>
                </h3>
                <div className="p-4 rounded-xl border bg-muted/20 text-sm space-y-2.5">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Registered Producer</span>
                    <span className="font-bold text-foreground">{data.companyName || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Headquarters Address</span>
                    <span className="text-xs text-muted-foreground leading-relaxed block">{data.companyAddress || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Location Verification (If mapped) */}
              {data.mapped && data.locationName && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                    <span>Last Tracked Location</span>
                  </h3>
                  <div className="p-3.5 rounded-xl border border-green-500/20 bg-green-500/5 text-sm flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-green-700 dark:text-green-400 block">{data.locationName}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Tracked at {data.mappedAt ? format(new Date(data.mappedAt), "MMM d, yyyy h:mm a") : "N/A"}
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 font-mono text-[10px]">
                      VERIFIED SCAN
                    </Badge>
                  </div>
                </div>
              )}

            </CardContent>

            <CardFooter className="bg-muted/40 border-t py-4 justify-between items-center text-[10px] text-muted-foreground px-6">
              <span>Secure GS1 Datablocks Registry</span>
              <span>Ref ID: TZ-{data.id}</span>
            </CardFooter>
          </Card>
        )}

        {/* Small footer brand */}
        <p className="text-center text-[11px] text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">TraclyTag Authenticator®</span>. All rights reserved.
        </p>

      </div>
    </div>
  );
}
