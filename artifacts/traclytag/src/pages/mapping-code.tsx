import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { 
  ChevronRight, Search, Filter, Download, Eye, ChevronLeft, QrCode, Maximize2, Loader2,
  Lock, EyeOff, ShieldCheck, Fingerprint, Smartphone, CheckCircle2, AlertCircle, ArrowRight, Printer, Check,
  Camera, Volume2, RefreshCw, Wifi, Keyboard
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const MOCK_MAPPING_DATA = [
  {
    product: "Pharmaceutical A-202",
    batch: "BTCH-2024-001",
    date: "Oct 12, 2023",
    totalQR: "5,000",
    mappedQR: "1,000",
    remainingQR: "4,000",
    efficiency: 20,
    status: "warning",
  },
  {
    product: "Industrial Sealant X1",
    batch: "BTCH-2024-042",
    date: "Oct 14, 2023",
    totalQR: "12,000",
    mappedQR: "11,500",
    remainingQR: "500",
    efficiency: 95,
    status: "success",
  },
  {
    product: "Electronic Chipset v4",
    batch: "BTCH-2024-099",
    date: "Oct 15, 2023",
    totalQR: "25,000",
    mappedQR: "12,500",
    remainingQR: "12,500",
    efficiency: 50,
    status: "warning",
  },
  {
    product: "Organic Supplement 500mg",
    batch: "BTCH-2024-112",
    date: "Oct 18, 2023",
    totalQR: "8,000",
    mappedQR: "8,000",
    remainingQR: "0",
    efficiency: 100,
    status: "success",
  },
  {
    product: "Precision Tooling Set",
    batch: "BTCH-2024-150",
    date: "Oct 20, 2023",
    totalQR: "2,500",
    mappedQR: "500",
    remainingQR: "2,000",
    efficiency: 20,
    status: "warning",
  },
];

export default function MappingCode() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQRBatch, setSelectedQRBatch] = useState<string | null>(null);
  const [downloadingBatch, setDownloadingBatch] = useState<string | null>(null);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<"login" | "batch" | "scan" | "status">("login");
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [operatorId, setOperatorId] = useState("OP-82914");
  const [accessToken, setAccessToken] = useState("password123");
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  // Live Camera and Scanner machine state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inputMode, setInputMode] = useState<"camera" | "scanner_machine">("camera");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scannerInputValue, setScannerInputValue] = useState("");

  // Synthesize a scan beep audio effect using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1200Hz frequency
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); // volume

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 100); // 100ms beep
    } catch (e) {
      console.warn("Audio Context blocked or failed to initialize", e);
    }
  };

  // Enumerate cameras
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === "videoinput");
          setCameras(videoDevices);
          if (videoDevices.length > 0 && !selectedCameraId) {
            setSelectedCameraId(videoDevices[0].deviceId);
          }
        })
        .catch(err => console.error("Error enumerating video inputs", err));
    }
  }, [isWizardOpen]);

  // Handle active video stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    if (isWizardOpen && wizardStep === "scan" && inputMode === "camera") {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true
      };

      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          activeStream = stream;
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn("Could not start device camera stream: ", err);
          setCameraStream(null);
        });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      setCameraStream(null);
    };
  }, [isWizardOpen, wizardStep, inputMode, selectedCameraId]);

  useEffect(() => {
    let timer: any;
    if (isAutoScanning && isWizardOpen && wizardStep === "scan" && scanProgress < 10) {
      timer = setTimeout(() => {
        setIsScanning(true);
        setTimeout(() => {
          setIsScanning(false);
          playBeep();
          setScanProgress(prev => {
            const next = prev + 1;
            if (next >= 10) {
              setIsAutoScanning(false);
              setTimeout(() => {
                setWizardStep("status");
              }, 600);
            }
            return next;
          });
        }, 300);
      }, 850);
    }
    return () => clearTimeout(timer);
  }, [isAutoScanning, isWizardOpen, wizardStep, scanProgress]);

  const handleManualScan = () => {
    if (isScanning || scanProgress >= 10) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      playBeep();
      setScanProgress(prev => {
        const next = prev + 1;
        if (next >= 10) {
          setIsAutoScanning(false);
          setTimeout(() => {
            setWizardStep("status");
          }, 600);
        }
        return next;
      });
    }, 450);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setPrintSuccess(false);
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
    }, 1500);
  };

  const handleDownloadQR = async (batchNumber: string) => {
    setDownloadingBatch(batchNumber);
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        window.location.origin + "/code/" + batchNumber
      )}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qrcode_${batchNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download QR code image", e);
    } finally {
      setDownloadingBatch(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <nav className="flex items-center gap-2 text-outline font-bold text-[10px] mb-2 uppercase tracking-widest">
            <span>Industrial Panel</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-safety-blue">Mapping Code</span>
          </nav>
          <h2 className="text-3xl font-bold text-midnight-navy tracking-tight">Mapping Code Module</h2>
          <p className="text-sm text-on-surface-variant mt-1">Manage and audit QR code mapping across production batches.</p>
        </div>
      </div>

      {/* Filter Container */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex-1 min-w-[240px]">
          <label className="font-bold text-[10px] text-[#737686] mb-1 block uppercase">Search Products/Batches</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737686] h-4 w-4" />
            <Input
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg py-2 pl-10 pr-4 text-sm focus:border-safety-blue outline-none transition-all h-10"
              placeholder="Filter by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="font-bold text-[10px] text-[#737686] mb-1 block uppercase">Product Name</label>
          <select className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg py-2 px-3 text-sm focus:border-safety-blue outline-none transition-all h-10">
            <option>All Products</option>
            <option>Pharmaceutical A-202</option>
            <option>Industrial Sealant X1</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="font-bold text-[10px] text-[#737686] mb-1 block uppercase">Batch Name</label>
          <select className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg py-2 px-3 text-sm focus:border-safety-blue outline-none transition-all h-10">
            <option>All Batches</option>
            <option>BTCH-2024-001</option>
            <option>BTCH-2024-042</option>
          </select>
        </div>
        <div className="flex items-end h-full mt-5">
          <Button variant="outline" className="h-10 px-3 border border-[#E2E8F0] rounded-lg hover:bg-slate-50">
            <Filter className="h-4 w-4 text-[#434655]" />
          </Button>
        </div>
        <div className="flex items-end h-full ml-auto mt-5">
          <Button variant="outline" className="flex items-center gap-2 h-10 px-4 border border-[#E2E8F0] rounded-lg font-bold text-midnight-navy hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export XLSX
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                <th className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap">Product Name</th>
                <th className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap">Batch Name</th>
                <th className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap">Generate Date</th>
                <th className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap text-right">Total QR</th>
                <th className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap text-right">Mapped QR</th>
                <th className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap text-right">Remaining QR</th>
                <th className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap text-center">Efficiency</th>
                <th className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                <th className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap text-center">QR Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {MOCK_MAPPING_DATA.map((row) => (
                <tr key={row.batch} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-midnight-navy">{row.product}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.batch}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.date}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{row.totalQR}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{row.mappedQR}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{row.remainingQR}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {row.efficiency}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-slate-600 hover:text-safety-blue hover:border-safety-blue transition-colors"
                        onClick={() => {
                          setSelectedRow(row);
                          setWizardStep("login");
                          setScanProgress(0);
                          setIsWizardOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-slate-600 hover:text-safety-blue hover:border-safety-blue transition-colors"
                        onClick={() => setSelectedQRBatch(row.batch)}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-slate-600 hover:text-safety-blue hover:border-safety-blue transition-colors"
                        onClick={() => handleDownloadQR(row.batch)}
                      >
                        {downloadingBatch === row.batch ? (
                          <Loader2 className="h-4 w-4 animate-spin text-safety-blue" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
          <span className="text-sm text-[#434655]">Showing <span className="font-semibold text-midnight-navy">1 to 5</span> of <span className="font-semibold text-midnight-navy">124</span> batches</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 disabled:opacity-30" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Button className="w-8 h-8 p-0 bg-safety-blue hover:bg-safety-blue/90 text-white font-bold text-sm">1</Button>
              <Button variant="ghost" className="w-8 h-8 p-0 text-sm font-bold border border-transparent hover:border-[#E2E8F0]">2</Button>
              <Button variant="ghost" className="w-8 h-8 p-0 text-sm font-bold border border-transparent hover:border-[#E2E8F0]">3</Button>
              <span className="px-2 text-sm">...</span>
              <Button variant="ghost" className="w-8 h-8 p-0 text-sm font-bold border border-transparent hover:border-[#E2E8F0]">21</Button>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog for Zooming / Scanning QR Code */}
      <Dialog open={selectedQRBatch !== null} onOpenChange={(open) => !open && setSelectedQRBatch(null)}>
        <DialogContent className="sm:max-w-[420px] bg-white border border-[#E2E8F0] text-midnight-navy font-sans p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-safety-blue/10 border border-safety-blue/20 flex items-center justify-center text-safety-blue shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">Scan QR Code</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Scan this code using any smartphone camera to dynamically verify authenticity and view product details online.
            </DialogDescription>
          </DialogHeader>

          {selectedQRBatch && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="border border-slate-200 p-4 rounded-2xl bg-white shadow-md relative overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    window.location.origin + "/code/" + selectedQRBatch
                  )}`}
                  alt={`QR Code for batch ${selectedQRBatch}`}
                  className="w-48 h-48 object-contain"
                />
              </div>
              <div className="text-center mt-4">
                <p className="text-xs text-slate-400 font-mono">Batch Identification</p>
                <p className="text-sm font-bold text-midnight-navy font-mono">{selectedQRBatch}</p>
              </div>
              
              <div className="w-full flex gap-3 mt-6">
                <Button
                  className="flex-1 bg-safety-blue hover:bg-safety-blue/90 text-white font-bold h-11 rounded-xl text-sm transition-all"
                  onClick={() => handleDownloadQR(selectedQRBatch)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedQRBatch(null)}
                  className="flex-1 h-11 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-sm"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog for Mapping Process Wizard */}
      <Dialog open={isWizardOpen} onOpenChange={(open) => {
        if (!open) {
          setIsWizardOpen(false);
          setIsAutoScanning(false);
        }
      }}>
        <DialogContent className="sm:max-w-[480px] bg-slate-900 border border-slate-800 text-slate-100 font-sans p-6 rounded-2xl shadow-2xl overflow-hidden">
          {/* Step 1: Login Form */}
          {wizardStep === "login" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5 mx-auto mb-2">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white">Operator Authorization</h3>
                <p className="text-slate-400 text-sm">Verify identity to initialize code mapping context</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operator ID</label>
                  <div className="relative">
                    <Input
                      className="bg-slate-855 border-slate-700 bg-slate-800/80 border text-white rounded-xl placeholder-slate-500 h-11 focus:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500"
                      placeholder="e.g. OP-82914"
                      value={operatorId}
                      onChange={(e) => setOperatorId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Token</label>
                  <div className="relative">
                    <Input
                      type={showAccessToken ? "text" : "password"}
                      className="bg-slate-855 border-slate-700 bg-slate-800/80 border text-white rounded-xl placeholder-slate-500 h-11 focus:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500 pr-10"
                      placeholder="Enter access token"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                    >
                      {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Biometrics */}
              <div className="bg-slate-800/30 border border-slate-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Secure Biometrics Quick Sign-In</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="border-slate-750 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white text-slate-300 rounded-xl h-11 flex items-center justify-center gap-2 text-xs"
                    onClick={() => {
                      setOperatorId("OP-BIO-99");
                      setAccessToken("biometric-authorized");
                      setWizardStep("batch");
                    }}
                  >
                    <Fingerprint className="h-4 w-4 text-amber-500" />
                    Touch ID
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-750 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white text-slate-300 rounded-xl h-11 flex items-center justify-center gap-2 text-xs"
                    onClick={() => {
                      setOperatorId("OP-FACE-88");
                      setAccessToken("biometric-authorized");
                      setWizardStep("batch");
                    }}
                  >
                    <Smartphone className="h-4 w-4 text-amber-500" />
                    Face ID
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-700 hover:bg-slate-805 bg-slate-800/20 text-slate-400 hover:text-white rounded-xl h-11"
                  onClick={() => setIsWizardOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl h-11 flex items-center justify-center gap-2"
                  onClick={() => setWizardStep("batch")}
                >
                  <span>Authorize Access</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Batch Config */}
          {wizardStep === "batch" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/5 mx-auto mb-2">
                  <Smartphone className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white">Configure Shipper Context</h3>
                <p className="text-slate-400 text-sm">Establish product scope and scan parameters</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product</label>
                    <div className="bg-slate-800/80 border border-slate-750 border-slate-700 text-slate-350 text-slate-300 rounded-xl px-3 py-2 text-xs font-semibold leading-normal truncate h-11 flex items-center">
                      {selectedRow?.product || "Pharmaceutical A-202"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch Number</label>
                    <div className="bg-slate-800/80 border border-slate-750 border-slate-700 text-slate-350 text-slate-300 rounded-xl px-3 py-2 text-xs font-mono leading-normal h-11 flex items-center">
                      {selectedRow?.batch || "BTCH-2024-001"}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shipper Unit Configuration</label>
                  <select className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-3 h-11 text-sm focus:border-blue-500 outline-none">
                    <option value="1">1 Shipper Box (10 QRs)</option>
                    <option value="5">5 Shippers (50 QRs total)</option>
                    <option value="10">10 Shippers (100 QRs total)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">QR Code Capacity per Shipper</label>
                  <div className="bg-slate-800/80 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-sm leading-normal h-11 flex items-center justify-between">
                    <span>10 QR codes / unit</span>
                    <span className="text-[10px] bg-slate-750 bg-slate-700 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">Standard</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-700 hover:bg-slate-805 bg-slate-800/20 text-slate-400 hover:text-white rounded-xl h-11"
                  onClick={() => setWizardStep("login")}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 flex items-center justify-center gap-2"
                  onClick={() => {
                    setScanProgress(0);
                    setWizardStep("scan");
                  }}
                >
                  <span>Start Mapping Device</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Scan */}
          {wizardStep === "scan" && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white">Mapping Terminal</h3>
                  <p className="text-slate-400 text-xs truncate max-w-[280px]">
                    {selectedRow?.product || "Pharmaceutical A-202"} ({selectedRow?.batch})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold uppercase tracking-wider">
                    Scanner Online
                  </span>
                </div>
              </div>

              {/* Mode Selection Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-805 border-slate-800">
                <button
                  type="button"
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${inputMode === "camera" ? "bg-slate-800 text-white border border-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  onClick={() => setInputMode("camera")}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Device Camera
                </button>
                <button
                  type="button"
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${inputMode === "scanner_machine" ? "bg-slate-800 text-white border border-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  onClick={() => setInputMode("scanner_machine")}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  Scanner Machine
                </button>
              </div>

              {/* Camera selection */}
              {inputMode === "camera" && cameras.length > 1 && (
                <div className="flex items-center gap-2 text-xs bg-slate-800/40 border border-slate-800 px-3 py-2 rounded-xl">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-400 text-[11px] font-medium mr-1">Active Camera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="bg-transparent text-white border-none outline-none cursor-pointer text-xs flex-1 font-semibold"
                  >
                    {cameras.map((camera, i) => (
                      <option key={camera.deviceId} value={camera.deviceId} className="bg-slate-900 text-slate-100">
                        {camera.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Progress Counters */}
              <div className="grid grid-cols-2 gap-4 bg-slate-800/40 border border-slate-800 rounded-xl p-3 text-center">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Active Shipper</p>
                  <p className="text-xl font-bold text-white mt-1">SHPR-001</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Mapped Codes</p>
                  <p className="text-xl font-bold text-white mt-1">{scanProgress} <span className="text-xs text-slate-500">/ 10</span></p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Capacity Filled</span>
                  <span>{scanProgress * 10}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full" 
                    style={{ width: `${scanProgress * 10}%` }}
                  />
                </div>
              </div>

              {/* Scanning Viewport / Scanner Area */}
              {inputMode === "camera" ? (
                <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden aspect-[4/3] flex flex-col items-center justify-center relative shadow-inner group">
                  {/* Real video feed or simulated fallback */}
                  {cameraStream ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-500 select-none">
                      <QrCode className="w-16 h-16 opacity-35" />
                      <p className="text-[10px] font-mono tracking-widest uppercase opacity-70">Simulated Viewfinder Active</p>
                    </div>
                  )}

                  {/* Viewfinder crosshairs */}
                  <div className="border-t-2 border-l-2 border-emerald-500 w-6 h-6 absolute top-4 left-4 z-10" />
                  <div className="border-t-2 border-r-2 border-emerald-500 w-6 h-6 absolute top-4 right-4 z-10" />
                  <div className="border-b-2 border-l-2 border-emerald-500 w-6 h-6 absolute bottom-4 left-4 z-10" />
                  <div className="border-b-2 border-r-2 border-emerald-500 w-6 h-6 absolute bottom-4 right-4 z-10" />

                  {/* Laser scan animation line */}
                  <div className="absolute left-0 w-full h-[2px] bg-emerald-500 shadow-[0_0_10px_#10B981] top-1/2 -translate-y-1/2 z-10" />

                  {isScanning && (
                    <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3 z-20">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                      <p className="text-xs text-emerald-400 font-mono tracking-widest uppercase">Decoding QR Code...</p>
                    </div>
                  )}

                  {/* Scanned Success Flash Overlay */}
                  {scanProgress > 0 && !isScanning && (
                    <div className="absolute bottom-4 bg-emerald-500/80 border border-emerald-500/40 px-3 py-1.5 rounded-full text-emerald-400 text-[10px] font-mono flex items-center gap-1.5 backdrop-blur-sm z-10 animate-pulse">
                      <Check className="w-3 h-3" />
                      <span>Last Scan: Verified ({scanProgress}/10)</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Scanner Machine Input Mode */
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col items-center justify-center relative min-h-[220px]">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-md">
                    <Wifi className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-semibold text-white">Hardware Scan Engine</h4>
                    <p className="text-xs text-slate-400 max-w-[300px] mx-auto">
                      Plug in your USB/Wireless scanner gun. Focus the input below, then pull the trigger on a QR barcode to map it instantly.
                    </p>
                  </div>

                  <div className="w-full space-y-2">
                    <div className="relative">
                      <Input
                        autoFocus
                        className="bg-slate-800/80 border border-slate-700 text-white rounded-xl placeholder-slate-500 h-11 focus:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500 text-center font-mono text-xs tracking-wider"
                        placeholder="👉 Click here to focus & pull scanner trigger 👈"
                        value={scannerInputValue}
                        onChange={(e) => setScannerInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && scannerInputValue.trim()) {
                            e.preventDefault();
                            handleManualScan();
                            setScannerInputValue("");
                          }
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 text-center italic">
                      Hardware scanner will auto-send code parameters followed by 'Enter' command
                    </p>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className={`flex-1 border-slate-700 bg-slate-800/20 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl h-11 flex items-center justify-center gap-2 ${isAutoScanning ? "border-emerald-500 text-emerald-400" : ""}`}
                  onClick={() => setIsAutoScanning(!isAutoScanning)}
                >
                  {isAutoScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                      <span>Stop Auto-Scan</span>
                    </>
                  ) : (
                    <span>Auto-Scan (Demo)</span>
                  )}
                </Button>
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl h-11 flex items-center justify-center gap-2"
                  onClick={handleManualScan}
                  disabled={isScanning || isAutoScanning || scanProgress >= 10}
                >
                  <Maximize2 className="h-4 w-4" />
                  <span>Manual Scan</span>
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Status */}
          {wizardStep === "status" && (
            <div className="space-y-6 text-center py-4">
              <div className="relative w-20 h-20 mx-auto">
                {/* Glowing ring animation */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-white">Batch Mapping Finalized</h3>
                <p className="text-slate-400 text-sm">All unit-level codes successfully registered & signed</p>
              </div>

              {/* Mapping Details Receipt Card */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-left space-y-3 font-mono text-xs">
                <div className="border-b border-slate-800 pb-2 flex justify-between text-slate-500">
                  <span>METADATA FIELD</span>
                  <span>RECORD VALUE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PRODUCT ID</span>
                  <span className="text-white font-medium truncate max-w-[200px]">{selectedRow?.product || "Pharmaceutical A-202"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">BATCH CODE</span>
                  <span className="text-white font-medium">{selectedRow?.batch || "BTCH-2024-001"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SHIPPERS</span>
                  <span className="text-white font-medium">1 / 1 Completed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">QR ASSOCIATED</span>
                  <span className="text-white font-medium">10 / 10 Associated</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">OPERATOR ID</span>
                  <span className="text-white font-medium">{operatorId}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-slate-500">
                  <span>TIMESTAMP</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-700 bg-slate-805 bg-slate-800/20 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl h-11 flex items-center justify-center gap-2"
                  onClick={handlePrint}
                  disabled={isPrinting}
                >
                  {isPrinting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : printSuccess ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  <span>{isPrinting ? "Printing..." : printSuccess ? "Printed!" : "Print Receipt"}</span>
                </Button>
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl h-11"
                  onClick={() => {
                    setIsWizardOpen(false);
                  }}
                >
                  Return to Console
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
