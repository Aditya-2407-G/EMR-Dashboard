import React, { useState } from "react";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { KPICards } from "@/components/dashboard/KPICards";
import { MemoryUsageChart } from "@/components/dashboard/charts/MemoryUsageChart";
import { ClusterDistributionChart } from "@/components/dashboard/charts/ClusterDistributionChart";
import { YarnMemoryChart } from "@/components/dashboard/charts/YarnMemoryChart";
import { CapacityUsageChart } from "@/components/dashboard/charts/CapacityUsageChart";
import { RuntimeAnalysisChart } from "@/components/dashboard/charts/RuntimeAnalysisChart";
import { ClusterTable } from "@/components/dashboard/ClusterTable";
import { DrillDownModal } from "@/components/dashboard/DrillDownModal";
import { useEmrData } from "@/hooks/useEmrData";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { clusters, analytics, isLoading, refetch, clearData } = useEmrData();
  const [filteredClusters, setFilteredClusters] = useState<typeof clusters>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedClusterName, setSelectedClusterName] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ type: string; value: string } | null>(null);
  const { toast } = useToast();

  // Update filtered clusters when main clusters data changes
  React.useEffect(() => {
    setFilteredClusters(clusters);
  }, [clusters]);

  const handleFilterChange = (filters: {
    clusterName?: string;
    state?: string;
    searchTerm?: string;
  }) => {
    let filtered = [...clusters];

    // Apply active chart filter first
    if (activeFilter) {
      if (activeFilter.type === 'clusterName') {
        filtered = filtered.filter(cluster => cluster.clusterName === activeFilter.value);
      }
    }

    if (filters.clusterName) {
      filtered = filtered.filter(cluster => cluster.clusterName === filters.clusterName);
    }

    if (filters.state) {
      filtered = filtered.filter(cluster => cluster.state === filters.state);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(cluster => 
        cluster.clusterName.toLowerCase().includes(searchLower) ||
        cluster.clusterId.toLowerCase().includes(searchLower)
      );
    }

    setFilteredClusters(filtered);
  };

  const handleChartFilter = (type: string, value: string) => {
    // Prevent update if same filter is applied
    if (activeFilter?.type === type && activeFilter?.value === value) return;
    
    const newFilter = { type, value };
    setActiveFilter(newFilter);
    
    if (type === 'clusterName') {
      setSelectedClusterName(value);
      // Use the original clusters array for filtering
      const clusterData = clusters.filter(c => c.clusterName === value);
      setFilteredClusters(clusterData);
    }
    
    toast({
      title: `Filtered by ${type}`,
      description: `Showing data for: ${value}`,
    });
  };

  const clearFilters = () => {
    setActiveFilter(null);
    setSelectedClusterName(null);
    setFilteredClusters(clusters);
    toast({
      title: "Filters cleared",
      description: "Showing all cluster data",
    });
  };

  const handleExportDashboard = () => {
    // Create CSV export of current data
    if (filteredClusters.length === 0) {
      toast({
        title: "No data to export",
        description: "Please upload data first or adjust your filters.",
        variant: "destructive",
      });
      return;
    }

    const csvHeader = [
      "Cluster Name", "Cluster ID", "State", "Creation Date", "End Date",
      "Memory Usage %", "YARN Available %", "Runtime Hours", "Capacity Remaining GB"
    ].join(",");

    const csvRows = filteredClusters.map(cluster => {
      const memoryUsage = (cluster.maxMemoryTotalMB && cluster.maxMemoryTotalMB > 0) 
        ? ((cluster.maxMemoryAllocatedMB || 0) / cluster.maxMemoryTotalMB) * 100 
        : 0;
      
      const runtimeHours = cluster.endDateTime 
        ? Math.abs(new Date(cluster.endDateTime).getTime() - new Date(cluster.creationDateTime).getTime()) / (1000 * 60 * 60)
        : 0;

      return [
        `"${cluster.clusterName}"`,
        `"${cluster.clusterId}"`,
        `"${cluster.state}"`,
        `"${cluster.creationDateTime}"`,
        `"${cluster.endDateTime || ''}"`,
        memoryUsage.toFixed(2),
        cluster.minYARNMemoryAvailablePercentage,
        runtimeHours.toFixed(2),
        cluster.minCapacityRemainingGB
      ].join(",");
    });

    const csvContent = [csvHeader, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `emr-dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export completed",
      description: `Exported ${filteredClusters.length} clusters to CSV.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">EMR Cluster Analytics</h1>
                <p className="text-sm text-slate-600">Real-time performance monitoring & insights</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <FileUpload onUploadSuccess={refetch} />
              <Button
                onClick={handleExportDashboard}
                variant="outline"
                className="inline-flex items-center"
                data-testid="button-export"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Dashboard
              </Button>
              {activeFilter && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  data-testid="button-clear-filter"
                >
                  Clear Filter: {activeFilter.value}
                </Button>
              )}
              <Button
                onClick={() => {
                  // Clear all uploaded data
                  clearData();
                  setActiveFilter(null);
                  setSelectedClusterName(null);
                  toast({
                    title: "Data cleared",
                    description: "All cluster data has been removed.",
                  });
                }}
                variant="outline"
                size="sm"
                disabled={isLoading || clusters.length === 0}
                data-testid="button-clear-data"
                title="Clear all data"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
              <Button
                onClick={() => {
                  // Refresh/clear errors
                  refetch();
                  setActiveFilter(null);
                  setSelectedClusterName(null);
                }}
                variant="outline"
                size="sm"
                disabled={isLoading}
                data-testid="button-refresh"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards */}
        <KPICards 
          analytics={analytics} 
          isLoading={isLoading} 
          filteredClusters={filteredClusters}
          activeFilter={activeFilter}
        />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-2">
            <MemoryUsageChart 
              clusters={filteredClusters} 
              onDataPointClick={(clusterId) => setSelectedClusterId(clusterId)}
            />
          </div>
          
          <ClusterDistributionChart 
            clusters={clusters} 
            onSegmentClick={(clusterName) => handleChartFilter('clusterName', clusterName)}
            selectedClusterName={selectedClusterName}
          />
          
          <YarnMemoryChart 
            clusters={filteredClusters}
            onDataPointClick={(clusterId) => setSelectedClusterId(clusterId)}
          />
          
          <CapacityUsageChart 
            clusters={filteredClusters}
            onDataPointClick={(clusterId) => setSelectedClusterId(clusterId)}
          />
          
          <RuntimeAnalysisChart 
            clusters={filteredClusters}
            onBarClick={(clusterName) => handleChartFilter('clusterName', clusterName)}
            selectedClusterName={selectedClusterName}
          />
        </div>

        {/* Detailed Table */}
        <ClusterTable 
          clusters={filteredClusters}
          onFilterChange={handleFilterChange}
          onRowClick={(clusterId) => setSelectedClusterId(clusterId)}
        />
      </main>

      {/* Drill-down Modal */}
      <DrillDownModal
        clusterId={selectedClusterId}
        onClose={() => setSelectedClusterId(null)}
        allClusters={clusters}
      />
    </div>
  );
}