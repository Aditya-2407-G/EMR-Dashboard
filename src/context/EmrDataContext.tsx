import React, { createContext, useContext, useState, useCallback } from 'react';
import type { EmrCluster, RawEmrData } from '../../shared/schema';
import { 
  type KPIMetrics, 
  type DateFilterOptions, 
  type EMRClusterRecord,
  calculateFilteredKPIMetrics,
  getDateRange
} from '@/lib/data-processing';

/**
 * Context for managing EMR data locally in the frontend
 * Provides data storage, analytics calculation, and file processing
 */

interface AnalyticsData {
  totalClusters: number;
  avgMemoryUsage: number;
  totalRuntimeHours: number;
  totalRemainingCapacityGB: number;  // Fixed: was incorrectly named "capacityUsed"
  activeClusters: number;
  clustersByState: Record<string, number>;
  clustersByName: Record<string, number>;
}

interface EmrDataContextType {
  clusters: EmrCluster[];
  analytics: AnalyticsData | undefined;
  isLoading: boolean;
  error: string | null;
  processJsonFile: (file: File) => Promise<void>;
  clearData: () => void;
  refetch: () => void;
  // New filtered analytics functionality
  getFilteredKPIMetrics: (dateFilter: DateFilterOptions) => KPIMetrics;
  getDataDateRange: () => { startDate: Date; endDate: Date } | null;
  getRawClusterData: () => EMRClusterRecord[];
}

const EmrDataContext = createContext<EmrDataContextType | undefined>(undefined);

/**
 * Provider component that manages EMR data state
 */
export function EmrDataProvider({ children }: { children: React.ReactNode }) {
  const [clusters, setClusters] = useState<EmrCluster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculates analytics data from the current clusters with improved error handling
   */
  const calculateAnalytics = useCallback((clusterData: EmrCluster[]): AnalyticsData => {
    if (clusterData.length === 0) {
      return {
        totalClusters: 0,
        avgMemoryUsage: 0,
        totalRuntimeHours: 0,
        totalRemainingCapacityGB: 0,  // Fixed: correctly named
        activeClusters: 0,
        clustersByState: {},
        clustersByName: {},
      };
    }

    const activeClusters = clusterData.filter(c => c.state === 'RUNNING' || c.state === 'WAITING').length;
    
    // Calculate memory usage with validation
    let totalMemoryUsage = 0;
    let validMemoryEntries = 0;
    
    clusterData.forEach(cluster => {
      const totalMB = cluster.maxMemoryTotalMB || 0;
      const allocatedMB = cluster.maxMemoryAllocatedMB || 0;
      
      // Validate data consistency
      if (totalMB > 0 && allocatedMB <= totalMB) {
        totalMemoryUsage += (allocatedMB / totalMB) * 100;
        validMemoryEntries++;
      } else if (totalMB > 0 && allocatedMB > totalMB) {
        console.warn(`Data inconsistency: Allocated memory (${allocatedMB}MB) exceeds total memory (${totalMB}MB) for cluster ${cluster.clusterId}`);
        // Use 100% in this case
        totalMemoryUsage += 100;
        validMemoryEntries++;
      }
    });

    // Calculate runtime with proper error handling
    let totalRuntimeHours = 0;
    clusterData.forEach(cluster => {
      if (cluster.endDateTime && cluster.creationDateTime) {
        try {
          const startTime = new Date(cluster.creationDateTime).getTime();
          const endTime = new Date(cluster.endDateTime).getTime();
          
          if (!isNaN(startTime) && !isNaN(endTime) && endTime >= startTime) {
            const runtime = (endTime - startTime) / (1000 * 60 * 60);
            totalRuntimeHours += runtime;
          } else {
            console.warn(`Invalid date range for cluster ${cluster.clusterId}: ${cluster.creationDateTime} to ${cluster.endDateTime}`);
          }
        } catch (error) {
          console.warn(`Error calculating runtime for cluster ${cluster.clusterId}:`, error);
        }
      }
    });

    // Calculate total remaining capacity (corrected from misleading "capacityUsed")
    const totalRemainingCapacityGB = clusterData.reduce((sum, cluster) => {
      const capacity = cluster.minCapacityRemainingGB || 0;
      return capacity >= 0 ? sum + capacity : sum; // Only add non-negative values
    }, 0);

    const clustersByState = clusterData.reduce((acc, cluster) => {
      acc[cluster.state] = (acc[cluster.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const clustersByName = clusterData.reduce((acc, cluster) => {
      acc[cluster.clusterName] = (acc[cluster.clusterName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalClusters: clusterData.length,
      avgMemoryUsage: validMemoryEntries > 0 ? totalMemoryUsage / validMemoryEntries : 0,
      totalRuntimeHours,
      totalRemainingCapacityGB,  // Fixed: correctly named and calculated
      activeClusters,
      clustersByState,
      clustersByName,
    };
  }, []);

  /**
   * Converts raw EMR data from JSON to EmrCluster format
   */
  const convertRawDataToCluster = (rawData: RawEmrData, index: number): EmrCluster => {
    return {
      id: `cluster-${index}-${Date.now()}`,
      clusterName: rawData.ClusterName,
      clusterId: rawData.ClusterId,
      creationDateTime: new Date(rawData.CreationDateTime),
      endDateTime: rawData.EndDateTime ? new Date(rawData.EndDateTime) : undefined,
      minCapacityRemainingGB: rawData.MinCapacityRemainingGB,
      minYARNMemoryAvailablePercentage: rawData.MinYARNMemoryAvailablePercentage,
      maxMemoryAllocatedMB: rawData.MaxMemoryAllocatedMB,
      maxMemoryTotalMB: rawData.MaxMemoryTotalMB,
      maxMRUnhealthyNodes: rawData.MaxMRUnhealthyNodes,
      state: rawData.State,
      rawData: rawData,
      uploadedAt: new Date(),
    };
  };

  /**
   * Processes uploaded JSON file and converts to cluster data
   */
  const processJsonFile = useCallback(async (file: File): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Invalid JSON format');
      }

      // Handle both single objects and arrays
      const rawClusters: RawEmrData[] = Array.isArray(jsonData) ? jsonData : [jsonData];
      
      if (rawClusters.length === 0) {
        throw new Error('No cluster data found in file');
      }

      // Convert raw data to EmrCluster format
      const newClusters = rawClusters.map((rawData, index) => {
        // Validate required fields
        if (!rawData.ClusterName || !rawData.ClusterId || !rawData.State) {
          throw new Error(`Missing required fields in cluster data at index ${index}`);
        }
        return convertRawDataToCluster(rawData, index);
      });

      // Add to existing clusters (append mode)
      setClusters(prevClusters => [...prevClusters, ...newClusters]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clears all cluster data
   */
  const clearData = useCallback(() => {
    setClusters([]);
    setError(null);
  }, []);

  /**
   * Refetch function (for compatibility with existing code)
   */
  const refetch = useCallback(() => {
    // In a frontend-only app, this just clears any errors
    setError(null);
  }, []);

  /**
   * Converts EmrCluster data to EMRClusterRecord format for data processing
   */
  const getRawClusterData = useCallback((): EMRClusterRecord[] => {
    return clusters.map(cluster => ({
      earliest_time: '', // Not used in current calculations
      latest_time: '', // Not used in current calculations
      ClusterName: cluster.clusterName,
      ClusterId: cluster.clusterId,
      CreationDateTime: cluster.creationDateTime.toISOString(),
      EndDateTime: cluster.endDateTime ? cluster.endDateTime.toISOString() : '',
      MinCapacityRemainingGB: cluster.minCapacityRemainingGB || 0,
      MinYARNMemoryAvailablePercentage: cluster.minYARNMemoryAvailablePercentage || 0,
      MaxMemoryAllocatedMB: cluster.maxMemoryAllocatedMB || 0,
      MaxMemoryTotalMB: cluster.maxMemoryTotalMB || 0,
      MaxMRUnhealthyNodes: cluster.maxMRUnhealthyNodes || 0,
      State: cluster.state
    }));
  }, [clusters]);

  /**
   * Gets the date range of available data
   */
  const getDataDateRange = useCallback(() => {
    if (clusters.length === 0) return null;
    const rawData = getRawClusterData();
    return getDateRange(rawData);
  }, [clusters, getRawClusterData]);

  /**
   * Calculates filtered KPI metrics based on date range
   */
  const getFilteredKPIMetrics = useCallback((dateFilter: DateFilterOptions): KPIMetrics => {
    const rawData = getRawClusterData();
    return calculateFilteredKPIMetrics(rawData, dateFilter);
  }, [getRawClusterData]);

  // Calculate analytics whenever clusters change
  const analytics = React.useMemo(() => calculateAnalytics(clusters), [clusters, calculateAnalytics]);

  const value: EmrDataContextType = {
    clusters,
    analytics,
    isLoading,
    error,
    processJsonFile,
    clearData,
    refetch,
    getFilteredKPIMetrics,
    getDataDateRange,
    getRawClusterData,
  };

  return (
    <EmrDataContext.Provider value={value}>
      {children}
    </EmrDataContext.Provider>
  );
}

/**
 * Hook to use EMR data context
 */
export function useEmrDataContext() {
  const context = useContext(EmrDataContext);
  if (context === undefined) {
    throw new Error('useEmrDataContext must be used within an EmrDataProvider');
  }
  return context;
}
