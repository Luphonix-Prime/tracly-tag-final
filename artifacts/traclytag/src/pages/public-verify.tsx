import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ShieldCheck, Loader2, AlertCircle, Landmark, QrCode } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  productLogoUrl: string | null;
  sapDescription: string | null;
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      // Formats as Oct-2025, Sep-2027 etc. to match the user's screenshot
      return format(new Date(dateStr), "MMM-yyyy");
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-start justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white min-h-screen sm:min-h-0 sm:my-4 sm:rounded-xl shadow-md border-0 sm:border overflow-hidden">
        
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4 px-6">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            <p className="text-sm text-neutral-500 font-medium animate-pulse">
              Verifying authentic package details...
            </p>
          </div>
        )}

        {/* Error / Failed State */}
        {!loading && (error || !data) && (
          <div className="p-6 space-y-6">
            {/* Header Brand */}
            <div className="text-center py-2 border-b border-neutral-100">
              <div className="flex items-center justify-center gap-1.5 text-neutral-800">
                <QrCode className="h-5 w-5 text-neutral-600" />
                <span className="font-bold text-xs tracking-wider uppercase">TraclyTag Verification</span>
              </div>
            </div>

            {/* Error Card */}
            <Card className="border-red-200 bg-red-50/50 shadow-sm overflow-hidden">
              <div className="h-1.5 bg-red-500" />
              <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 border border-red-200 shadow-inner">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-red-800">Verification Failed</h3>
                <p className="text-xs text-neutral-500 text-center leading-relaxed max-w-xs px-2">
                  {error || "This unique serial number is unregistered, invalid, or has not been activated. Please proceed with caution as this product may be counterfeit."}
                </p>
                <div className="text-[10px] text-neutral-400 font-mono bg-white px-3 py-1 rounded border border-neutral-200">
                  Serial ID: <span className="font-bold text-neutral-700">{serial}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 text-xs h-10" onClick={() => window.location.reload()}>
                Scan Again
              </Button>
              <Button className="flex-1 text-xs h-10 bg-neutral-900 hover:bg-neutral-800 text-white" onClick={() => setLocation("/login")}>
                Admin Sign In
              </Button>
            </div>

            {/* Footer */}
            <p className="text-center text-[10px] text-neutral-400 font-medium pt-8">
              Powered by TraclyTag Authenticator®
            </p>
          </div>
        )}

        {/* Success State - Styled EXACTLY like the Sun Pharma validation screenshot */}
        {!loading && !error && data && (
          <div className="p-4 space-y-5">
            
            {/* Header Brand Logo */}
            <div className="text-center py-2 border-b border-neutral-200">
              {data.productLogoUrl ? (
                <img 
                  src={data.productLogoUrl} 
                  className="h-10 object-contain mx-auto max-w-[200px]" 
                  alt="Company Logo" 
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-1">
                  <Landmark className="h-6 w-6 text-amber-500 mb-1" />
                  <span className="font-extrabold text-neutral-800 text-xs tracking-widest uppercase">
                    {data.companyName || "REGISTERED PRODUCER"}
                  </span>
                </div>
              )}
            </div>

            {/* Light Green Authenticity Banner */}
            <div className="border border-green-200 bg-green-50/70 rounded-md py-2.5 px-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-green-700 font-semibold text-xs sm:text-sm">
                <ShieldCheck className="h-4.5 w-4.5 text-green-600 flex-shrink-0" />
                <span>This is a Genuine Pack</span>
              </div>
            </div>

            {/* Uppercase Product Name Title */}
            <div className="border-b pb-2">
              <h2 className="text-neutral-800 font-extrabold text-sm sm:text-base leading-tight tracking-normal">
                {data.productName.toUpperCase()}
              </h2>
            </div>

            {/* Product Verification Specifications Table */}
            <div className="space-y-3.5 text-xs text-neutral-700">
              
              <div className="grid grid-cols-12 gap-x-2 items-start py-0.5">
                <span className="col-span-5 font-semibold text-neutral-600">Serial Number</span>
                <span className="col-span-1 text-center text-neutral-400">:</span>
                <span className="col-span-6 font-mono font-bold text-neutral-900 break-all select-all">
                  {data.serialNumber || data.ssccCode || "N/A"}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-x-2 items-start py-0.5">
                <span className="col-span-5 font-semibold text-neutral-600">Generic Name</span>
                <span className="col-span-1 text-center text-neutral-400">:</span>
                <span className="col-span-6 font-semibold text-neutral-800">
                  {data.sapDescription || data.productName.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-x-2 items-start py-0.5">
                <span className="col-span-5 font-semibold text-neutral-600">Brand Name</span>
                <span className="col-span-1 text-center text-neutral-400">:</span>
                <span className="col-span-6 font-bold text-neutral-800">
                  {data.productName.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-x-2 items-start py-0.5">
                <span className="col-span-5 font-semibold text-neutral-600">Name and address of the manufacturer</span>
                <span className="col-span-1 text-center text-neutral-400">:</span>
                <span className="col-span-6 font-medium text-neutral-800 leading-relaxed">
                  {data.companyName}<br />
                  <span className="text-[11px] text-neutral-500 leading-normal block mt-0.5">
                    {data.companyAddress || "N/A"}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-12 gap-x-2 items-start py-0.5">
                <span className="col-span-5 font-semibold text-neutral-600">Batch Number</span>
                <span className="col-span-1 text-center text-neutral-400">:</span>
                <span className="col-span-6 font-mono font-bold text-neutral-800 select-all">
                  {data.batchNumber || "N/A"}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-x-2 items-start py-0.5">
                <span className="col-span-5 font-semibold text-neutral-600">Date of Manufacturing</span>
                <span className="col-span-1 text-center text-neutral-400">:</span>
                <span className="col-span-6 font-medium text-neutral-800">
                  {formatDate(data.mfgDate)}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-x-2 items-start py-0.5">
                <span className="col-span-5 font-semibold text-neutral-600">Date of Expiry</span>
                <span className="col-span-1 text-center text-neutral-400">:</span>
                <span className="col-span-6 font-medium text-neutral-800">
                  {formatDate(data.expiryDate)}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-x-2 items-start py-0.5 border-b pb-4">
                <span className="col-span-5 font-semibold text-neutral-600">Manufacturing license number</span>
                <span className="col-span-1 text-center text-neutral-400">:</span>
                <span className="col-span-6 font-mono font-semibold text-neutral-800">
                  {data.registrationNo || "N/A"}
                </span>
              </div>

            </div>

            {/* Small subtle footer branding */}
            <div className="text-center pt-4">
              <p className="text-[10px] text-neutral-400 font-medium">
                Verified dynamically via TraclyTag GS1 Registry.
              </p>
              <p className="text-[9px] text-neutral-300 font-mono mt-0.5">
                Ref: TRACLY-{data.id}
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
