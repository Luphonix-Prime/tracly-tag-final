import { useGetMarkedByLog } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function MarkedByLog() {
  const { data: logs = [], isLoading } = useGetMarkedByLog();

  const parseDate = (val: string | number | null) => {
    if (!val) return new Date();
    // Handle numeric strings like "1777283242867.0"
    if (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val)) {
      return new Date(parseFloat(val));
    }
    return new Date(val);
  };

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center gap-2 text-slate-500">
        <a className="text-[11px] font-bold hover:text-[#2563EB] transition-colors uppercase tracking-wider cursor-pointer" href="#">Reports</a>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[11px] text-[#2563EB] uppercase tracking-wider font-bold">Marked By Log</span>
      </div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-[30px] leading-[36px] font-bold text-[#0F172A] tracking-[-0.02em]">Marked By Log</h2>
          <p className="text-[16px] text-slate-600 mt-1">Audit trail of all code mapping activities.</p>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 border-b border-[#E2E8F0] bg-[#faf8ff] flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="text-[18px] font-semibold text-[#0F172A]">Mapping Activities</span>
            <span className="bg-[#ededf9] text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Live</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500">
              <span className="material-symbols-outlined">download</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full text-left table-fixed">
            <TableHeader>
              <TableRow className="border-b border-[#E2E8F0] bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="text-slate-500 tracking-wider w-[20%] text-[11px] font-bold px-6 py-4 uppercase">TIMESTAMP</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[15%] text-[11px] font-bold px-6 py-4 uppercase">USER</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[30%] text-[11px] font-bold px-6 py-4 uppercase">CODE DETAILS</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[20%] text-[11px] font-bold px-6 py-4 uppercase">PRODUCT / BATCH</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[15%] text-[11px] font-bold px-6 py-4 uppercase">LOCATION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500 font-semibold text-[14px]">No mapping logs found.</TableCell></TableRow>
              ) : (
                logs.map((log, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors group border-0">
                    <TableCell className="align-middle px-6 py-5 whitespace-nowrap text-[12px] text-slate-500 font-semibold">
                      {format(parseDate(log.mappedAt), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5">
                      <span className="text-[#0F172A] font-bold text-[14px]">{log.mappedByUsername}</span>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="text-[10px] font-bold tracking-widest uppercase bg-[#E2E8F0] text-[#0F172A] hover:bg-[#cbd5e1] border-none shadow-none h-5 px-1.5">{log.level}</Badge>
                      </div>
                      <code className="text-[11px] font-semibold tracking-wide text-slate-600 bg-slate-100 px-2 py-1 rounded truncate max-w-full block" title={log.rawString}>
                        {log.rawString}
                      </code>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5">
                      <div className="font-bold text-[14px] text-[#0F172A]">{log.productName}</div>
                      <div className="text-[12px] font-semibold text-slate-500 tracking-wide mt-0.5">{log.batchNumber}</div>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5">
                      <span className="text-[14px] text-slate-600">{log.locationName}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
