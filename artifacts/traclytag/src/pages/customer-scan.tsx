import { useState, useEffect } from "react";
import { 
  ChevronRight, 
  Search, 
  Calendar, 
  SlidersHorizontal, 
  Eye, 
  AlertTriangle, 
  AlertCircle, 
  Map, 
  List, 
  Globe2, 
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const MOCK_SCAN_DATA = [
  {
    product: "Industrial Resin AX-4",
    batch: "B24-9981",
    batchDate: "12 Jun 2024",
    qr: "...882190",
    customer: "Aravind Sharma",
    city: "Mumbai",
    mobile: "+91 98XXX 00121",
    scanTime: "14:22:10",
    scanDate: "15 Jun 2024",
    count: 1,
    type: "normal"
  },
  {
    product: "Security Seal Type-B",
    batch: "B24-8820",
    batchDate: "05 Jun 2024",
    qr: "...441029",
    customer: "Michael Chang",
    city: "Singapore",
    mobile: "+65 82XX 1192",
    scanTime: "13:05:45",
    scanDate: "15 Jun 2024",
    count: 12,
    type: "anomaly"
  },
  {
    product: "Fiber Coil 500m",
    batch: "B24-9981",
    batchDate: "12 Jun 2024",
    qr: "...001923",
    customer: "Elena Petrova",
    city: "Dubai",
    mobile: "+971 50 XXX 441",
    scanTime: "11:40:02",
    scanDate: "14 Jun 2024",
    count: 1,
    type: "normal"
  },
  {
    product: "Industrial Resin AX-4",
    batch: "B24-9975",
    batchDate: "28 May 2024",
    qr: "...330018",
    customer: "Rajesh Kumar",
    city: "New Delhi",
    mobile: "+91 99XXX 88123",
    scanTime: "09:15:33",
    scanDate: "14 Jun 2024",
    count: 4,
    type: "error"
  }
];

export default function CustomerScan() {
  const [searchTerm, setSearchTerm] = useState("");
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetch("/api/codes/scans")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setScans(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch scans:", err);
        setLoading(false);
      });
  }, []);

  const handleViewScan = (scan: any) => {
    setSelectedScan(scan);
    setSheetOpen(true);
  };

  const getTimelineEvents = (scan: any) => {
    if (scan.events && scan.events.length > 0) {
      return scan.events.map((event: any, index: number) => {
        let label = "FIRST SCAN";
        let status = "success";
        let type = "first";
        
        if (scan.count > 1 && index === 0) {
          label = scan.type === "error" ? "FAILED SCAN" : "REPEATED SCAN";
          status = scan.type === "error" ? "error" : "warning";
          type = scan.type === "error" ? "failed" : "repeated";
        } else if (scan.count > 1 && index > 0 && index < scan.count - 1) {
          label = "REPEATED SCAN";
          status = "warning";
          type = "repeated";
        }
        
        return {
          type,
          label,
          status,
          time: event.time,
          date: event.date,
          customer: event.customer,
          city: event.city,
          mobile: event.mobile
        };
      });
    }

    if (scan.count > 1) {
      return [
        {
          type: scan.type === "error" ? "failed" : "repeated",
          label: scan.type === "error" ? "FAILED SCAN" : "REPEATED SCAN",
          status: scan.type === "error" ? "error" : "warning",
          time: scan.scanTime,
          date: scan.scanDate,
          customer: scan.customer,
          city: scan.city,
          mobile: scan.mobile
        },
        {
          type: "first",
          label: "FIRST SCAN",
          status: "success",
          time: "11:12:00",
          date: "14 Jun 2024",
          customer: scan.customer,
          city: scan.city,
          mobile: scan.mobile
        }
      ];
    }
    return [
      {
        type: "first",
        label: "FIRST SCAN",
        status: "success",
        time: scan.scanTime,
        date: scan.scanDate,
        customer: scan.customer,
        city: scan.city,
        mobile: scan.mobile
      }
    ];
  };

  const filteredScans = scans.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.product?.toLowerCase().includes(term) ||
      row.customer?.toLowerCase().includes(term) ||
      row.city?.toLowerCase().includes(term) ||
      row.mobile?.toLowerCase().includes(term) ||
      row.qr?.toLowerCase().includes(term)
    );
  });


  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex items-center gap-2 text-outline font-bold text-[10px] uppercase tracking-wider mb-2">
        <span>Industrial Panel</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-midnight-navy">Customer Scan Log</span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex flex-wrap items-end gap-4 shadow-sm">
        <div className="flex-1 min-w-[300px]">
          <label className="block font-bold text-[10px] text-[#737686] uppercase mb-1.5 ml-1">Search Database</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737686] h-[18px] w-[18px]" />
            <Input 
              className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-10 pr-4 py-2 text-sm focus:border-safety-blue outline-none h-10" 
              placeholder="Search customer, mobile, or QR suffix..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-56">
          <label className="block font-bold text-[10px] text-[#737686] uppercase mb-1.5 ml-1">Product</label>
          <select className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:border-safety-blue outline-none h-10">
            <option>All Products</option>
            <option>Industrial Resin AX-4</option>
          </select>
        </div>
        <div className="w-48">
          <label className="block font-bold text-[10px] text-[#737686] uppercase mb-1.5 ml-1">Date Range</label>
          <Button variant="outline" className="w-full flex items-center justify-between bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm hover:border-safety-blue hover:bg-slate-50 h-10 font-normal">
            <span>Last 7 Days</span>
            <Calendar className="h-[18px] w-[18px] text-[#434655]" />
          </Button>
        </div>
        <Button variant="outline" className="h-10 px-4 bg-slate-50 text-midnight-navy font-medium rounded-lg border border-[#E2E8F0] hover:bg-[#E1E2ED] transition-colors flex items-center gap-2">
          <SlidersHorizontal className="h-[18px] w-[18px]" />
          More Filters
        </Button>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
            <thead className="bg-white">
              <tr className="border-b border-[#E2E8F0]">
                <th className="w-[18%] px-4 py-3 font-bold text-[10px] text-[#434655] uppercase tracking-wider border-r border-[#E2E8F0]">Product Name</th>
                <th className="w-[12%] px-4 py-3 font-bold text-[10px] text-[#434655] uppercase tracking-wider border-r border-[#E2E8F0]">Batch & Date</th>
                <th className="w-[10%] px-4 py-3 font-bold text-[10px] text-[#434655] uppercase tracking-wider border-r border-[#E2E8F0]">QR (Suffix)</th>
                <th className="w-[12%] px-4 py-3 font-bold text-[10px] text-[#434655] uppercase tracking-wider border-r border-[#E2E8F0]">Customer Name</th>
                <th className="w-[10%] px-4 py-3 font-bold text-[10px] text-[#434655] uppercase tracking-wider border-r border-[#E2E8F0]">City</th>
                <th className="w-[12%] px-4 py-3 font-bold text-[10px] text-[#434655] uppercase tracking-wider border-r border-[#E2E8F0]">Mobile Number</th>
                <th className="w-[14%] px-4 py-3 font-bold text-[10px] text-[#434655] uppercase tracking-wider border-r border-[#E2E8F0]">Scan Time & Date</th>
                <th className="w-[6%] px-4 py-3 font-bold text-[10px] text-[#434655] uppercase tracking-wider text-center border-r border-[#E2E8F0]">Count</th>
                <th className="w-[6%] px-4 py-3 font-bold text-[10px] text-[#434655] uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#2563EB]" />
                  </td>
                </tr>
              ) : filteredScans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#737686] text-sm">
                    No scans found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredScans.map((row, i) => (
                  <tr key={i} className={`
                    transition-colors group cursor-pointer align-middle
                    ${row.type === 'normal' ? 'hover:bg-[#F3F3FE]' : ''}
                    ${row.type === 'anomaly' ? 'bg-[#FFFBEB] hover:bg-[#FFF8E1] border-l-4 border-l-[#F59E0B]' : ''}
                    ${row.type === 'error' ? 'bg-[#EF4444]/5 hover:bg-[#EF4444]/10 border-l-4 border-l-[#EF4444]' : ''}
                  `}>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-sm font-semibold text-midnight-navy">
                      {row.type === 'normal' && row.product}
                      {row.type === 'anomaly' && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-[#F59E0B] fill-current" />
                          {row.product}
                        </div>
                      )}
                      {row.type === 'error' && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-[#EF4444] fill-current" />
                          {row.product}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0]">
                      <div className="text-sm font-medium font-mono">{row.batch}</div>
                      <div className="text-[10px] text-[#737686]">{row.batchDate}</div>
                    </td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] font-mono text-xs text-[#565e74]">{row.qr}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-sm">{row.customer}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-sm">{row.city}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-sm">{row.mobile}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0]">
                      <div className={`text-sm ${row.type === 'error' ? 'text-[#EF4444] font-bold' : row.type === 'anomaly' ? 'text-[#F59E0B] font-bold' : ''}`}>{row.scanTime}</div>
                      <div className={`text-[10px] uppercase font-bold ${row.type === 'error' ? 'text-[#EF4444]/80' : row.type === 'anomaly' ? 'text-[#F59E0B]/80' : 'text-[#737686] font-medium'}`}>{row.scanDate}</div>
                    </td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-center">
                      {row.type === 'normal' ? (
                        <span className="text-sm font-bold">{row.count}</span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${row.type === 'anomaly' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}>
                          {row.count}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleViewScan(row)}
                        className={`h-8 w-8 transition-colors ${
                          row.type === 'normal' ? 'text-safety-blue hover:bg-safety-blue/10' :
                          row.type === 'anomaly' ? 'text-[#F59E0B] hover:bg-[#F59E0B]/10' :
                          'text-[#EF4444] hover:bg-[#EF4444]/10'
                        }`}
                      >
                        <Eye className="h-[18px] w-[18px]" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F3F3FE] flex justify-between items-center">
          <p className="text-sm text-[#737686]">Showing <span className="font-semibold text-midnight-navy">1 - 15</span> of <span className="font-semibold text-midnight-navy">1,248</span> scan events</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="w-8 h-8 border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] disabled:opacity-40" disabled>
              <ChevronLeft className="h-[18px] w-[18px]" />
            </Button>
            <Button className="w-8 h-8 p-0 bg-midnight-navy text-white font-bold text-sm shadow-sm">1</Button>
            <Button variant="outline" className="w-8 h-8 p-0 bg-white border-[#E2E8F0] text-sm hover:bg-[#F8FAFC]">2</Button>
            <Button variant="outline" className="w-8 h-8 p-0 bg-white border-[#E2E8F0] text-sm hover:bg-[#F8FAFC]">3</Button>
            <span className="px-1 text-[#737686]">...</span>
            <Button variant="outline" className="w-8 h-8 p-0 bg-white border-[#E2E8F0] text-sm hover:bg-[#F8FAFC]">84</Button>
            <Button variant="outline" size="icon" className="w-8 h-8 border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]">
              <ChevronRight className="h-[18px] w-[18px]" />
            </Button>
          </div>
        </div>
      </div>

      {/* Geographic Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-bold text-midnight-navy">Geographical Scan Distribution</h4>
            <p className="text-sm text-[#737686]">Real-time heat distribution of customer verification events</p>
          </div>
          <div className="flex bg-[#F3F3FE] rounded p-1 border border-[#E2E8F0]">
            <Button variant="ghost" className="h-7 px-4 bg-white text-midnight-navy font-bold text-[10px] rounded shadow-sm uppercase">Map View</Button>
            <Button variant="ghost" className="h-7 px-4 text-[#737686] font-bold text-[10px] rounded uppercase hover:text-midnight-navy">List View</Button>
          </div>
        </div>
        
        {/* Map Mockup Area */}
        <div className="h-[400px] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-10 flex items-center justify-center" style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>
          <div className="absolute inset-0 opacity-40 flex items-center justify-center grayscale">
            <Globe2 className="h-[300px] w-[300px] text-[#cbd5e1] font-thin" strokeWidth={0.5} />
          </div>
          
          {/* Data Points */}
          <div className="absolute top-[40%] left-[65%] group">
            <div className="w-4 h-4 bg-safety-blue/40 rounded-full animate-ping absolute -inset-0"></div>
            <div className="w-4 h-4 bg-safety-blue rounded-full shadow-lg relative cursor-help"></div>
          </div>
          <div className="absolute top-[35%] left-[25%] group">
            <div className="w-3 h-3 bg-[#EF4444]/40 rounded-full animate-ping absolute -inset-0"></div>
            <div className="w-3 h-3 bg-[#EF4444] rounded-full shadow-lg relative cursor-help"></div>
          </div>
          
          <div className="text-center z-10 bg-white/90 backdrop-blur-md px-8 py-5 rounded-xl border border-[#E2E8F0] shadow-xl">
            <Map className="h-10 w-10 text-safety-blue mb-3 mx-auto" />
            <p className="text-sm font-bold text-midnight-navy uppercase tracking-widest">Encrypted Telemetry Active</p>
            <p className="text-[11px] text-[#737686] mt-1 italic">Rendering global verification nodes...</p>
          </div>
        </div>
      </div>

      {/* Scan Detail History Sidebar Drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-[420px] p-0 flex flex-col h-full bg-[#F8FAFC] border-l border-[#E2E8F0] gap-0 [&>button]:text-white [&>button]:right-6 [&>button]:top-6 [&>button]:z-10"
        >
          {/* Sidebar Header */}
          <div className="bg-[#0F172A] p-6 text-white relative shrink-0">
            <h3 className="text-lg font-bold tracking-tight">Scan Detail History</h3>
            <p className="text-xs text-slate-400 font-mono mt-1">
              QR UNIQUE ID: <span className="text-white font-bold">{selectedScan?.qr}</span>
            </p>
          </div>

          {/* Sidebar Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title + Total count */}
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">
                Verification Timeline
              </h4>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-midnight-navy">
                Total Scans: {selectedScan?.count}
              </span>
            </div>

            {/* Timeline wrapper */}
            <div className="relative border-l-2 border-slate-200 pl-6 ml-3 space-y-6">
              {/* Dynamic Scan Events */}
              {selectedScan && getTimelineEvents(selectedScan).map((event, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline icon */}
                  <div className="absolute -left-[35px] top-1 bg-[#F8FAFC] p-1 rounded-full">
                    {event.status === "warning" && (
                      <div className="w-6 h-6 rounded-full bg-[#FFFBEB] border border-[#F59E0B] flex items-center justify-center text-[#F59E0B]">
                        <AlertTriangle className="h-3.5 w-3.5 fill-current" />
                      </div>
                    )}
                    {event.status === "error" && (
                      <div className="w-6 h-6 rounded-full bg-[#EF4444]/10 border border-[#EF4444] flex items-center justify-center text-[#EF4444]">
                        <AlertCircle className="h-3.5 w-3.5 fill-current" />
                      </div>
                    )}
                    {event.status === "success" && (
                      <div className="w-6 h-6 rounded-full bg-[#10B981]/10 border border-[#10B981] flex items-center justify-center text-[#10B981]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Card details */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        event.type === 'repeated' ? 'bg-[#FFFBEB] text-[#F59E0B] border border-[#F59E0B]/20' :
                        event.type === 'failed' ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20' :
                        'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                      }`}>
                        {event.label}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-bold text-midnight-navy font-mono">{event.time}</div>
                        <div className="text-[10px] text-[#737686] font-medium">{event.date}</div>
                      </div>
                    </div>

                    {/* Card Fields */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <span className="block text-[9px] font-bold text-[#737686] uppercase tracking-wider">Customer</span>
                        <span className="text-xs font-semibold text-midnight-navy block mt-0.5">{event.customer}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-[#737686] uppercase tracking-wider">City</span>
                        <span className="text-xs font-medium text-midnight-navy block mt-0.5">{event.city}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[9px] font-bold text-[#737686] uppercase tracking-wider">Mobile Number</span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs font-medium text-midnight-navy">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{event.mobile}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedScan && selectedScan.count > 2 && (
              <div className="text-center py-2">
                <button 
                  type="button" 
                  className="text-[10px] font-bold text-safety-blue hover:underline tracking-wider uppercase cursor-pointer"
                >
                  View {selectedScan.count - 2} Previous Events
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-6 bg-white border-t border-[#E2E8F0] shrink-0">
            <Button 
              className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 h-11 text-xs uppercase tracking-wider cursor-pointer shadow-md"
            >
              <ShieldCheck className="h-4 w-4" />
              Generate Audit Report
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

