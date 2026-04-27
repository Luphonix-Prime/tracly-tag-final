import { useState } from "react";
import { useGetShipperSummary, useGetPalletSummary } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageCheck, Layers, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exportCsv } from "@/lib/csv";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";

export default function Summary() {
  const [shipperRange, setShipperRange] = useState<DateRange>({});
  const [palletRange, setPalletRange] = useState<DateRange>({});
  const { data: shippers = [], isLoading: isShippersLoading } = useGetShipperSummary({ from: shipperRange.from, to: shipperRange.to });
  const { data: pallets = [], isLoading: isPalletsLoading } = useGetPalletSummary({ from: palletRange.from, to: palletRange.to });

  const exportShippers = () => {
    if (!shippers.length) return;
    exportCsv(`shipper-summary-${new Date().toISOString().split('T')[0]}.csv`, shippers.map(r => ({
      Product: r.productName,
      'Product ID': r.productId,
      Batch: r.batchNumber,
      'Total Number': r.total,
      Size: r.size ?? '',
      'Shipper Mapped': r.shipperMapped,
      'Shipper Unmapped': r.shipperUnmapped,
    })));
  };

  const exportPallets = () => {
    if (!pallets.length) return;
    exportCsv(`pallet-summary-${new Date().toISOString().split('T')[0]}.csv`, pallets.map(r => ({
      Product: r.productName,
      'Product ID': r.productId,
      Batch: r.batchNumber,
      'Total Number': r.total,
      Size: r.size ?? '',
      'Pallet Mapped': r.palletMapped,
      'Pallet Unmapped': r.palletUnmapped,
    })));
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Production Summary" 
        description="Aggregation of highest-level packaging mapped in the system" 
      />

      <Tabs defaultValue="shipper" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="shipper" className="flex items-center gap-2"><PackageCheck className="h-4 w-4"/> Shipper Summary</TabsTrigger>
          <TabsTrigger value="pallet" className="flex items-center gap-2"><Layers className="h-4 w-4"/> Pallet Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="shipper">
          <Card>
            <CardHeader className="py-4 border-b">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <DateRangeFilter value={shipperRange} onChange={setShipperRange} />
                <Button onClick={exportShippers} disabled={!shippers.length} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download Report
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Total Shippers</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Mapped</TableHead>
                    <TableHead className="text-right">Unmapped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isShippersLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : shippers.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No shipper data available.</TableCell></TableRow>
                  ) : (
                    shippers.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.productName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{row.productId}</TableCell>
                        <TableCell className="font-mono">{row.batchNumber}</TableCell>
                        <TableCell className="text-right font-semibold">{row.total}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.size ?? '-'}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">{row.shipperMapped}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{row.shipperUnmapped}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pallet">
          <Card>
            <CardHeader className="py-4 border-b">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <DateRangeFilter value={palletRange} onChange={setPalletRange} />
                <Button onClick={exportPallets} disabled={!pallets.length} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download Report
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Total Pallets</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Mapped</TableHead>
                    <TableHead className="text-right">Unmapped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPalletsLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : pallets.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No pallet data available.</TableCell></TableRow>
                  ) : (
                    pallets.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.productName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{row.productId}</TableCell>
                        <TableCell className="font-mono">{row.batchNumber}</TableCell>
                        <TableCell className="text-right font-semibold">{row.total}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.size ?? '-'}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">{row.palletMapped}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{row.palletUnmapped}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
