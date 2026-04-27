import { useGetDashboardSummary, useGetCurrentUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Layers, QrCode, CheckCircle, MapPin, Users, Building2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export default function Dashboard() {
  const { data: user } = useGetCurrentUser();
  const { data: summary, isLoading } = useGetDashboardSummary();

  const isMaster = user?.role === "master";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading || !summary) {
    return <div className="animate-pulse space-y-4">Loading dashboard...</div>;
  }

  const statCards = [
    { title: "Products", value: summary.totalProducts, icon: Package, color: "text-blue-500" },
    { title: "Batches", value: summary.totalBatches, icon: Layers, color: "text-purple-500" },
    { title: "Codes Generated", value: summary.totalCodes, icon: QrCode, color: "text-orange-500" },
    { title: "Codes Mapped", value: summary.totalMapped, icon: CheckCircle, color: "text-green-500" },
    { title: "Locations", value: summary.totalLocations, icon: MapPin, color: "text-red-500" },
    { title: "Users", value: summary.totalUsers, icon: Users, color: "text-teal-500" },
  ];

  if (isMaster) {
    statCards.push({ title: "Companies", value: summary.totalCompanies || 0, icon: Building2, color: "text-indigo-500" });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of production and tracking metrics" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Codes by Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.codesByLevel?.map((level) => (
                <div key={level.level} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase">{level.level}</Badge>
                  </div>
                  <span className="font-semibold">{level.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentCodes?.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        <Badge variant={code.mapped ? "default" : "secondary"}>
                          {code.mapped ? "Mapped" : "Unmapped"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">{code.level}</Badge>
                      </TableCell>
                      <TableCell>{code.productName || "Unknown"}</TableCell>
                      <TableCell className="font-mono text-xs">{code.batchNumber || "Unknown"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[150px] inline-block">
                            {code.rawString}
                          </code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(code.rawString)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!summary.recentCodes || summary.recentCodes.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No recent codes found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
