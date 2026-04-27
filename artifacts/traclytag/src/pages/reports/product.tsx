import { useState } from "react";
import { useGetProductReport } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportCsv } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";

export default function ProductReport() {
  const [dateRange, setDateRange] = useState<DateRange>({});
  const { data: report = [], isLoading } = useGetProductReport({ from: dateRange.from, to: dateRange.to });

  const handleExport = () => {
    if (!report.length) return;
    exportCsv(`product-report-${new Date().toISOString().split('T')[0]}.csv`, report.map(r => ({
      Product: r.productName,
      Batch: r.batchNumber,
      Size: r.size,
      'Total Codes': r.total,
      'Mapped': r.mapped,
      'Unmapped': r.unmapped
    })));
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Product Report" 
        description="Comprehensive breakdown of codes by product, batch and hierarchy size" 
        action={
          <Button onClick={handleExport} disabled={!report.length} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <Card>
        <CardHeader className="py-4 border-b">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Pack Size Ref</TableHead>
                <TableHead className="text-right">Total Codes</TableHead>
                <TableHead className="text-right">Mapped</TableHead>
                <TableHead className="text-right">Unmapped</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : report.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No data available.</TableCell></TableRow>
              ) : (
                report.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell className="font-mono">{row.batchNumber}</TableCell>
                    <TableCell>
                      {row.size ? <span className="text-xs text-muted-foreground">Size: {row.size}</span> : '-'}
                    </TableCell>
                    <TableCell className="text-right">{row.total}</TableCell>
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
