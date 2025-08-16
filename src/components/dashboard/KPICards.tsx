import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building, Gauge, Clock, Database, Zap } from "lucide-react";

interface KPICardsProps {
  analytics: {
    totalClusters: number;
    avgMemoryUsage: number;
    totalRuntimeHours: number;
    capacityUsed: number;
    activeClusters: number;
  } | undefined;
  isLoading: boolean;
  filteredClusters?: any[];
  activeFilter?: { type: string; value: string } | null;
}

export function KPICards({ analytics, isLoading, filteredClusters = [], activeFilter }: KPICardsProps) {
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
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
      title: "Total Clusters",
      value: analytics.totalClusters.toString(),
      icon: Building,
      change: "+12%",
      changeLabel: "vs last period",
      changeType: "positive" as const,
      color: "blue",
    },
    {
      title: "Avg Memory Usage",
      value: `${analytics.avgMemoryUsage.toFixed(1)}%`,
      icon: Gauge,
      change: "-5%",
      changeLabel: "from peak",
      changeType: "neutral" as const,
      color: "emerald",
    },
    {
      title: "Runtime Hours",
      value: `${Math.round(analytics.totalRuntimeHours)}h`,
      icon: Clock,
      change: "24.5h",
      changeLabel: "avg per cluster",
      changeType: "neutral" as const,
      color: "purple",
    },
    {
      title: "Capacity Used",
      value: `${analytics.capacityUsed.toFixed(0)}GB`,
      icon: Database,
      change: "85%",
      changeLabel: "efficiency",
      changeType: "positive" as const,
      color: "rose",
    },
    {
      title: "Active Clusters",
      value: analytics.activeClusters.toString(),
      icon: Zap,
      change: "98.5%",
      changeLabel: "uptime",
      changeType: "positive" as const,
      color: "cyan",
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
            {showDetailModal === 'Total Clusters' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Current Status: <span className="font-medium">{analytics?.totalClusters || 0} clusters loaded</span></p>
                {activeFilter ? (
                  <p className="text-sm text-slate-600">Filtered View: <span className="font-medium">{filteredClusters.length} clusters ({activeFilter.value})</span></p>
                ) : (
                  <p className="text-sm text-slate-600">All clusters are currently displayed</p>
                )}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-800">💡 Tip: Click on chart segments to filter data by specific clusters</p>
                </div>
              </div>
            )}
            {showDetailModal === 'Avg Memory Usage' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Current Average: <span className="font-medium">{analytics?.avgMemoryUsage.toFixed(1)}%</span></p>
                {activeFilter && filteredClusters.length > 0 && (
                  <p className="text-sm text-slate-600">For {activeFilter.value}: Processing filtered data...</p>
                )}
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <p className="text-xs text-emerald-800">📊 This represents the average memory utilization across all clusters</p>
                </div>
              </div>
            )}
            {showDetailModal === 'Runtime Hours' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Total Runtime: <span className="font-medium">{Math.round(analytics?.totalRuntimeHours || 0)} hours</span></p>
                <p className="text-sm text-slate-600">Average per Cluster: <span className="font-medium">{analytics?.totalClusters ? (analytics.totalRuntimeHours / analytics.totalClusters).toFixed(1) : 0} hours</span></p>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-purple-800">⏱️ Runtime is calculated from cluster creation to termination time</p>
                </div>
              </div>
            )}
            {showDetailModal === 'Capacity Used' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Total Capacity: <span className="font-medium">{analytics?.capacityUsed.toFixed(1)} GB</span></p>
                <p className="text-sm text-slate-600">Efficiency Rate: <span className="font-medium">85%</span></p>
                <div className="bg-rose-50 p-3 rounded-lg">
                  <p className="text-xs text-rose-800">💾 Represents total allocated memory across all cluster instances</p>
                </div>
              </div>
            )}
            {showDetailModal === 'Active Clusters' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Currently Active: <span className="font-medium">{analytics?.activeClusters || 0}</span></p>
                <p className="text-sm text-slate-600">Total Processed: <span className="font-medium">{analytics?.totalClusters || 0}</span></p>
                <div className="bg-cyan-50 p-3 rounded-lg">
                  <p className="text-xs text-cyan-800">⚡ Active clusters are those currently in RUNNING state</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
