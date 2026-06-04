import { useState } from "react";
import { useGetStockReport, useListProducts } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { exportCsv } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";

export default function StockReport() {
  const [filterProductId, setFilterProductId] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<DateRange>({});
  const { data: products = [] } = useListProducts();
  const { data: stock = [], isLoading } = useGetStockReport({
    productId: filterProductId,
    from: dateRange.from,
    to: dateRange.to,
  });

  const handleExport = () => {
    if (!stock.length) return;
    exportCsv(`stock-report-${new Date().toISOString().split('T')[0]}.csv`, stock.map(r => ({
      Product: r.productName,
      Batch: r.batchNumber,
      'Total Codes': r.totalCodes,
      'Mapped (In Stock)': r.mapped,
      'Unmapped': r.unmapped
    })));
  };

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center gap-2 text-slate-500">
        <a className="text-[11px] font-bold hover:text-[#2563EB] transition-colors uppercase tracking-wider cursor-pointer" href="#">Reports</a>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[11px] text-[#2563EB] uppercase tracking-wider font-bold">Stock Report</span>
      </div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-[30px] leading-[36px] font-bold text-[#0F172A] tracking-[-0.02em]">Stock Report</h2>
          <p className="text-[16px] text-slate-600 mt-1">Current inventory status based on mapped codes.</p>
        </div>
        <Button onClick={handleExport} disabled={!stock.length} className="px-6 py-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] font-semibold rounded-lg transition-all flex items-center gap-2 active:scale-95 h-auto shadow-sm cursor-pointer">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 border-b border-[#E2E8F0] bg-[#faf8ff] flex items-center justify-between py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Filter Product:</span>
              <Select value={filterProductId?.toString() || "all"} onValueChange={(val) => setFilterProductId(val === "all" ? undefined : parseInt(val))}>
                <SelectTrigger className="w-[250px] bg-white border border-[#E2E8F0] h-9 text-[14px] font-semibold shadow-sm focus:ring-[#2563EB]">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full text-left table-fixed">
            <TableHeader>
              <TableRow className="border-b border-[#E2E8F0] bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="text-slate-500 tracking-wider w-[25%] text-[11px] font-bold px-6 py-4 uppercase">PRODUCT</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[20%] text-[11px] font-bold px-6 py-4 uppercase">BATCH</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[20%] text-[11px] font-bold px-6 py-4 uppercase text-right">TOTAL CODES GENERATED</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[20%] text-[11px] font-bold px-6 py-4 uppercase text-right">MAPPED (IN STOCK)</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[15%] text-[11px] font-bold px-6 py-4 uppercase text-right">UNMAPPED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : stock.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500 font-semibold text-[14px]">No data available.</TableCell></TableRow>
              ) : (
                stock.map((row, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors group border-0">
                    <TableCell className="align-middle px-6 py-5">
                      <span className="text-[#0F172A] font-bold text-[14px]">{row.productName}</span>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5">
                      <span className="font-semibold tracking-wide text-slate-600">{row.batchNumber}</span>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5 text-right">
                      <span className="text-[#0F172A] font-bold text-[14px]">{row.totalCodes}</span>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5 text-right">
                      <Badge className="text-[12px] font-bold bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE] px-2 py-0.5 rounded shadow-sm hover:bg-[#E0E7FF]">
                        {row.mapped}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5 text-right">
                      <span className="text-slate-500 font-semibold">{row.unmapped}</span>
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
