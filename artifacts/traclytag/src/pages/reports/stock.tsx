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
      <PageHeader 
        title="Stock Report" 
        description="Current inventory status based on mapped codes" 
        action={
          <Button onClick={handleExport} disabled={!stock.length} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Filter Product:</span>
              <Select value={filterProductId?.toString() || "all"} onValueChange={(val) => setFilterProductId(val === "all" ? undefined : parseInt(val))}>
                <SelectTrigger className="w-[250px]">
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
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Total Codes Generated</TableHead>
                <TableHead className="text-right">Mapped (In Stock)</TableHead>
                <TableHead className="text-right">Unmapped</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : stock.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No data available.</TableCell></TableRow>
              ) : (
                stock.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell className="font-mono">{row.batchNumber}</TableCell>
                    <TableCell className="text-right">{row.totalCodes}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{row.mapped}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.unmapped}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
