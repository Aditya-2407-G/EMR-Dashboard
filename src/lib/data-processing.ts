/**
 * Data Processing Utilities for EMR Dashboard
 * 
 * This module provides functions for processing and aggregating EMR cluster metrics.
 * It handles data transformation, daily/weekly aggregation, and filtering operations.
 */

import { format, parseISO, startOfDay, endOfDay, isWithinInterval, differenceInHours, addDays } from 'date-fns';

// Type definitions for EMR cluster data
export interface EMRClusterRecord {
  earliest_time: string;
  latest_time: string;
  ClusterName: string;
  ClusterId: string;
  CreationDateTime: string;
  EndDateTime: string;
  MinCapacityRemainingGB: number;
  MinYARNMemoryAvailablePercentage: number;
  MaxMemoryAllocatedMB: number;
  MaxMemoryTotalMB: number;
  MaxMRUnhealthyNodes: number;
  State: string;
}

// Aggregated daily metrics interface
export interface DailyMetrics {
  date: string;
  avgMemoryUsagePercent: number;
  avgYARNMemoryAvailablePercent: number;
  avgRuntimeHours: number;
  avgRemainingCapacityGB: number;
  clusterCount: number;
  clusters: string[];
  avgUnhealthyNodes: number;  // Added: utilize MaxMRUnhealthyNodes data
}

// Weekly KPI metrics interface
export interface WeeklyKPIs {
  avgMemoryUsagePercent: number;
  avgYARNMemoryAvailablePercent: number;
  avgRuntimeHours: number;
  avgRemainingCapacityGB: number;
  clusterCount: number;
}

/**
 * KPI trend and delta structures for investor analytics
 */
export interface KPITrends {
  previousWeek: WeeklyKPIs;
  delta: WeeklyKPIs; // percentage deltas vs previous week
}

/**
 * Health score structures
 */
export interface HealthScorePoint {
  date: string;
  score: number; // 0-100
}

export interface HealthSummary {
  daily: HealthScorePoint[];
  weeklyAverage: number; // average of latest 7 days
}

/**
 * Anomaly detection structure
 */
export interface Anomaly {
  date: string;
  metric: 'avgMemoryUsagePercent' | 'avgYARNMemoryAvailablePercent' | 'avgRuntimeHours' | 'avgRemainingCapacityGB';
  value: number;
  zScore: number;
}

/**
 * Forecast structure (simple linear trend projection)
 */
export interface MemoryForecastPoint {
  date: string;
  avgMemoryUsagePercent: number;
}

/**
 * Aggregate analytics bundle
 */
export interface AnalyticsBundle {
  trends: KPITrends;
  health: HealthSummary;
  anomalies: Anomaly[];
  forecast: MemoryForecastPoint[];
}

// Filter options interface
export interface FilterOptions {
  clusterName?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Calculates memory usage percentage from allocated and total memory with validation
 * @param allocatedMB - Memory allocated in MB
 * @param totalMB - Total memory available in MB
 * @returns Memory usage percentage (0-100)
 */
function calculateMemoryUsagePercent(allocatedMB: number, totalMB: number): number {
  // Input validation
  if (typeof allocatedMB !== 'number' || typeof totalMB !== 'number') {
    console.warn(`Invalid memory values: allocated=${allocatedMB}, total=${totalMB}`);
    return 0;
  }
  
  if (totalMB === 0) return 0;
  if (allocatedMB < 0 || totalMB < 0) {
    console.warn(`Negative memory values: allocated=${allocatedMB}MB, total=${totalMB}MB`);
    return 0;
  }
  
  // Handle data inconsistency
  if (allocatedMB > totalMB) {
    console.warn(`Allocated memory (${allocatedMB}MB) exceeds total memory (${totalMB}MB)`);
    return 100; // Cap at 100%
  }
  
  return (allocatedMB / totalMB) * 100;
}

/**
 * Calculates runtime hours between creation and end dates with robust error handling
 * @param creationDateTime - Cluster creation timestamp
 * @param endDateTime - Cluster termination timestamp
 * @returns Runtime in hours (0 if invalid)
 */
function calculateRuntimeHours(creationDateTime: string, endDateTime: string): number {
  try {
    // Input validation
    if (!creationDateTime || !endDateTime) {
      return 0;
    }
    
    const startDate = parseISO(creationDateTime);
    const endDate = parseISO(endDateTime);
    
    // Validate parsed dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn(`Invalid date format: start=${creationDateTime}, end=${endDateTime}`);
      return 0;
    }
    
    // Ensure logical order
    if (endDate < startDate) {
      console.warn(`End date before start date: start=${creationDateTime}, end=${endDateTime}`);
      return 0;
    }
    
    const hours = differenceInHours(endDate, startDate);
    return Math.max(0, hours); // Ensure non-negative
  } catch (error) {
    console.warn(`Error calculating runtime hours for ${creationDateTime} to ${endDateTime}:`, error);
    return 0;
  }
}

/**
 * Gets unique cluster names from the dataset
 * @param data - Array of EMR cluster records
 * @returns Array of unique cluster names
 */
export function getUniqueClusterNames(data: EMRClusterRecord[]): string[] {
  const uniqueNames = new Set(data.map(record => record.ClusterName));
  return Array.from(uniqueNames).sort();
}

/**
 * Gets the date range from the dataset
 * @param data - Array of EMR cluster records
 * @returns Object with start and end dates
 */
export function getDateRange(data: EMRClusterRecord[]): { startDate: Date; endDate: Date } {
  if (data.length === 0) {
    const now = new Date();
    return { startDate: now, endDate: now };
  }

  const dates = data.flatMap(record => [
    parseISO(record.CreationDateTime),
    parseISO(record.EndDateTime)
  ]);

  const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

  return { startDate, endDate };
}

/**
 * Filters EMR data based on provided filter options
 * @param data - Array of EMR cluster records
 * @param filters - Filter options (cluster name, date range)
 * @returns Filtered array of EMR cluster records
 */
export function filterEMRData(data: EMRClusterRecord[], filters: FilterOptions): EMRClusterRecord[] {
  return data.filter(record => {
    // Filter by cluster name
    if (filters.clusterName && record.ClusterName !== filters.clusterName) {
      return false;
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      const creationDate = parseISO(record.CreationDateTime);
      const endDate = parseISO(record.EndDateTime);
      
      if (filters.startDate && filters.endDate) {
        const interval = { start: startOfDay(filters.startDate), end: endOfDay(filters.endDate) };
        return isWithinInterval(creationDate, interval) || isWithinInterval(endDate, interval);
      }
    }

    return true;
  });
}

/**
 * Aggregates EMR data by day
 * @param data - Array of EMR cluster records
 * @returns Array of daily aggregated metrics
 */
export function aggregateDataByDay(data: EMRClusterRecord[]): DailyMetrics[] {
  if (data.length === 0) return [];

  // Group records by creation date (day)
  const groupedByDay = new Map<string, EMRClusterRecord[]>();

  data.forEach(record => {
    try {
      const creationDate = parseISO(record.CreationDateTime);
      const dayKey = format(creationDate, 'yyyy-MM-dd');
      
      if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, []);
      }
      groupedByDay.get(dayKey)!.push(record);
    } catch (error) {
      console.warn('Error parsing date for record:', record.ClusterId, error);
    }
  });

  // Calculate daily metrics
  const dailyMetrics: DailyMetrics[] = [];

  for (const [date, records] of groupedByDay.entries()) {
    const memoryUsages = records.map(r => calculateMemoryUsagePercent(r.MaxMemoryAllocatedMB, r.MaxMemoryTotalMB));
    const yarnMemoryAvailable = records.map(r => r.MinYARNMemoryAvailablePercentage);
    const runtimeHours = records.map(r => calculateRuntimeHours(r.CreationDateTime, r.EndDateTime));
    const remainingCapacities = records.map(r => r.MinCapacityRemainingGB);
    const unhealthyNodes = records.map(r => r.MaxMRUnhealthyNodes || 0);  // Added: utilize unhealthy nodes data
    const uniqueClusters = new Set(records.map(r => r.ClusterName));

    dailyMetrics.push({
      date,
      avgMemoryUsagePercent: calculateAverage(memoryUsages),
      avgYARNMemoryAvailablePercent: calculateAverage(yarnMemoryAvailable),
      avgRuntimeHours: calculateAverage(runtimeHours),
      avgRemainingCapacityGB: calculateAverage(remainingCapacities),
      clusterCount: uniqueClusters.size,
      clusters: Array.from(uniqueClusters),
      avgUnhealthyNodes: calculateAverage(unhealthyNodes)  // Added: track unhealthy nodes
    });
  }

  // Sort by date
  return dailyMetrics.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculates weekly KPIs from daily metrics (latest 7 days)
 * @param dailyMetrics - Array of daily metrics
 * @returns Weekly KPI aggregation
 */
export function calculateWeeklyKPIs(dailyMetrics: DailyMetrics[]): WeeklyKPIs {
  if (dailyMetrics.length === 0) {
    return {
      avgMemoryUsagePercent: 0,
      avgYARNMemoryAvailablePercent: 0,
      avgRuntimeHours: 0,
      avgRemainingCapacityGB: 0,
      clusterCount: 0
    };
  }

  // Get the latest 7 days of data
  const sortedMetrics = dailyMetrics.sort((a, b) => b.date.localeCompare(a.date));
  const weeklyData = sortedMetrics.slice(0, 7);

  const allClusters = new Set<string>();
  weeklyData.forEach(day => day.clusters.forEach(cluster => allClusters.add(cluster)));

  return {
    avgMemoryUsagePercent: calculateAverage(weeklyData.map(d => d.avgMemoryUsagePercent)),
    avgYARNMemoryAvailablePercent: calculateAverage(weeklyData.map(d => d.avgYARNMemoryAvailablePercent)),
    avgRuntimeHours: calculateAverage(weeklyData.map(d => d.avgRuntimeHours)),
    avgRemainingCapacityGB: calculateAverage(weeklyData.map(d => d.avgRemainingCapacityGB)),
    clusterCount: allClusters.size
  };
}

/**
 * Calculates prior week's KPIs (days 8-14 from the most recent)
 * @param dailyMetrics - Array of daily metrics
 * @returns Weekly KPIs for the previous week window
 */
export function calculatePreviousWeeklyKPIs(dailyMetrics: DailyMetrics[]): WeeklyKPIs {
  if (dailyMetrics.length === 0) {
    return {
      avgMemoryUsagePercent: 0,
      avgYARNMemoryAvailablePercent: 0,
      avgRuntimeHours: 0,
      avgRemainingCapacityGB: 0,
      clusterCount: 0
    };
  }

  const sortedDesc = [...dailyMetrics].sort((a, b) => b.date.localeCompare(a.date));
  const previousWeek = sortedDesc.slice(7, 14);
  if (previousWeek.length === 0) {
    return {
      avgMemoryUsagePercent: 0,
      avgYARNMemoryAvailablePercent: 0,
      avgRuntimeHours: 0,
      avgRemainingCapacityGB: 0,
      clusterCount: 0
    };
  }

  const allClusters = new Set<string>();
  previousWeek.forEach(day => day.clusters.forEach(cluster => allClusters.add(cluster)));

  return {
    avgMemoryUsagePercent: calculateAverage(previousWeek.map(d => d.avgMemoryUsagePercent)),
    avgYARNMemoryAvailablePercent: calculateAverage(previousWeek.map(d => d.avgYARNMemoryAvailablePercent)),
    avgRuntimeHours: calculateAverage(previousWeek.map(d => d.avgRuntimeHours)),
    avgRemainingCapacityGB: calculateAverage(previousWeek.map(d => d.avgRemainingCapacityGB)),
    clusterCount: allClusters.size
  };
}

/**
 * Calculates percentage deltas between current and previous KPIs
 * @param current - Current period KPIs
 * @param previous - Previous period KPIs
 * @returns Deltas in percentage points (e.g., 5.2 means +5.2%)
 */
export function calculateKPIDeltas(current: WeeklyKPIs, previous: WeeklyKPIs): WeeklyKPIs {
  const pct = (c: number, p: number) => {
    if (p === 0) return c === 0 ? 0 : 100; // define as full increase if previous is zero
    return ((c - p) / Math.abs(p)) * 100;
  };

  return {
    avgMemoryUsagePercent: pct(current.avgMemoryUsagePercent, previous.avgMemoryUsagePercent),
    avgYARNMemoryAvailablePercent: pct(current.avgYARNMemoryAvailablePercent, previous.avgYARNMemoryAvailablePercent),
    avgRuntimeHours: pct(current.avgRuntimeHours, previous.avgRuntimeHours),
    avgRemainingCapacityGB: pct(current.avgRemainingCapacityGB, previous.avgRemainingCapacityGB),
    clusterCount: pct(current.clusterCount, previous.clusterCount)
  };
}

/**
 * Computes a daily health score (0-100) using threshold-based penalties
 * Lower memory usage, higher YARN availability, higher remaining capacity, and fewer unhealthy nodes improve the score.
 * @param dailyMetrics - Array of daily metrics
 */
export function computeHealthSummary(dailyMetrics: DailyMetrics[]): HealthSummary {
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const daily: HealthScorePoint[] = dailyMetrics.map(d => {
    const memoryPenalty = Math.max(0, d.avgMemoryUsagePercent - 80) * 1.2; // penalize over 80%
    const yarnPenalty = Math.max(0, 30 - d.avgYARNMemoryAvailablePercent) * 1.5; // penalize under 30%
    const capacityPenalty = Math.max(0, 200 - d.avgRemainingCapacityGB) * 0.1; // penalize under 200GB
    const unhealthyNodesPenalty = d.avgUnhealthyNodes * 2.0; // penalize any unhealthy nodes (Added: new penalty)
    
    const rawScore = 100 - (memoryPenalty + yarnPenalty + capacityPenalty + unhealthyNodesPenalty);
    return { date: d.date, score: clamp(rawScore, 0, 100) };
  });

  const sortedDesc = [...daily].sort((a, b) => b.date.localeCompare(a.date));
  const latest7 = sortedDesc.slice(0, 7);
  const weeklyAverage = latest7.length > 0 ? latest7.reduce((acc, p) => acc + p.score, 0) / latest7.length : 0;

  return { daily, weeklyAverage };
}

/**
 * Detects anomalies using z-score across selected metrics and returns the top entries by |z|.
 * @param dailyMetrics - Array of daily metrics
 * @param topN - Number of top anomalies to return
 */
export function detectAnomalies(dailyMetrics: DailyMetrics[], topN: number = 3): Anomaly[] {
  const metrics: Array<Anomaly['metric']> = [
    'avgMemoryUsagePercent',
    'avgYARNMemoryAvailablePercent',
    'avgRuntimeHours',
    'avgRemainingCapacityGB'
  ];

  const anomalies: Anomaly[] = [];

  metrics.forEach(metric => {
    const values = dailyMetrics.map(d => d[metric] as number);
    if (values.length === 0) return;
    const mean = calculateAverage(values);
    const variance = calculateAverage(values.map(v => (v - mean) ** 2));
    const stdDev = Math.sqrt(variance) || 1; // avoid division by zero

    dailyMetrics.forEach(d => {
      const value = d[metric] as number;
      const z = (value - mean) / stdDev;
      anomalies.push({ date: d.date, metric, value, zScore: z });
    });
  });

  // Sort by absolute z and pick top N while ensuring unique date-metric pairs (already unique)
  const top = anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)).slice(0, topN);
  return top;
}

/**
 * Forecasts memory usage for the next N days using simple linear regression on index vs value.
 * @param dailyMetrics - Array of daily metrics
 * @param horizonDays - Number of future days to forecast
 */
export function forecastMemoryUsage(dailyMetrics: DailyMetrics[], horizonDays: number = 7): MemoryForecastPoint[] {
  if (dailyMetrics.length === 0) return [];

  const data = [...dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));
  const n = data.length;
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const ys = data.map(d => d.avgMemoryUsagePercent);

  // Compute linear regression coefficients (least squares)
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumXX - sumX * sumX || 1;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const lastDate = parseISO(data[data.length - 1].date);
  const forecast: MemoryForecastPoint[] = [];
  for (let i = 1; i <= horizonDays; i++) {
    const xFuture = n + i;
    const yFuture = intercept + slope * xFuture;
    forecast.push({
      date: format(addDays(lastDate, i), 'yyyy-MM-dd'),
      avgMemoryUsagePercent: Math.max(0, Math.min(100, yFuture))
    });
  }
  return forecast;
}

/**
 * Convenience function to compute a full analytics bundle for investor view
 * @param dailyMetrics - Array of daily metrics
 */
export function computeAnalyticsBundle(dailyMetrics: DailyMetrics[]): AnalyticsBundle {
  const current = calculateWeeklyKPIs(dailyMetrics);
  const previous = calculatePreviousWeeklyKPIs(dailyMetrics);
  const delta = calculateKPIDeltas(current, previous);
  const health = computeHealthSummary(dailyMetrics);
  const anomalies = detectAnomalies(dailyMetrics, 3);
  const forecast = forecastMemoryUsage(dailyMetrics, 7);

  return {
    trends: { previousWeek: previous, delta },
    health,
    anomalies,
    forecast
  };
}

/**
 * Calculates the average of an array of numbers with validation
 * @param numbers - Array of numbers
 * @returns Average value (0 if invalid input)
 */
function calculateAverage(numbers: number[]): number {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  
  // Filter out invalid values (NaN, null, undefined, infinite)
  const validNumbers = numbers.filter(num => 
    typeof num === 'number' && 
    !isNaN(num) && 
    isFinite(num)
  );
  
  if (validNumbers.length === 0) return 0;
  
  const sum = validNumbers.reduce((acc, num) => acc + num, 0);
  return sum / validNumbers.length;
}

/**
 * KPI metrics interface for the dashboard cards
 */
export interface KPIMetrics {
  avgMemoryUsagePercent: number;
  avgYARNMemoryAvailablePercent: number;
  avgRuntimeHours: number;
  avgRemainingCapacityGB: number;
  clusterCount: number;
}

/**
 * Date filter options for metrics calculation
 */
export interface DateFilterOptions {
  type: 'daily' | 'weekly' | 'custom';
  startDate: Date;
  endDate: Date;
}

/**
 * Calculates KPI metrics from filtered data based on date range
 * @param data - Array of EMR cluster records
 * @param dateFilter - Date filter options
 * @returns KPI metrics for the specified period
 */
export function calculateFilteredKPIMetrics(
  data: EMRClusterRecord[], 
  dateFilter: DateFilterOptions
): KPIMetrics {
  // Filter data by date range
  const filteredData = filterEMRData(data, {
    startDate: dateFilter.startDate,
    endDate: dateFilter.endDate
  });

  if (filteredData.length === 0) {
    return {
      avgMemoryUsagePercent: 0,
      avgYARNMemoryAvailablePercent: 0,
      avgRuntimeHours: 0,
      avgRemainingCapacityGB: 0,
      clusterCount: 0
    };
  }

  // Calculate memory usage percentages
  const memoryUsages = filteredData.map(record => 
    calculateMemoryUsagePercent(record.MaxMemoryAllocatedMB, record.MaxMemoryTotalMB)
  );

  // Calculate runtime hours for each cluster
  const runtimeHours = filteredData.map(record => 
    calculateRuntimeHours(record.CreationDateTime, record.EndDateTime)
  );

  // Get YARN memory available percentages
  const yarnMemoryAvailable = filteredData.map(record => 
    record.MinYARNMemoryAvailablePercentage
  );

  // Get remaining capacity values
  const remainingCapacities = filteredData.map(record => 
    record.MinCapacityRemainingGB
  );

  // Count unique clusters in the period
  const uniqueClusters = new Set(filteredData.map(record => record.ClusterName));

  return {
    avgMemoryUsagePercent: calculateAverage(memoryUsages),
    avgYARNMemoryAvailablePercent: calculateAverage(yarnMemoryAvailable),
    avgRuntimeHours: calculateAverage(runtimeHours),
    avgRemainingCapacityGB: calculateAverage(remainingCapacities),
    clusterCount: uniqueClusters.size
  };
}

/**
 * Calculates KPI metrics aggregated by day for time series visualization
 * @param data - Array of EMR cluster records
 * @param dateFilter - Date filter options
 * @returns Array of daily KPI metrics
 */
export function calculateDailyKPIMetrics(
  data: EMRClusterRecord[], 
  dateFilter: DateFilterOptions
): Array<{ date: string } & KPIMetrics> {
  // Get daily aggregated data
  const dailyData = aggregateDataByDay(filterEMRData(data, {
    startDate: dateFilter.startDate,
    endDate: dateFilter.endDate
  }));

  return dailyData.map(day => ({
    date: day.date,
    avgMemoryUsagePercent: day.avgMemoryUsagePercent,
    avgYARNMemoryAvailablePercent: day.avgYARNMemoryAvailablePercent,
    avgRuntimeHours: day.avgRuntimeHours,
    avgRemainingCapacityGB: day.avgRemainingCapacityGB,
    clusterCount: day.clusterCount
  }));
}

/**
 * Calculates KPI metrics aggregated by week for time series visualization
 * @param data - Array of EMR cluster records
 * @param dateFilter - Date filter options
 * @returns Array of weekly KPI metrics
 */
export function calculateWeeklyKPIMetrics(
  data: EMRClusterRecord[], 
  dateFilter: DateFilterOptions
): Array<{ week: string } & KPIMetrics> {
  const dailyData = aggregateDataByDay(filterEMRData(data, {
    startDate: dateFilter.startDate,
    endDate: dateFilter.endDate
  }));

  // Group daily data by week
  const weeklyGroups = new Map<string, DailyMetrics[]>();
  
  dailyData.forEach(day => {
    const date = parseISO(day.date);
    const weekStart = format(date.getTime() - (date.getDay() * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    if (!weeklyGroups.has(weekStart)) {
      weeklyGroups.set(weekStart, []);
    }
    weeklyGroups.get(weekStart)!.push(day);
  });

  // Calculate weekly averages
  const weeklyMetrics: Array<{ week: string } & KPIMetrics> = [];
  
  for (const [weekStart, days] of weeklyGroups.entries()) {
    const allClusters = new Set<string>();
    days.forEach(day => day.clusters.forEach(cluster => allClusters.add(cluster)));

    weeklyMetrics.push({
      week: weekStart,
      avgMemoryUsagePercent: calculateAverage(days.map(d => d.avgMemoryUsagePercent)),
      avgYARNMemoryAvailablePercent: calculateAverage(days.map(d => d.avgYARNMemoryAvailablePercent)),
      avgRuntimeHours: calculateAverage(days.map(d => d.avgRuntimeHours)),
      avgRemainingCapacityGB: calculateAverage(days.map(d => d.avgRemainingCapacityGB)),
      clusterCount: allClusters.size
    });
  }

  return weeklyMetrics.sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Gets chart data formatted for the specific metrics with date filtering
 * @param data - Array of EMR cluster records
 * @param dateFilter - Date filter options
 * @param metric - Specific metric to extract
 * @returns Chart data points
 */
export function getChartDataForMetric(
  data: EMRClusterRecord[],
  dateFilter: DateFilterOptions,
  metric: keyof KPIMetrics
): Array<{ date: string; value: number; label?: string }> {
  const timeSeriesData = dateFilter.type === 'weekly' 
    ? calculateWeeklyKPIMetrics(data, dateFilter)
    : calculateDailyKPIMetrics(data, dateFilter);

  return timeSeriesData.map(point => ({
    date: 'week' in point ? point.week : point.date,
    value: point[metric] as number,
    label: metric === 'clusterCount' ? `${point[metric]} clusters` : 
           metric === 'avgRuntimeHours' ? `${(point[metric] as number).toFixed(1)}h` :
           `${(point[metric] as number).toFixed(1)}${metric.includes('Percent') ? '%' : 'GB'}`
  }));
}

/**
 * Exports daily metrics to CSV format
 * @param dailyMetrics - Array of daily metrics
 * @returns CSV string
 */
export function exportToCSV(dailyMetrics: DailyMetrics[]): string {
  if (dailyMetrics.length === 0) return '';

  const headers = [
    'Date',
    'Avg Memory Usage %',
    'Avg YARN Memory Available %',
    'Avg Runtime Hours',
    'Avg Remaining Capacity GB',
    'Avg Unhealthy Nodes',  // Added: new metric in export
    'Cluster Count',
    'Clusters'
  ];

  const csvRows = [
    headers.join(','),
    ...dailyMetrics.map(metric => [
      metric.date,
      metric.avgMemoryUsagePercent.toFixed(2),
      metric.avgYARNMemoryAvailablePercent.toFixed(2),
      metric.avgRuntimeHours.toFixed(2),
      metric.avgRemainingCapacityGB.toFixed(2),
      metric.avgUnhealthyNodes.toFixed(2),  // Added: new metric value
      metric.clusterCount,
      metric.clusters.join(';')
    ].join(','))
  ];

  return csvRows.join('\n');
}
