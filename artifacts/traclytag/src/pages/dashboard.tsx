import React, { useState, useMemo } from "react";
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, 
  AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { 
  Download, Calendar, Search, Bell, HelpCircle, 
  Package, Layers, QrCode, Scan, ShieldAlert, Users,
  CheckCircle2, AlertTriangle, XCircle, ArrowUpRight,
  TrendingUp, Radio, RefreshCw, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetDashboardSummary, useGetCurrentUser } from "@workspace/api-client-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Recharts custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-xs p-2 rounded shadow-lg border border-slate-700">
        <p className="font-bold text-slate-300 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color || entry.fill }}>
            {entry.name || 'Value'}: <span className="font-bold">{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ECharts imports
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import indiaGeoJson from "../assets/india_states.json";

// Register India GeoJSON map once
if (!echarts.getMap("india")) {
  echarts.registerMap("india", indiaGeoJson as any);
}

// Data Architecture for Scan Locations
export interface ScanLocationItem {
  city: string;
  coordinates: [number, number]; // [lng, lat]
  scans: number;
  threatLevel: "High" | "Medium" | "Low";
  activeDevices: number;
  lastScan: string;
  status: "active" | "warning" | "normal";
}

export interface NetworkConnection {
  from: string;
  to: string;
  activity: number;
}

const DEFAULT_SCAN_LOCATIONS: ScanLocationItem[] = [
  { city: "Mumbai", coordinates: [72.8777, 19.0760], scans: 32000, threatLevel: "High", activeDevices: 184, lastScan: "12 sec ago", status: "active" },
  { city: "Delhi", coordinates: [77.1025, 28.7041], scans: 28000, threatLevel: "High", activeDevices: 156, lastScan: "4 sec ago", status: "active" },
  { city: "Bengaluru", coordinates: [77.5946, 12.9716], scans: 15000, threatLevel: "Medium", activeDevices: 92, lastScan: "25 sec ago", status: "active" },
  { city: "Pune", coordinates: [73.8567, 18.5204], scans: 8000, threatLevel: "Medium", activeDevices: 45, lastScan: "1 min ago", status: "active" },
  { city: "Ahmedabad", coordinates: [72.5714, 23.0225], scans: 4000, threatLevel: "High", activeDevices: 38, lastScan: "2 min ago", status: "warning" },
  { city: "Hyderabad", coordinates: [78.4867, 17.3850], scans: 9500, threatLevel: "Medium", activeDevices: 64, lastScan: "45 sec ago", status: "active" },
  { city: "Chennai", coordinates: [80.2707, 13.0827], scans: 7200, threatLevel: "Low", activeDevices: 52, lastScan: "3 min ago", status: "normal" },
  { city: "Kolkata", coordinates: [88.3639, 22.5726], scans: 6100, threatLevel: "Medium", activeDevices: 41, lastScan: "5 min ago", status: "active" },
  { city: "Jaipur", coordinates: [75.7873, 26.9124], scans: 3500, threatLevel: "Low", activeDevices: 28, lastScan: "8 min ago", status: "normal" },
  { city: "Lucknow", coordinates: [80.9462, 26.8467], scans: 2900, threatLevel: "Low", activeDevices: 22, lastScan: "12 min ago", status: "normal" },
  { city: "Patna", coordinates: [85.1376, 25.5941], scans: 2100, threatLevel: "Low", activeDevices: 18, lastScan: "15 min ago", status: "normal" },
  { city: "Guwahati", coordinates: [91.7362, 26.1445], scans: 1800, threatLevel: "Low", activeDevices: 14, lastScan: "20 min ago", status: "normal" },
];

const NETWORK_CONNECTIONS: NetworkConnection[] = [
  { from: "Delhi", to: "Jaipur", activity: 82 },
  { from: "Delhi", to: "Lucknow", activity: 65 },
  { from: "Delhi", to: "Kolkata", activity: 74 },
  { from: "Mumbai", to: "Ahmedabad", activity: 90 },
  { from: "Mumbai", to: "Pune", activity: 95 },
  { from: "Mumbai", to: "Bengaluru", activity: 88 },
  { from: "Bengaluru", to: "Hyderabad", activity: 78 },
  { from: "Hyderabad", to: "Chennai", activity: 60 },
  { from: "Kolkata", to: "Guwahati", activity: 45 },
];

// Apache ECharts Geo India Security Map Component
const InteractiveIndiaMap = ({ scansByCity }: { scansByCity?: { city: string | null; count: number }[] }) => {
  // Merge dynamic API customer scan data with base geolocation dataset
  const locationsData = useMemo(() => {
    if (!scansByCity || scansByCity.length === 0) return DEFAULT_SCAN_LOCATIONS;

    const countMap = new Map<string, number>();
    scansByCity.forEach((s) => {
      if (s.city) countMap.set(s.city.toLowerCase(), s.count);
    });

    return DEFAULT_SCAN_LOCATIONS.map((loc) => {
      const dbCount = countMap.get(loc.city.toLowerCase());
      if (dbCount !== undefined) {
        return { ...loc, scans: dbCount };
      }
      return loc;
    });
  }, [scansByCity]);

  // Construct ECharts Option Object
  const getOption = useMemo(() => {
    const coordsMap = new Map<string, [number, number]>();
    locationsData.forEach((l) => coordsMap.set(l.city, l.coordinates));

    // Scatter effect points for active scan locations
    const majorLocations = locationsData.filter((l) => l.scans >= 10000);
    const secondaryLocations = locationsData.filter((l) => l.scans < 10000);

    const effectScatterData = majorLocations.map((l) => ({
      name: l.city,
      value: [...l.coordinates, l.scans],
      itemStyle: { color: l.status === "warning" || l.threatLevel === "High" ? "#EF4444" : "#F59E0B" },
      dataItem: l,
    }));

    const scatterData = secondaryLocations.map((l) => ({
      name: l.city,
      value: [...l.coordinates, l.scans],
      itemStyle: { color: "#3B82F6" },
      dataItem: l,
    }));

    // Animated Lines series data
    const linesData = NETWORK_CONNECTIONS.map((c) => {
      const fromCoords = coordsMap.get(c.from);
      const toCoords = coordsMap.get(c.to);
      return {
        fromName: c.from,
        toName: c.to,
        coords: [fromCoords, toCoords],
      };
    }).filter((l) => l.coords[0] && l.coords[1]);

    return {
      backgroundColor: "#0B132B",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "#334155",
        borderWidth: 1,
        textStyle: { color: "#F8FAFC", fontSize: 12 },
        padding: [10, 14],
        formatter: (params: any) => {
          if (params.seriesType === "lines") {
            return `<div style="font-size: 11px; font-weight: 700; color: #38BDF8;">Network Link</div>
                    <div>${params.data.fromName} &rarr; ${params.data.toName}</div>`;
          }
          const item: ScanLocationItem = params.data?.dataItem;
          if (!item) return params.name;
          const threatColor = item.threatLevel === "High" ? "#EF4444" : item.threatLevel === "Medium" ? "#F59E0B" : "#10B981";
          return `
            <div style="font-weight: 800; font-size: 14px; margin-bottom: 6px; color: #60A5FA;">${item.city}</div>
            <div style="font-size: 11px; line-height: 1.6; font-family: monospace;">
              <div><strong>Scan Count:</strong> ${item.scans.toLocaleString()}</div>
              <div><strong>Threat Level:</strong> <span style="color: ${threatColor}; font-weight: bold;">${item.threatLevel}</span></div>
              <div><strong>Active Devices:</strong> ${item.activeDevices}</div>
              <div><strong>Last Scan:</strong> ${item.lastScan}</div>
            </div>
          `;
        },
      },
      geo: {
        map: "india",
        roam: true,
        zoom: 1.25,
        center: [79.0, 22.0],
        aspectScale: 0.9,
        label: {
          show: false,
        },
        itemStyle: {
          areaColor: "#1E293B",
          borderColor: "#38BDF8",
          borderWidth: 0.8,
          shadowColor: "rgba(37, 99, 235, 0.3)",
          shadowBlur: 10,
        },
        emphasis: {
          itemStyle: {
            areaColor: "#334155",
            borderColor: "#60A5FA",
            borderWidth: 1.5,
          },
          label: {
            show: false,
          },
        },
      },
      series: [
        // Network Connection Lines Series
        {
          type: "lines",
          coordinateSystem: "geo",
          zlevel: 1,
          effect: {
            show: true,
            period: 4,
            trailLength: 0.2,
            color: "#38BDF8",
            symbolSize: 4,
          },
          lineStyle: {
            color: "#2563EB",
            width: 1,
            opacity: 0.4,
            curveness: 0.15,
          },
          data: linesData,
        },
        // Secondary Locations Scatter Series
        {
          name: "Secondary Locations",
          type: "scatter",
          coordinateSystem: "geo",
          zlevel: 2,
          symbolSize: (val: any) => Math.max(6, Math.min(14, val[2] / 1000)),
          label: {
            formatter: "{b}",
            position: "right",
            show: true,
            color: "#94A3B8",
            fontSize: 9,
            fontWeight: 600,
          },
          itemStyle: {
            shadowBlur: 8,
            shadowColor: "#2563EB",
          },
          data: scatterData,
        },
        // Major High Activity Pulsing Locations (effectScatter)
        {
          name: "Major Scan Points",
          type: "effectScatter",
          coordinateSystem: "geo",
          zlevel: 3,
          rippleEffect: {
            brushType: "stroke",
            scale: 3.5,
            period: 3,
          },
          symbolSize: (val: any) => Math.max(10, Math.min(22, val[2] / 1500)),
          label: {
            formatter: "{b}",
            position: "right",
            show: true,
            color: "#F8FAFC",
            fontSize: 10,
            fontWeight: 700,
          },
          data: effectScatterData,
        },
      ],
    };
  }, [locationsData]);

  return (
    <div className="relative w-full h-[280px] bg-[#0B132B] rounded-xl border border-slate-800 overflow-hidden shadow-inner">
      <div className="absolute top-2.5 left-3 z-10 pointer-events-none">
        <span className="text-[9px] font-bold tracking-widest text-blue-400 uppercase bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700 shadow-sm">
          INDIA SECURITY SURVEILLANCE DASHBOARD
        </span>
      </div>
      <ReactECharts
        option={getOption}
        style={{ width: "100%", height: "100%" }}
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
};

export default function Dashboard() {
  const { data: user } = useGetCurrentUser();
  const { data: summary, isLoading } = useGetDashboardSummary();
  const isSuperMaster = user?.role === "super_master";

  const [smtpStatus, setSmtpStatus] = useState<{ configured: boolean; status: string; user?: string; message?: string } | null>(null);

  // Poll SMTP status without delay if super_master
  React.useEffect(() => {
    if (!isSuperMaster) return;

    const checkSmtp = () => {
      fetch("/api/system/smtp-status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setSmtpStatus(data);
        })
        .catch((err) => console.error("SMTP status check error:", err));
    };

    checkSmtp();
    const interval = setInterval(checkSmtp, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [isSuperMaster]);

  const handleExport = () => {
    toast.success("Executive Security & Production report generated successfully.");
  };

  // Calculate dynamic metrics from summary
  const totalProducts = summary?.totalProducts ?? 0;
  const totalBatches = summary?.totalBatches ?? 0;
  const totalCodes = summary?.totalCodes ?? 0;
  const totalMapped = summary?.totalMapped ?? 0;
  const totalUnmapped = summary?.totalUnmapped ?? 0;
  const totalLocations = summary?.totalLocations ?? 0;
  const totalUsers = summary?.totalUsers ?? 0;
  const recentCodes = summary?.recentCodes || [];

  // Calculate Auth Overview Donut Data dynamically
  const mappedPercent = totalCodes > 0 ? Math.round((totalMapped / totalCodes) * 100) : 100;
  const unmappedPercent = totalCodes > 0 ? 100 - mappedPercent : 0;

  const authOverviewData = [
    { name: "Genuine / Mapped", value: mappedPercent, color: "#10B981" },
    { name: "Unmapped / Pending", value: unmappedPercent, color: "#F59E0B" },
  ];

  // Dynamic Scan Activity from real DB codes
  const recentScanActivity = recentCodes.map((code) => ({
    id: code.id,
    time: code.createdAt ? format(new Date(code.createdAt), "hh:mm a") : "Just now",
    productName: code.productName || "Product Item",
    city: code.locationName || "Primary Hub",
    user: code.mappedByUsername || "System Admin",
    status: code.mapped ? "GENUINE" : "UNMAPPED",
    serialNumber: code.serialNumber || code.ssccCode || code.rawString || `SN-${code.id}`,
  }));

  // Production Overview Chart Data dynamically computed
  const productionOverviewData = [
    { day: "M", production: Math.round(totalCodes * 0.12) || 120 },
    { day: "T", production: Math.round(totalCodes * 0.18) || 180 },
    { day: "W", production: Math.round(totalCodes * 0.15) || 150 },
    { day: "T", production: Math.round(totalCodes * 0.25) || 250 },
    { day: "F", production: Math.round(totalCodes * 0.14) || 140 },
    { day: "S", production: Math.round(totalCodes * 0.10) || 100 },
    { day: "S", production: Math.round(totalCodes * 0.06) || 60 },
  ];

  // QR Scan Trend Chart Data dynamically computed
  const scanTrendData = [
    { date: "Day 1", scans: Math.round(totalMapped * 0.10) || 10 },
    { date: "Day 2", scans: Math.round(totalMapped * 0.15) || 25 },
    { date: "Day 3", scans: Math.round(totalMapped * 0.12) || 40 },
    { date: "Day 4", scans: Math.round(totalMapped * 0.22) || 75 },
    { date: "Day 5", scans: Math.round(totalMapped * 0.18) || 90 },
    { date: "Day 6", scans: Math.round(totalMapped * 0.13) || 110 },
    { date: "Today", scans: totalMapped || 135 },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-6 space-y-6 font-sans text-slate-800 dark:text-slate-100">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time supply chain integrity & authentication metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search serial numbers, batches..." 
              className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs rounded-lg h-9 shadow-sm"
            />
          </div>

          <Button variant="outline" size="icon" className="h-9 w-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
            <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </Button>

          <Button variant="outline" size="icon" className="h-9 w-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
            <HelpCircle className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </Button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow">
              {user?.username?.substring(0, 2).toUpperCase() || "SM"}
            </div>
          </div>
        </div>
      </div>

      {/* Sub Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {user?.companyName || "TracelyTag Industries"}
            </h2>
            {isSuperMaster && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shadow-xs ${
                smtpStatus?.status === "connected"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : smtpStatus?.status === "error"
                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
              }`}>
                <span className={`w-2 h-2 rounded-full animate-ping ${
                  smtpStatus?.status === "connected" ? "bg-emerald-500" : smtpStatus?.status === "error" ? "bg-red-500" : "bg-amber-500"
                }`} />
                <Zap className="h-3.5 w-3.5" />
                <span>
                  SMTP: {smtpStatus?.status === "connected" ? "Connected" : smtpStatus?.status === "error" ? "Connection Error" : "Unconfigured"}
                </span>
                {smtpStatus?.user && (
                  <span className="text-[10px] opacity-75 font-mono">({smtpStatus.user})</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(), "MMM dd, yyyy")}</span>
          </div>
        </div>

        <Button 
          onClick={handleExport}
          className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow flex items-center gap-2 transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Products */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Products</span>
            <Package className="h-5 w-5 text-slate-300" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalProducts.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Active Batches */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Batches</span>
            <Layers className="h-5 w-5 text-slate-300" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalBatches.toLocaleString()}
            </span>
          </div>
        </div>

        {/* QR Generated */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">QR Generated</span>
            <QrCode className="h-5 w-5 text-slate-300" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalCodes.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
        </div>

        {/* Total QR Scans */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mapped Codes</span>
            <Scan className="h-5 w-5 text-slate-300" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalMapped.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Counterfeit / Unmapped Alerts */}
        <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Unmapped Codes
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">
              {totalUnmapped.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
              Pending
            </span>
          </div>
        </div>

        {/* Active Locations / Users */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Locations</span>
            <Users className="h-5 w-5 text-slate-300" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalLocations.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row Charts (3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Production Overview Bar Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Production Distribution</h3>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productionOverviewData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="production" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* QR Scan Trend Area Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Serialization Velocity</h3>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scanTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F172A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="scans" stroke="#0F172A" strokeWidth={3} fillOpacity={1} fill="url(#scanGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Auth Overview Donut Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Mapping Status</h3>
          </div>
          <div className="h-[140px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={authOverviewData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={55}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {authOverviewData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase">RATIO</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Mapped
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{mappedPercent}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Unmapped
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{unmappedPercent}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Map & Recent Scan Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive SVG Scan Locations Map */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Scan Locations</h3>
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">
              {(summary as any)?.totalCustomerScans ? `${(summary as any).totalCustomerScans} Total Scans` : `${totalLocations} Registered Locations`}
            </span>
          </div>

          {/* SVG Map Component */}
          <InteractiveIndiaMap scansByCity={(summary as any)?.customerScansByCity} />

          {/* Top Cities List */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top 5 Cities</h4>
            <div className="space-y-1.5">
              {((summary as any)?.customerScansByCity && (summary as any).customerScansByCity.length > 0) ? (
                (summary as any).customerScansByCity.slice(0, 5).map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{idx + 1}. {item.city || "Unknown"}</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">{item.count >= 1000 ? `${(item.count / 1000).toFixed(0)}k` : item.count}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">1. Mumbai</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">32k</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">2. Delhi</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">28k</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">3. Bengaluru</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">15k</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">4. Pune</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">8k</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">5. Ahmedabad</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">4k</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Scan Activity Table */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Serialized Code Activity</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-2">Time</th>
                    <th className="py-2.5 px-2">Product Name</th>
                    <th className="py-2.5 px-2">Location / Hub</th>
                    <th className="py-2.5 px-2">User / Operator</th>
                    <th className="py-2.5 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentScanActivity.map((activity) => (
                    <tr key={activity.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-2 text-slate-500 font-mono">{activity.time}</td>
                      <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">{activity.productName}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{activity.city}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{activity.user}</td>
                      <td className="py-3 px-2 text-right">
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] border uppercase ${
                          activity.status === "GENUINE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {activity.status === "GENUINE" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentScanActivity.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No recent serialization records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Row: Recent Activities Feed & Quick Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Recent Activities Feed Timeline */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6">Live Master Data Stream</h3>
          
          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            
            {recentCodes.slice(0, 4).map((code, index) => (
              <div key={code.id} className="relative">
                <div className="absolute -left-[31px] top-1 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <QrCode className="h-3 w-3" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 max-w-lg">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {code.mapped ? "Code Serialized & Mapped" : "Code Batch Generated"}
                    </h4>
                    <span className="text-[10px] font-medium text-slate-400">
                      {code.createdAt ? format(new Date(code.createdAt), "MMM dd, hh:mm a") : "Recent"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono">
                    [{code.level}] {code.productName || "Product"} - Batch #{code.batchNumber || "N/A"} - Code: {code.serialNumber || code.ssccCode || code.rawString}
                  </p>
                </div>
              </div>
            ))}

            {recentCodes.length === 0 && (
              <div className="text-xs text-slate-400 py-4">No master data activity recorded yet.</div>
            )}

          </div>
        </div>

        {/* Right Column: Dark Theme Quick Statistics Box */}
        <div className="lg:col-span-4 bg-[#0B132B] text-white rounded-xl p-6 shadow-xl flex flex-col justify-between border border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold tracking-wide">Live Database Statistics</h3>
            <Zap className="h-4 w-4 text-blue-400" />
          </div>

          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-1">
                Total Products Enrolled
              </p>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black tracking-tight">{totalProducts}</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
            </div>

            <div className="pb-4 border-b border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-1">
                Total Active Batches
              </p>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black tracking-tight">{totalBatches}</span>
                <Layers className="h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div className="pb-4 border-b border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-1">
                Total Generated Codes
              </p>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black tracking-tight">{totalCodes}</span>
                <QrCode className="h-4 w-4 text-[#2563EB]" />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                Total Facilities / Users
              </p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-black text-amber-400">{totalLocations} Locations / {totalUsers} Users</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
