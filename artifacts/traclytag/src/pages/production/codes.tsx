import { useState } from "react";
import { 
  useGenerateCodes, 
  useListBatches, 
  useListProducts,
  useGetProductReport, 
  getGetProductReportQueryKey,
  getListCodesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Search, 
  Loader2, 
  ChevronRight, 
  Download, 
  Plus, 
  ChevronLeft, 
  RotateCcw,
  Barcode
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const generateSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  batchId: z.coerce.number().min(1, "Batch is required"),
  level: z.enum(["unit", "l1", "l2", "shipper", "pallet"]),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").max(5000, "Maximum 5,000 units"),
});

export default function Codes() {
  const queryClient = useQueryClient();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [downloadingBatchId, setDownloadingBatchId] = useState<number | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [filterProductId, setFilterProductId] = useState<number | undefined>();
  const [filterBatchId, setFilterBatchId] = useState<number | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // API Data Hooks
  const { data: products = [] } = useListProducts();
  const { data: batches = [] } = useListBatches({});
  const { data: reportData = [], isLoading: isLoadingReport } = useGetProductReport();
  const generateCodes = useGenerateCodes();

  // Reset all filters
  const handleClearFilters = () => {
    setSearch("");
    setFilterProductId(undefined);
    setFilterBatchId(undefined);
    setCurrentPage(1);
    toast.success("Filters reset successfully");
  };

  // Helper to format creation dates from batches
  const getBatchCreatedAt = (batchId: number) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch?.createdAt) return "N/A";
    try {
      return format(new Date(batch.createdAt), "dd MMM yyyy, HH:mm");
    } catch {
      return batch.createdAt;
    }
  };

  // Handle single batch codes download as CSV
  const handleDownloadBatch = async (batchId: number, batchNumber: string) => {
    setDownloadingBatchId(batchId);
    try {
      const response = await fetch(`/api/codes?batchId=${batchId}&limit=5000`);
      if (!response.ok) throw new Error("Failed to fetch codes");
      const codesList = await response.json();
      
      if (!codesList || codesList.length === 0) {
        toast.error("No codes found in this batch to download");
        return;
      }

      // Convert to CSV
      const headers = ["Serial Number / SSCC", "Level", "Raw GS1 String", "Created At", "Mapped", "Location"];
      const csvContent = [
        headers.join(","),
        ...codesList.map((c: any) => [
          `"${c.serialNumber || c.ssccCode || ''}"`,
          `"${c.level}"`,
          `"${c.rawString}"`,
          `"${c.createdAt}"`,
          `"${c.mapped ? 'Yes' : 'No'}"`,
          `"${c.locationName || ''}"`
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `codes_batch_${batchNumber}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded ${codesList.length} codes successfully`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to download codes for batch");
    } finally {
      setDownloadingBatchId(null);
    }
  };

  // Export current summary table view as CSV
  const handleExportReport = () => {
    if (filteredReport.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const headers = ["Product Name", "SKU ID", "Batch", "Total QR Codes", "Created Date"];
    const csvContent = [
      headers.join(","),
      ...filteredReport.map(row => [
        `"${row.productName}"`,
        `"${row.size}"`,
        `"${row.batchNumber}"`,
        `"${row.total}"`,
        `"${getBatchCreatedAt(row.batchId)}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `generate_codes_summary_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Summary report exported successfully");
  };

  // Form definition for Generate Codes
  const form = useForm<z.infer<typeof generateSchema>>({
    resolver: zodResolver(generateSchema),
    defaultValues: { level: "unit", quantity: 100 },
  });

  const onGenerateSubmit = (values: z.infer<typeof generateSchema>) => {
    const { productId, ...payload } = values;
    generateCodes.mutate({ data: payload as any }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListCodesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductReportQueryKey() });
        toast.success(`Generated ${res.generated} codes`);
        form.reset({ ...values, quantity: 100 });
        setGenerateDialogOpen(false);
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Failed to generate codes");
      }
    });
  };

  // Frontend filtering logic
  const filteredReport = reportData.filter((row) => {
    if (filterProductId && row.productId !== filterProductId) return false;
    if (filterBatchId && row.batchId !== filterBatchId) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      const matchProduct = row.productName?.toLowerCase().includes(searchLower);
      const matchBatch = row.batchNumber?.toLowerCase().includes(searchLower);
      const matchSku = row.size?.toLowerCase().includes(searchLower);
      return matchProduct || matchBatch || matchSku;
    }
    return true;
  });

  // Pagination calculation
  const totalRecords = filteredReport.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalRecords);
  const currentItems = filteredReport.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <nav className="flex items-center gap-2 text-outline font-bold text-[10px] mb-2 uppercase tracking-widest text-[#737686]">
            <span>Industrial Panel</span>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="text-safety-blue">Generate Product Codes</span>
          </nav>
          <h2 className="text-3xl font-bold text-midnight-navy tracking-tight">Generate Product Codes</h2>
          <p className="text-sm text-[#434655] mt-1">Manage and track unique serialization codes for product inventory.</p>
        </div>
        <Button 
          onClick={() => {
            form.reset({ level: "unit", quantity: 100 });
            setGenerateDialogOpen(true);
          }}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white px-6 py-3 rounded-lg font-bold shadow-md transform active:scale-95 transition-all cursor-pointer h-11"
        >
          <Plus className="h-4 w-4" />
          GENERATE NEW
        </Button>
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex-1 min-w-[240px]">
          <label className="font-bold text-[10px] text-[#737686] mb-1 block uppercase">Search Unit ID</label>
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737686] h-4 w-4" />
            <Input 
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg py-2 pl-10 pr-4 text-sm focus:border-safety-blue outline-none transition-all h-10 font-mono" 
              placeholder="e.g. BTC-2024-X91" 
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="flex-1 min-w-[240px]">
          <label className="font-bold text-[10px] text-[#737686] mb-1 block uppercase">Product Name/ID</label>
          <Select 
            value={filterProductId?.toString() || "all"} 
            onValueChange={(v) => {
              setFilterProductId(v === "all" ? undefined : parseInt(v));
              setFilterBatchId(undefined); // Reset batch when product changes
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg h-10 text-sm">
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

        <div className="flex-1 min-w-[240px]">
          <label className="font-bold text-[10px] text-[#737686] mb-1 block uppercase">Batch</label>
          <Select 
            value={filterBatchId?.toString() || "all"} 
            onValueChange={(v) => {
              setFilterBatchId(v === "all" ? undefined : parseInt(v));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg h-10 text-sm">
              <SelectValue placeholder="All Batches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches
                .filter(b => !filterProductId || b.productId === filterProductId)
                .map(b => (
                  <SelectItem key={b.id} value={b.id.toString()}>{b.batchNumber}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end h-10 mt-5">
          <Button 
            variant="outline" 
            onClick={handleClearFilters}
            className="h-10 w-10 p-0 border border-[#E2E8F0] rounded-lg hover:bg-slate-50 flex items-center justify-center cursor-pointer"
            title="Reset Filters"
          >
            <RotateCcw className="h-4 w-4 text-[#434655]" />
          </Button>
        </div>

        <div className="flex items-end h-10 ml-auto mt-5">
          <Button 
            variant="outline" 
            onClick={handleExportReport}
            className="flex items-center gap-2 h-10 px-4 border border-[#E2E8F0] rounded-lg font-bold text-midnight-navy hover:bg-slate-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export XLSX
          </Button>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <TableHead className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap">PRODUCT NAME</TableHead>
                <TableHead className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap">SKU ID</TableHead>
                <TableHead className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap">BATCH</TableHead>
                <TableHead className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap text-center">TOTAL QR CODES</TableHead>
                <TableHead className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap">CREATED DATE</TableHead>
                <TableHead className="px-6 py-4 font-bold text-[11px] text-[#737686] uppercase tracking-wider whitespace-nowrap text-right">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingReport ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#2563EB]" />
                  </TableCell>
                </TableRow>
              ) : currentItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[#737686] text-sm">
                    No batches found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map((row, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors border-b border-[#E2E8F0] align-middle">
                    <TableCell className="px-6 py-4 text-sm font-semibold text-midnight-navy">{row.productName}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-[#434655]">{row.size}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-[#434655] font-mono">{row.batchNumber}</TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#dae2fd] text-[#131b2e]">
                        {Number(row.total).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-[#434655]">{getBatchCreatedAt(row.batchId)}</TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={downloadingBatchId === row.batchId}
                        onClick={() => handleDownloadBatch(row.batchId, row.batchNumber)}
                        className="h-8 w-8 text-[#2563EB] hover:bg-[#2563EB]/10 rounded-lg transition-all cursor-pointer"
                        title="Download codes as CSV"
                      >
                        {downloadingBatchId === row.batchId ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
          <span className="text-sm text-[#434655]">
            Showing <span className="font-semibold text-midnight-navy">{totalRecords > 0 ? startIndex + 1 : 0} to {endIndex}</span> of <span className="font-semibold text-midnight-navy">{totalRecords}</span> records
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 disabled:opacity-30 cursor-pointer" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, pageIdx) => {
                const pageNum = pageIdx + 1;
                if (totalPages > 6 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                  if (pageNum === 2 && currentPage > 3) return <span key={pageNum} className="px-1 text-sm">...</span>;
                  if (pageNum === totalPages - 1 && currentPage < totalPages - 2) return <span key={pageNum} className="px-1 text-sm">...</span>;
                  return null;
                }
                return (
                  <Button 
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 p-0 font-bold text-sm cursor-pointer ${
                      currentPage === pageNum 
                        ? "bg-[#2563EB] hover:bg-[#2563EB]/90 text-white" 
                        : "bg-transparent text-[#434655] hover:bg-slate-100 border border-transparent hover:border-[#E2E8F0]"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 disabled:opacity-30 cursor-pointer" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* dialog modal for Generate New */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white border border-[#E2E8F0] rounded-xl shadow-lg">
          <DialogHeader className="border-b border-[#E2E8F0] pb-3">
            <DialogTitle className="text-lg font-bold text-midnight-navy">Generate New Serialization Codes</DialogTitle>
            <DialogDescription className="text-sm text-[#434655]">
              Select product details and quantity to initialize new secure serialization codes.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onGenerateSubmit)} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                
                {/* Product Select */}
                <FormField control={form.control} name="productId" render={({ field }) => (
                  <FormItem className="space-y-1.5 col-span-2">
                    <FormLabel className="text-[10px] font-bold text-[#737686] uppercase tracking-widest flex items-center gap-1">
                      Product Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(Number(val));
                        form.setValue("batchId", undefined as any);
                      }} 
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full bg-[#F8FAFC] border border-[#E2E8F0] h-10 rounded-lg focus:ring-0 text-sm text-[#0F172A]">
                          <SelectValue placeholder="Select Product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* SKU Select (linked to product) */}
                <FormField control={form.control} name="productId" render={({ field }) => (
                  <FormItem className="space-y-1.5 col-span-2">
                    <FormLabel className="text-[10px] font-bold text-[#737686] uppercase tracking-widest flex items-center gap-1">
                      SKU ID <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(Number(val));
                        form.setValue("batchId", undefined as any);
                      }} 
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full bg-[#F8FAFC] border border-[#E2E8F0] h-10 rounded-lg focus:ring-0 text-sm text-[#0F172A]">
                          <SelectValue placeholder="Select SKU" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.skuId} ({p.skuSize || "No Size"})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Batch No Select */}
                <FormField control={form.control} name="batchId" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-bold text-[#737686] uppercase tracking-widest flex items-center gap-1">
                      Batch No <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(Number(val))} 
                      value={field.value?.toString() || ""}
                      disabled={!form.watch("productId")}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full bg-[#F8FAFC] border border-[#E2E8F0] h-10 rounded-lg focus:ring-0 text-sm text-[#0F172A] disabled:opacity-50">
                          <SelectValue placeholder="Select Active Batch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {batches
                          .filter(b => b.productId === Number(form.watch("productId")))
                          .map(b => (
                            <SelectItem key={b.id} value={b.id.toString()}>
                              {b.batchNumber}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Packaging Level */}
                <FormField control={form.control} name="level" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-bold text-[#737686] uppercase tracking-widest flex items-center gap-1">
                      Packaging Level <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full bg-[#F8FAFC] border border-[#E2E8F0] h-10 rounded-lg focus:ring-0 text-sm text-[#0F172A]">
                          <SelectValue placeholder="Select Level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unit">Unit</SelectItem>
                        <SelectItem value="l1">Level 1 (L1)</SelectItem>
                        <SelectItem value="l2">Level 2 (L2)</SelectItem>
                        <SelectItem value="shipper">Shipper</SelectItem>
                        <SelectItem value="pallet">Pallet</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Quantity */}
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem className="space-y-1.5 col-span-2">
                    <FormLabel className="text-[10px] font-bold text-[#737686] uppercase tracking-widest flex items-center gap-1">
                      Quantity of Code <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] h-10 rounded-lg focus:border-[#2563EB] focus:ring-0 font-mono text-sm" 
                        placeholder="Enter quantity (e.g. 100)" 
                        {...field} 
                      />
                    </FormControl>
                    <p className="text-[10px] text-slate-400 italic">Maximum 5,000 units per serialization request.</p>
                    <FormMessage />
                  </FormItem>
                )} />

              </div>
              
              <DialogFooter className="pt-4 border-t border-[#E2E8F0] flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setGenerateDialogOpen(false)} 
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold cursor-pointer h-10" 
                  disabled={generateCodes.isPending}
                >
                  {generateCodes.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Codes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
