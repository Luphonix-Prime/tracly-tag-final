import { useState } from "react";
import { 
  useListCodes, getListCodesQueryKey, useGenerateCodes, useMapCode, 
  useListBatches, useListLocations, useListProducts 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { QrCode, Search, Copy, Loader2, Link as LinkIcon, ShieldCheck, Landmark } from "lucide-react";
import { format } from "date-fns";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const generateSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  batchId: z.coerce.number().min(1, "Batch is required"),
  level: z.enum(["unit", "l1", "l2", "shipper", "pallet"]),
  quantity: z.coerce.number().min(1).max(5000),
});

export default function Codes() {
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterProductId, setFilterProductId] = useState<number | undefined>();
  const [filterBatchId, setFilterBatchId] = useState<number | undefined>();
  const [filterLimit, setFilterLimit] = useState<number>(100);
  const [search, setSearch] = useState("");
  
  const { data: products = [] } = useListProducts();
  const { data: batches = [] } = useListBatches({});
  const { data: locations = [] } = useListLocations();
  
  const filteredBatches = filterProductId
    ? batches.filter(b => b.productId === filterProductId)
    : batches;

  const { data: codes = [], isLoading: isLoadingCodes } = useListCodes({ 
    level: filterLevel !== "all" ? (filterLevel as any) : undefined,
    batchId: filterBatchId,
    productId: filterProductId,
    limit: filterLimit
  });
  
  const generateCodes = useGenerateCodes();
  const mapCode = useMapCode();
  const queryClient = useQueryClient();
  
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedCodeId, setSelectedCodeId] = useState<number | null>(null);
  const [mapLocationId, setMapLocationId] = useState<string>("");
  const [selectedCode, setSelectedCode] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const form = useForm<z.infer<typeof generateSchema>>({
    resolver: zodResolver(generateSchema),
    defaultValues: { level: "unit", quantity: 100 },
  });

  const onGenerate = (values: z.infer<typeof generateSchema>) => {
    const { productId, ...payload } = values;
    generateCodes.mutate({ data: payload as any }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListCodesQueryKey() });
        toast.success(`Generated ${res.generated} codes`);
        form.reset({ ...values, quantity: 100 });
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Failed to generate codes");
      }
    });
  };

  const handleMapCode = () => {
    if (!selectedCodeId || !mapLocationId) return;
    mapCode.mutate({ id: selectedCodeId, data: { locationId: parseInt(mapLocationId) } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCodesQueryKey() });
        toast.success("Code mapped successfully");
        setMapDialogOpen(false);
        setSelectedCodeId(null);
        setMapLocationId("");
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Failed to map code");
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Code string copied");
  };

  // Filter client-side by search
  const filteredCodes = codes.filter(c => 
    !search || 
    c.rawString.toLowerCase().includes(search.toLowerCase()) || 
    c.serialNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Code Generation & Mapping" 
        description="Generate serialization codes and map them to physical locations" 
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center"><QrCode className="mr-2 h-5 w-5 text-primary" /> Generate Codes</CardTitle>
          <CardDescription>Generate DataMatrix strings for a specific batch and packaging level.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onGenerate)} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                <FormField control={form.control} name="productId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue("batchId", 0); // Reset batch when product changes
                      }} 
                      value={field.value?.toString() || ""}
                    >
                      <FormControl><SelectTrigger className="bg-background"><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="batchId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value?.toString() || ""}
                      disabled={!form.watch("productId")}
                    >
                      <FormControl><SelectTrigger className="bg-background"><SelectValue placeholder="Select batch" /></SelectTrigger></FormControl>
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
              </div>
              <div className="w-full md:w-48">
                <FormField control={form.control} name="level" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Packaging Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="unit">Unit</SelectItem>
                        <SelectItem value="l1">Level 1</SelectItem>
                        <SelectItem value="l2">Level 2</SelectItem>
                        <SelectItem value="shipper">Shipper</SelectItem>
                        <SelectItem value="pallet">Pallet</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="w-full md:w-32">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl><Input type="number" className="bg-background" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full md:w-auto" disabled={generateCodes.isPending}>
                {generateCodes.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="w-full md:w-64">
                <Select 
                  value={filterProductId?.toString() || "all"} 
                  onValueChange={(v) => {
                    const prodId = v === "all" ? undefined : parseInt(v);
                    setFilterProductId(prodId);
                    setFilterBatchId(undefined); // Reset batch filter on product change
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="All Products" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <Select 
                  value={filterBatchId?.toString() || "all"} 
                  onValueChange={(v) => setFilterBatchId(v === "all" ? undefined : parseInt(v))}
                >
                  <SelectTrigger><SelectValue placeholder="All Batches" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {filteredBatches.map(b => (
                      <SelectItem key={b.id} value={b.id.toString()}>{b.batchNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-36">
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger><SelectValue placeholder="All Levels" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="unit">Unit</SelectItem>
                    <SelectItem value="l1">Level 1</SelectItem>
                    <SelectItem value="l2">Level 2</SelectItem>
                    <SelectItem value="shipper">Shipper</SelectItem>
                    <SelectItem value="pallet">Pallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-36">
                <Select value={filterLimit.toString()} onValueChange={(v) => setFilterLimit(parseInt(v))}>
                  <SelectTrigger>
                    <span className="text-muted-foreground mr-1">Show:</span>
                    <SelectValue placeholder="Limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 codes</SelectItem>
                    <SelectItem value="25">25 codes</SelectItem>
                    <SelectItem value="50">50 codes</SelectItem>
                    <SelectItem value="100">100 codes</SelectItem>
                    <SelectItem value="250">250 codes</SelectItem>
                    <SelectItem value="500">500 codes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 md:min-w-[200px] relative ml-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search raw string or serial..." 
                  className="pl-8" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Product / Batch</TableHead>
                <TableHead>Verification (QR)</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingCodes ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No codes found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      {code.mapped ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">Mapped</Badge>
                      ) : (
                        <Badge variant="secondary">Unmapped</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="uppercase font-mono">{code.level}</Badge></TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{(code as any).productName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{(code as any).batchNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCode(code);
                            setIsSheetOpen(true);
                          }}
                          className="flex items-center gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300 shadow-sm"
                        >
                          <QrCode className="h-4 w-4 text-primary animate-pulse" />
                          <span className="font-mono text-xs">{code.serialNumber || code.ssccCode || "VIEW QR"}</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" title="Copy raw DataMatrix code" onClick={() => copyToClipboard(code.rawString)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {code.mapped ? (
                        <div className="text-sm">
                          <div>{(code as any).locationName}</div>
                          <div className="text-xs text-muted-foreground">by {(code as any).mappedByUsername}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!code.mapped && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setSelectedCodeId(code.id); setMapDialogOpen(true); }}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" /> Map
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Map Code to Location</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Target Location</label>
              <Select value={mapLocationId} onValueChange={setMapLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.locationName} ({l.uniqueName})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMapCode} disabled={!mapLocationId || mapCode.isPending}>
              {mapCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto h-full pr-6">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <ShieldCheck className="h-6 w-6 animate-bounce" />
              <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/30 font-semibold px-2 py-0.5">
                Genuine Product
              </Badge>
            </div>
            <SheetTitle className="text-xl font-bold">Secure Verification</SheetTitle>
            <SheetDescription>
              Verify the authenticity of this pharmaceutical item.
            </SheetDescription>
          </SheetHeader>

          {selectedCode && (
            <div className="py-6 space-y-6">
              {/* QR and URL Verification */}
              <div className="flex flex-col items-center justify-center p-5 border rounded-2xl bg-muted/20 shadow-sm space-y-3">
                <div className="p-3 bg-white rounded-xl border border-border shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/code/${selectedCode.serialNumber || selectedCode.ssccCode || ""}`)}`}
                    alt="Verification QR"
                    className="w-[180px] h-[180px]"
                  />
                </div>
                <div className="text-center w-full space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block">
                    Direct Verification URL
                  </span>
                  <a
                    href={`${window.location.origin}/code/${selectedCode.serialNumber || selectedCode.ssccCode || ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary hover:underline font-mono break-all flex items-center gap-1.5 justify-center py-1.5 px-3 rounded-lg bg-primary/5 border border-primary/10 transition-colors"
                  >
                    <LinkIcon className="h-3 w-3 shrink-0" />
                    <span>{window.location.origin}/code/{selectedCode.serialNumber || selectedCode.ssccCode || ""}</span>
                  </a>
                </div>
              </div>

              {/* Details sections */}
              <div className="space-y-4">
                {/* 1. Product Details */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <span>Product Specifications</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border bg-card text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Product Name</span>
                      <span className="font-semibold">{selectedCode.productName || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Brand Name (Marketed By)</span>
                      <span className="font-semibold text-primary">{selectedCode.marketedBy || "N/A"}</span>
                    </div>
                    <div className="col-span-2 border-t pt-2.5 mt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-muted-foreground block mb-0.5">Serial Number</span>
                          <span className="font-mono font-bold text-green-600">{selectedCode.serialNumber || selectedCode.ssccCode || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block mb-0.5">Mfg License No</span>
                          <span className="font-mono text-xs">{selectedCode.registrationNo || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Batch Details */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Batch & Verification Dates
                  </h4>
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border bg-card text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Batch Number</span>
                      <span className="font-mono font-semibold text-primary">{selectedCode.batchNumber || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Packaging Level</span>
                      <span className="uppercase font-mono text-xs font-semibold">{selectedCode.level}</span>
                    </div>
                    <div className="col-span-2 border-t pt-2.5 mt-1 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-0.5">Mfg Date</span>
                        <span className="font-semibold">{selectedCode.mfgDate ? format(new Date(selectedCode.mfgDate), "MMM d, yyyy") : "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-0.5">Expiry Date</span>
                        <span className="font-semibold text-destructive">{selectedCode.expiryDate ? format(new Date(selectedCode.expiryDate), "MMM d, yyyy") : "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Manufacturer Details */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Manufacturer & Origin</span>
                  </h4>
                  <div className="p-3.5 rounded-xl border bg-card text-sm space-y-2.5">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Company Name</span>
                      <span className="font-semibold">{selectedCode.companyName || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Corporate Address</span>
                      <span className="text-xs text-muted-foreground leading-relaxed block">{selectedCode.companyAddress || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
