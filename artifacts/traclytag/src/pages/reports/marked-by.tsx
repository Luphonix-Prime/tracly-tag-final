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
      <PageHeader 
        title="Marked By Log" 
        description="Audit trail of all code mapping activities" 
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Code Details</TableHead>
                <TableHead>Product / Batch</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No mapping logs found.</TableCell></TableRow>
              ) : (
                logs.map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(parseDate(log.mappedAt), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium">{log.mappedByUsername}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] uppercase h-5 px-1">{log.level}</Badge>
                      </div>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[200px] block" title={log.rawString}>
                        {log.rawString}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{log.productName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{log.batchNumber}</div>
                    </TableCell>
                    <TableCell>{log.locationName}</TableCell>
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
