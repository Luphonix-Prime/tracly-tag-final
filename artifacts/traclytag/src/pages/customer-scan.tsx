import { useState } from "react";
import { ChevronRight, Search, Calendar, SlidersHorizontal, Eye, AlertTriangle, AlertCircle, Map, List, Globe2, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
              {MOCK_SCAN_DATA.map((row, i) => (
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
                    <Button variant="ghost" size="icon" className={`h-8 w-8 transition-colors ${
                      row.type === 'normal' ? 'text-safety-blue hover:bg-safety-blue/10' :
                      row.type === 'anomaly' ? 'text-[#F59E0B] hover:bg-[#F59E0B]/10' :
                      'text-[#EF4444] hover:bg-[#EF4444]/10'
                    }`}>
                      <Eye className="h-[18px] w-[18px]" />
                    </Button>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
