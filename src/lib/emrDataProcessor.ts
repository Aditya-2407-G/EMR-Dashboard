import { format } from "date-fns";
import type { EmrCluster } from "../../shared/schema";

export function processMemoryUsageData(clusters: EmrCluster[]) {
  // Group clusters by date and calculate daily averages to reduce clutter
  const dailyData: Record<string, { total: number; count: number; clusters: EmrCluster[] }> = {};
  
  clusters.forEach(cluster => {
    const date = format(new Date(cluster.creationDateTime), 'MM/dd');
    const memoryUsage = (cluster.maxMemoryTotalMB && cluster.maxMemoryTotalMB > 0) 
      ? ((cluster.maxMemoryAllocatedMB || 0) / cluster.maxMemoryTotalMB) * 100 
      : 0;
    
    if (!dailyData[date]) {
      dailyData[date] = { total: 0, count: 0, clusters: [] };
    }
    
    dailyData[date].total += memoryUsage;
    dailyData[date].count += 1;
    dailyData[date].clusters.push(cluster);
  });
  
  return Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      memoryUsage: data.total / data.count,
      clusterCount: data.count,
      clusterId: data.clusters[0]?.clusterId, // Use first cluster for drill-down
      clusterName: data.clusters.map(c => c.clusterName).join(', '),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function processClusterDistributionData(clusters: EmrCluster[]) {
  const distribution: Record<string, number> = {};
  
  clusters.forEach(cluster => {
    distribution[cluster.clusterName] = (distribution[cluster.clusterName] || 0) + 1;
  });

  return Object.entries(distribution).map(([name, value]) => ({
    name,
    value,
  }));
}

export function processYarnMemoryData(clusters: EmrCluster[]) {
  // Group by date and show min/max/avg YARN memory for better insights
  const dailyData: Record<string, { values: number[]; clusters: EmrCluster[] }> = {};
  
  clusters.forEach(cluster => {
    const date = format(new Date(cluster.creationDateTime), 'MM/dd');
    const yarnValue = cluster.minYARNMemoryAvailablePercentage || 0;
    
    if (!dailyData[date]) {
      dailyData[date] = { values: [], clusters: [] };
    }
    
    dailyData[date].values.push(yarnValue);
    dailyData[date].clusters.push(cluster);
  });
  
  return Object.entries(dailyData)
    .map(([date, data]) => {
      const values = data.values;
      return {
        date,
        yarnMemoryAvailable: values.reduce((sum, val) => sum + val, 0) / values.length,
        minYarn: Math.min(...values),
        maxYarn: Math.max(...values),
        clusterId: data.clusters[0]?.clusterId,
        clusterName: data.clusters.map(c => c.clusterName).join(', '),
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function processCapacityUsageData(clusters: EmrCluster[]) {
  // Group clusters by similar capacity sizes to reduce scatter
  const capacityGroups: Record<string, { totalCap: number; allocatedCap: number; count: number; clusters: EmrCluster[] }> = {};
  
  clusters.forEach(cluster => {
    const totalGB = (cluster.maxMemoryTotalMB || 0) / 1024;
    const allocatedGB = (cluster.maxMemoryAllocatedMB || 0) / 1024;
    
    // Group by cluster name and capacity range
    const key = `${cluster.clusterName}-${Math.round(totalGB / 50) * 50}`; // Group by 50GB intervals
    
    if (!capacityGroups[key]) {
      capacityGroups[key] = { totalCap: 0, allocatedCap: 0, count: 0, clusters: [] };
    }
    
    capacityGroups[key].totalCap += totalGB;
    capacityGroups[key].allocatedCap += allocatedGB;
    capacityGroups[key].count += 1;
    capacityGroups[key].clusters.push(cluster);
  });
  
  return Object.entries(capacityGroups).map(([key, group]) => ({
    totalCapacityGB: group.totalCap / group.count,
    allocatedMemoryGB: group.allocatedCap / group.count,
    clusterCount: group.count,
    clusterId: group.clusters[0]?.clusterId,
    clusterName: group.clusters[0]?.clusterName,
    groupKey: key,
  }));
}

export function processRuntimeAnalysisData(clusters: EmrCluster[]) {
  const runtimeByCluster: Record<string, number> = {};
  
  clusters.forEach(cluster => {
    const runtime = cluster.endDateTime 
      ? Math.abs(new Date(cluster.endDateTime).getTime() - new Date(cluster.creationDateTime).getTime()) / (1000 * 60 * 60)
      : 0;
    
    runtimeByCluster[cluster.clusterName] = (runtimeByCluster[cluster.clusterName] || 0) + runtime;
  });

  return Object.entries(runtimeByCluster).map(([name, totalRuntime]) => ({
    name,
    totalRuntime,
  }));
}
