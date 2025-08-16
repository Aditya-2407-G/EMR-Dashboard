import React, { createContext, useContext, useState, useCallback } from 'react';
import type { EmrCluster, RawEmrData } from '../../shared/schema';

/**
 * Context for managing EMR data locally in the frontend
 * Provides data storage, analytics calculation, and file processing
 */

interface AnalyticsData {
  totalClusters: number;
  avgMemoryUsage: number;
  totalRuntimeHours: number;
  capacityUsed: number;
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
   * Calculates analytics data from the current clusters
   */
  const calculateAnalytics = useCallback((clusterData: EmrCluster[]): AnalyticsData => {
    if (clusterData.length === 0) {
      return {
        totalClusters: 0,
        avgMemoryUsage: 0,
        totalRuntimeHours: 0,
        capacityUsed: 0,
        activeClusters: 0,
        clustersByState: {},
        clustersByName: {},
      };
    }

    const activeClusters = clusterData.filter(c => c.state === 'RUNNING' || c.state === 'WAITING').length;
    
    const totalMemoryUsage = clusterData.reduce((sum, cluster) => {
      if (cluster.maxMemoryTotalMB && cluster.maxMemoryTotalMB > 0) {
        return sum + ((cluster.maxMemoryAllocatedMB || 0) / cluster.maxMemoryTotalMB) * 100;
      }
      return sum;
    }, 0);

    const totalRuntimeHours = clusterData.reduce((sum, cluster) => {
      if (cluster.endDateTime) {
        const runtime = Math.abs(new Date(cluster.endDateTime).getTime() - new Date(cluster.creationDateTime).getTime()) / (1000 * 60 * 60);
        return sum + runtime;
      }
      return sum;
    }, 0);

    const capacityUsed = clusterData.reduce((sum, cluster) => sum + (cluster.minCapacityRemainingGB || 0), 0);

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
      avgMemoryUsage: clusterData.length > 0 ? totalMemoryUsage / clusterData.length : 0,
      totalRuntimeHours,
      capacityUsed,
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
