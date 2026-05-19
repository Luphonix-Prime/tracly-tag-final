import { useEffect, useMemo, useState } from "react";
import { 
  useListCodes, getListCodesQueryKey, useGenerateCodes, useMapCode, 
  useListBatches, useListLocations, useListProducts 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { ChevronDown, Copy, Link as LinkIcon, Loader2, QrCode, Search } from "lucide-react";
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

const generateSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  batchId: z.coerce.number().min(1, "Batch is required"),
  level: z.enum(["unit", "l1", "l2", "shipper", "pallet"]),
  quantity: z.coerce.number().min(1).max(5000),
});

function getCreatedAtDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function getCreatedGroupKey(value: Date | string) {
  return format(getCreatedAtDate(value), "yyyy-MM-dd HH:mm");
}

export default function Codes() {
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterBatchId, setFilterBatchId] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  const { data: products = [] } = useListProducts();
  const { data: batches = [] } = useListBatches({});
  const { data: locations = [] } = useListLocations();
  
  const { data: codes = [], isLoading: isLoadingCodes } = useListCodes({ 
    level: filterLevel !== "all" ? (filterLevel as any) : undefined,
    batchId: filterBatchId,
    limit: 100 // limit to 100 for performance
  });
  
  const generateCodes = useGenerateCodes();
  const mapCode = useMapCode();
  const queryClient = useQueryClient();
  
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedCodeId, setSelectedCodeId] = useState<number | null>(null);
  const [mapLocationId, setMapLocationId] = useState<string>("");

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

  const codeGroups = useMemo(() => {
    const groups = filteredCodes.reduce<Array<{ key: string; createdAt: Date; codes: typeof filteredCodes }>>((acc, code) => {
      const key = getCreatedGroupKey(code.createdAt);
      const existing = acc.find((group) => group.key === key);
      if (existing) {
        existing.codes.push(code);
        return acc;
      }

      acc.push({
        key,
        createdAt: getCreatedAtDate(code.createdAt),
        codes: [code],
      });
      return acc;
    }, []);

    return groups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [filteredCodes]);

  useEffect(() => {
    if (codeGroups.length === 0) return;
    const latestKey = codeGroups[0].key;
    setExpandedGroups((current) => {
      if (latestKey in current) return current;
      return { ...current, [latestKey]: true };
    });
  }, [codeGroups]);

  const setAllGroupsExpanded = (open: boolean) => {
    setExpandedGroups(Object.fromEntries(codeGroups.map((group) => [group.key, open])));
  };

  const renderCodeRow = (code: (typeof filteredCodes)[number]) => (
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
          <code className="text-xs bg-muted px-2 py-1 rounded w-[250px] truncate block" title={code.rawString}>
            {code.rawString}
          </code>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(code.rawString)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">SN: {code.serialNumber || code.ssccCode}</div>
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
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex flex-1 gap-4">
              <div className="w-full md:w-64">
                <Select value={filterBatchId?.toString() || "all"} onValueChange={(v) => setFilterBatchId(v === "all" ? undefined : parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Filter by Batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map(b => (
                      <SelectItem key={b.id} value={b.id.toString()}>{b.batchNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
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
            </div>
            <div className="w-full md:w-72 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search raw string or serial..." 
                className="pl-8" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
            {codeGroups.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAllGroupsExpanded(true)}>
                  Open all
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAllGroupsExpanded(false)}>
                  Collapse all
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Product / Batch</TableHead>
                <TableHead>DataMatrix String</TableHead>
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
                codeGroups.flatMap((group) => {
                  const isExpanded = expandedGroups[group.key] ?? false;
                  const mappedCount = group.codes.filter((code) => code.mapped).length;

                  return [
                    <TableRow key={group.key} className="bg-muted/45 hover:bg-muted/60">
                      <TableCell colSpan={6} className="py-2">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 text-left"
                          onClick={() => setExpandedGroups((current) => ({ ...current, [group.key]: !isExpanded }))}
                          aria-expanded={isExpanded}
                        >
                          <span className="flex items-center gap-2">
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                            <span className="font-medium">{format(group.createdAt, "dd MMM yyyy, h:mm a")}</span>
                            <span className="text-xs text-muted-foreground">
                              {group.codes.length} entries
                            </span>
                          </span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{mappedCount} mapped</span>
                            <span>{group.codes.length - mappedCount} unmapped</span>
                          </span>
                        </button>
                      </TableCell>
                    </TableRow>,
                    ...(isExpanded ? group.codes.map(renderCodeRow) : []),
                  ];
                })
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
    </div>
  );
}
