import { useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Search, Filter, Download, Eye, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {MOCK_MAPPING_DATA.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors group align-middle">
                  <td className="px-6 py-4 text-sm font-semibold text-midnight-navy">{row.product}</td>
                  <td className="px-6 py-4 font-mono text-[13px] font-medium text-[#434655]">{row.batch}</td>
                  <td className="px-6 py-4 text-sm text-[#434655]">{row.date}</td>
                  <td className="px-6 py-4 text-sm text-right">{row.totalQR}</td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${row.status === 'success' ? 'text-success-emerald' : 'text-success-emerald'}`}>{row.mappedQR}</td>
                  <td className={`px-6 py-4 text-sm text-right font-semibold ${row.remainingQR !== '0' ? 'text-[#EF4444]' : 'text-[#434655]'}`}>{row.remainingQR}</td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${row.efficiency > 80 ? 'bg-success-emerald' : row.efficiency > 40 ? 'bg-[#F59E0B]' : 'bg-safety-blue'}`} 
                        style={{ width: `${row.efficiency}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#737686] hover:text-safety-blue transition-colors">
                      <Eye className="h-4 w-4" />
                    </Button>
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
    </div>
  );
}
