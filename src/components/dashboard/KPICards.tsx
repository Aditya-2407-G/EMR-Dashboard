import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building, Gauge, Clock, Database, Activity } from "lucide-react";

interface FilteredMetrics {
  avgMemoryUsagePercent: number;
  avgYARNMemoryAvailablePercent: number;
  avgRuntimeHours: number;
  avgRemainingCapacityGB: number;
  clusterCount: number;
}

interface KPICardsProps {
  analytics: {
    totalClusters: number;
    avgMemoryUsage: number;
    totalRuntimeHours: number;
    totalRemainingCapacityGB: number;  // Fixed: corrected from misleading "capacityUsed"
    activeClusters: number;
  } | undefined;
  filteredMetrics?: FilteredMetrics;
  isLoading: boolean;
  filteredClusters?: any[];
  activeFilter?: { type: string; value: string } | null;
  dateFilterActive?: boolean;
}

export function KPICards({ 
  analytics, 
  filteredMetrics, 
  isLoading,
  dateFilterActive = false 
}: KPICardsProps) {
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  
  // Use filtered metrics if available, otherwise fall back to analytics
  const displayMetrics = filteredMetrics || {
    avgMemoryUsagePercent: analytics?.avgMemoryUsage || 0,
    avgYARNMemoryAvailablePercent: 0, // Not available in original analytics
    avgRuntimeHours: analytics ? analytics.totalRuntimeHours / Math.max(analytics.totalClusters, 1) : 0,
    avgRemainingCapacityGB: analytics?.totalRemainingCapacityGB || 0,  // Fixed: updated field name
    clusterCount: analytics?.totalClusters || 0
  };

  if (isLoading || !analytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="metric-card">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiData = [
    {
      title: "Avg Memory Usage %",
      value: `${displayMetrics.avgMemoryUsagePercent.toFixed(1)}%`,
      icon: Gauge,
      change: displayMetrics.avgMemoryUsagePercent > 80 ? "High" : displayMetrics.avgMemoryUsagePercent > 50 ? "Medium" : "Low",
      changeLabel: "utilization level",
      changeType: displayMetrics.avgMemoryUsagePercent > 80 ? "negative" : "positive" as const,
      color: "emerald",
      key: "memory"
    },
    {
      title: "Avg YARN Avail %", 
      value: `${displayMetrics.avgYARNMemoryAvailablePercent.toFixed(1)}%`,
      icon: Activity,
      change: displayMetrics.avgYARNMemoryAvailablePercent > 50 ? "Healthy" : displayMetrics.avgYARNMemoryAvailablePercent > 20 ? "Moderate" : "Low",
      changeLabel: "availability status",
      changeType: displayMetrics.avgYARNMemoryAvailablePercent > 20 ? "positive" : "negative" as const,
      color: "blue",
      key: "yarn"
    },
    {
      title: "Avg Runtime Hours",
      value: `${displayMetrics.avgRuntimeHours.toFixed(1)}h`,
      icon: Clock,
      change: `${displayMetrics.clusterCount} clusters`,
      changeLabel: "in period",
      changeType: "neutral" as const,
      color: "purple",
      key: "runtime"
    },
    {
      title: "Avg Remaining Capacity GB",
      value: `${displayMetrics.avgRemainingCapacityGB.toFixed(0)}GB`,
      icon: Database,
      change: displayMetrics.avgRemainingCapacityGB > 500 ? "Abundant" : displayMetrics.avgRemainingCapacityGB > 200 ? "Adequate" : "Limited",
      changeLabel: "capacity status",
      changeType: displayMetrics.avgRemainingCapacityGB > 200 ? "positive" : "negative" as const,
      color: "rose",
      key: "capacity"
    },
    {
      title: "Cluster Count",
      value: displayMetrics.clusterCount.toString(),
      icon: Building,
      change: dateFilterActive ? "Filtered" : "Total",
      changeLabel: "clusters shown",
      changeType: "neutral" as const,
      color: "cyan",
      key: "count"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {kpiData.map((kpi, index) => (
        <Card 
          key={index} 
          className="metric-card bg-white shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer" 
          data-testid={`kpi-card-${index}`}
          onClick={() => setShowDetailModal(kpi.title)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{kpi.title}</p>
                <p className="text-3xl font-bold text-slate-900" data-testid={`kpi-value-${index}`}>{kpi.value}</p>
              </div>
              <div className={`w-12 h-12 bg-${kpi.color}-100 rounded-lg flex items-center justify-center`}>
                <kpi.icon className={`w-6 h-6 text-${kpi.color}-600`} />
              </div>
            </div>
            <div className="mt-2 flex items-center">
              <span className={`text-sm font-medium ${
                kpi.changeType === 'positive' ? 'text-green-600' : 'text-blue-600'
              }`}>
                {kpi.change}
              </span>
              <span className="text-sm text-slate-500 ml-1">{kpi.changeLabel}</span>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* KPI Detail Modal */}
      <Dialog open={!!showDetailModal} onOpenChange={() => setShowDetailModal(null)}>
        <DialogContent className="max-w-md" aria-describedby="kpi-details">
          <DialogHeader>
            <DialogTitle>{showDetailModal} Details</DialogTitle>
            <div id="kpi-details" className="sr-only">
              Detailed breakdown and analysis of the selected KPI metric
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {showDetailModal === 'Avg Memory Usage %' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Current Average: <span className="font-medium">{displayMetrics.avgMemoryUsagePercent.toFixed(1)}%</span></p>
                {dateFilterActive ? (
                  <p className="text-sm text-slate-600">Time Period: <span className="font-medium">Filtered data</span></p>
                ) : (
                  <p className="text-sm text-slate-600">All available data displayed</p>
                )}
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <p className="text-xs text-emerald-800">📊 Average memory utilization calculated from MaxMemoryAllocated/MaxMemoryTotal across clusters</p>
                </div>
              </div>
            )}
            {showDetailModal === 'Avg YARN Avail %' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Current Average: <span className="font-medium">{displayMetrics.avgYARNMemoryAvailablePercent.toFixed(1)}%</span></p>
                <p className="text-sm text-slate-600">Status: <span className="font-medium">
                  {displayMetrics.avgYARNMemoryAvailablePercent > 50 ? "Healthy" : 
                   displayMetrics.avgYARNMemoryAvailablePercent > 20 ? "Moderate" : "Critical"}
                </span></p>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-800">🧮 YARN memory availability indicates remaining capacity for new applications</p>
                </div>
              </div>
            )}
            {showDetailModal === 'Avg Runtime Hours' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Average Runtime: <span className="font-medium">{displayMetrics.avgRuntimeHours.toFixed(1)} hours</span></p>
                <p className="text-sm text-slate-600">Cluster Count: <span className="font-medium">{displayMetrics.clusterCount} clusters</span></p>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-purple-800">⏱️ Average runtime calculated from cluster creation to termination across the selected period</p>
                </div>
              </div>
            )}
            {showDetailModal === 'Avg Remaining Capacity GB' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Average Capacity: <span className="font-medium">{displayMetrics.avgRemainingCapacityGB.toFixed(1)} GB</span></p>
                <p className="text-sm text-slate-600">Status: <span className="font-medium">
                  {displayMetrics.avgRemainingCapacityGB > 500 ? "Abundant" : 
                   displayMetrics.avgRemainingCapacityGB > 200 ? "Adequate" : "Limited"}
                </span></p>
                <div className="bg-rose-50 p-3 rounded-lg">
                  <p className="text-xs text-rose-800">💾 Average remaining storage capacity across clusters in the selected period</p>
                </div>
              </div>
            )}
            {showDetailModal === 'Cluster Count' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Cluster Count: <span className="font-medium">{displayMetrics.clusterCount} clusters</span></p>
                {dateFilterActive ? (
                  <p className="text-sm text-slate-600">View: <span className="font-medium">Filtered by date range</span></p>
                ) : (
                  <p className="text-sm text-slate-600">View: <span className="font-medium">All clusters</span></p>
                )}
                <div className="bg-cyan-50 p-3 rounded-lg">
                  <p className="text-xs text-cyan-800">🏗️ Total number of clusters in the selected time period or filter</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
