import React, { useState, useMemo } from "react";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { KPICards } from "@/components/dashboard/KPICards";
import { DateRangeFilter, type DateFilterOption } from "@/components/dashboard/DateRangeFilter";
import { MetricsChartGrid } from "@/components/dashboard/charts/MetricsTimeSeriesChart";
import { ClusterCountChart } from "@/components/dashboard/charts/ClusterCountChart";
import { MemoryUsageChart } from "@/components/dashboard/charts/MemoryUsageChart";
import { ClusterDistributionChart } from "@/components/dashboard/charts/ClusterDistributionChart";
import { YarnMemoryChart } from "@/components/dashboard/charts/YarnMemoryChart";
import { CapacityUsageChart } from "@/components/dashboard/charts/CapacityUsageChart";
import { RuntimeAnalysisChart } from "@/components/dashboard/charts/RuntimeAnalysisChart";
import { ClusterTable } from "@/components/dashboard/ClusterTable";
import { DrillDownModal } from "@/components/dashboard/DrillDownModal";
import { useEmrData } from "@/hooks/useEmrData";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, RefreshCw, Trash2, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  calculateDailyKPIMetrics, 
  calculateWeeklyKPIMetrics, 
  type DateFilterOptions 
} from "@/lib/data-processing";

export default function Dashboard() {
  const { 
    clusters, 
    analytics, 
    isLoading, 
    refetch, 
    clearData,
    getFilteredKPIMetrics,
    getDataDateRange,
    getRawClusterData
  } = useEmrData();
  
  const [filteredClusters, setFilteredClusters] = useState<typeof clusters>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedClusterName, setSelectedClusterName] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ type: string; value: string } | null>(null);
  // Set default to daily view
  const [dateFilter, setDateFilter] = useState<DateFilterOption | null>(() => {
    const today = new Date();
    return {
      type: 'daily',
      label: 'Daily View',
      range: {
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      },
      description: 'Last 30 days - Daily aggregation'
    };
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics'>('overview');
  const { toast } = useToast();

  // Update filtered clusters when main clusters data changes
  React.useEffect(() => {
    setFilteredClusters(clusters);
  }, [clusters]);

  // Check if current date filter is the default daily view
  const isDefaultDailyView = (filter: DateFilterOption | null): boolean => {
    if (!filter || filter.type !== 'daily') return false;
    
    // Consider it default if it's daily view with ~30 days range
    const rangeDays = Math.ceil((filter.range.endDate.getTime() - filter.range.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return rangeDays >= 28 && rangeDays <= 32; // Allow some flexibility for month boundaries
  };

  // Calculate filtered metrics based on date filter
  const filteredMetrics = useMemo(() => {
    if (!dateFilter || clusters.length === 0) return undefined;
    
    const dateFilterOptions: DateFilterOptions = {
      type: dateFilter.type,
      startDate: dateFilter.range.startDate,
      endDate: dateFilter.range.endDate
    };
    
    return getFilteredKPIMetrics(dateFilterOptions);
  }, [dateFilter, getFilteredKPIMetrics, clusters.length]);

  // Calculate time series data for charts
  const timeSeriesData = useMemo(() => {
    if (!dateFilter || clusters.length === 0) return [];
    
    const rawData = getRawClusterData();
    const dateFilterOptions: DateFilterOptions = {
      type: dateFilter.type,
      startDate: dateFilter.range.startDate,
      endDate: dateFilter.range.endDate
    };
    
    // Normalize the data format to always have 'date' property
    if (dateFilter.type === 'weekly') {
      const weeklyData = calculateWeeklyKPIMetrics(rawData, dateFilterOptions);
      return weeklyData.map(item => ({
        date: item.week,
        avgMemoryUsagePercent: item.avgMemoryUsagePercent,
        avgYARNMemoryAvailablePercent: item.avgYARNMemoryAvailablePercent,
        avgRuntimeHours: item.avgRuntimeHours,
        avgRemainingCapacityGB: item.avgRemainingCapacityGB,
        clusterCount: item.clusterCount
      }));
    } else {
      return calculateDailyKPIMetrics(rawData, dateFilterOptions);
    }
  }, [dateFilter, getRawClusterData, clusters.length]);

  // Calculate cluster breakdown for the cluster count chart
  const clusterBreakdown = useMemo(() => {
    if (!dateFilter || clusters.length === 0) return [];
    
    const clusterCounts = new Map<string, number>();
    filteredClusters.forEach(cluster => {
      clusterCounts.set(cluster.clusterName, (clusterCounts.get(cluster.clusterName) || 0) + 1);
    });
    
    const total = Array.from(clusterCounts.values()).reduce((sum, count) => sum + count, 0);
    
    return Array.from(clusterCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }, [dateFilter, filteredClusters]);

  // Get available data date range
  const dataDateRange = useMemo(() => {
    return getDataDateRange();
  }, [getDataDateRange]);

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
    // Reset to default daily view instead of null
    const today = new Date();
    const defaultDailyFilter: DateFilterOption = {
      type: 'daily',
      label: 'Daily View',
      range: {
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      },
      description: 'Last 30 days - Daily aggregation'
    };
    setDateFilter(defaultDailyFilter);
    setFilteredClusters(clusters);
    toast({
      title: "Filters cleared", 
      description: "Reset to daily view with all cluster data",
    });
  };

  // Handle date filter changes
  const handleDateFilterChange = (filter: DateFilterOption) => {
    setDateFilter(filter);
    toast({
      title: "Date filter applied",
      description: `Showing ${filter.label}: ${filter.description}`,
    });
  };

  // Handle metric chart interactions
  const handleMetricDataPointClick = (metric: string, date: string, value: number) => {
    toast({
      title: "Data point selected",
      description: `${metric} on ${date}: ${value}`,
    });
  };

  // Handle cluster name clicks from charts
  const handleClusterClick = (clusterName: string) => {
    setSelectedClusterName(clusterName);
    const clusterData = clusters.filter(c => c.clusterName === clusterName);
    setFilteredClusters(clusterData);
    setActiveFilter({ type: 'clusterName', value: clusterName });
    toast({
      title: `Filtered by cluster`,
      description: `Showing data for: ${clusterName}`,
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
      // Improved memory usage calculation with validation
      let memoryUsage = 0;
      try {
        const totalMB = cluster.maxMemoryTotalMB || 0;
        const allocatedMB = cluster.maxMemoryAllocatedMB || 0;
        
        if (totalMB > 0) {
          if (allocatedMB <= totalMB) {
            memoryUsage = (allocatedMB / totalMB) * 100;
          } else {
            memoryUsage = 100; // Cap at 100% if allocated exceeds total
          }
        }
      } catch (error) {
        console.warn(`Error calculating memory usage for export, cluster ${cluster.clusterId}:`, error);
      }
      
      // Improved runtime calculation with validation
      let runtimeHours = 0;
      try {
        if (cluster.endDateTime && cluster.creationDateTime) {
          const startTime = new Date(cluster.creationDateTime).getTime();
          const endTime = new Date(cluster.endDateTime).getTime();
          
          if (!isNaN(startTime) && !isNaN(endTime) && endTime >= startTime) {
            runtimeHours = (endTime - startTime) / (1000 * 60 * 60);
          }
        }
      } catch (error) {
        console.warn(`Error calculating runtime for export, cluster ${cluster.clusterId}:`, error);
      }

      return [
        `"${cluster.clusterName}"`,
        `"${cluster.clusterId}"`,
        `"${cluster.state}"`,
        `"${cluster.creationDateTime}"`,
        `"${cluster.endDateTime || ''}"`,
        memoryUsage.toFixed(2),
        cluster.minYARNMemoryAvailablePercentage,
        runtimeHours.toFixed(2),
        cluster.minCapacityRemainingGB  // This is correct - individual cluster remaining capacity
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
              {(activeFilter || (dateFilter && !isDefaultDailyView(dateFilter))) && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  data-testid="button-clear-filter"
                >
                  Clear All Filters
                  {activeFilter && ` (${activeFilter.value})`}
                  {dateFilter && !isDefaultDailyView(dateFilter) && ` (${dateFilter.label})`}
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
        {/* Date Range Filter */}
        <div className="mb-6">
          <DateRangeFilter
            onFilterChange={handleDateFilterChange}
            dataRange={dataDateRange || undefined}
            selectedFilter={dateFilter || undefined}
          />
        </div>

        {/* KPI Cards */}
        <KPICards 
          analytics={analytics} 
          filteredMetrics={filteredMetrics}
          isLoading={isLoading}
          dateFilterActive={!!dateFilter}
        />

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'metrics')} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Metrics</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Original Charts */}
          <TabsContent value="overview" className="space-y-6">
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
          </TabsContent>

          {/* Metrics Tab - New Time Series Charts */}
          <TabsContent value="metrics" className="space-y-6">
            {dateFilter && timeSeriesData.length > 0 ? (
              <>
                {/* Cluster Count Chart */}
                <ClusterCountChart
                  data={timeSeriesData}
                  clusterBreakdown={clusterBreakdown}
                  dateFilter={{
                    type: dateFilter.type,
                    startDate: dateFilter.range.startDate,
                    endDate: dateFilter.range.endDate
                  }}
                  onDataPointClick={(date, count) => 
                    handleMetricDataPointClick('Cluster Count', date, count)
                  }
                  onClusterClick={handleClusterClick}
                />

                {/* Metrics Grid */}
                <MetricsChartGrid
                  data={timeSeriesData}
                  dateFilter={{
                    type: dateFilter.type,
                    startDate: dateFilter.range.startDate,
                    endDate: dateFilter.range.endDate
                  }}
                  onDataPointClick={handleMetricDataPointClick}
                />
              </>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Date Filter Selected</h3>
                <p className="text-slate-600 mb-4">
                  Please select a date range above to view time series metrics charts.
                </p>
                {clusters.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Upload EMR data first to enable date filtering.
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
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