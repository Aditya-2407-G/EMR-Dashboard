/**
 * Cluster Count Chart Component for EMR Dashboard
 * 
 * Displays cluster count over time with date filtering support.
 * Shows both time series and breakdown by cluster names.
 */


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  type DateFilterOptions, 
  type KPIMetrics
} from '@/lib/data-processing';
import { format, parseISO } from 'date-fns';
import { Building } from 'lucide-react';

interface ClusterCountChartProps {
  data: Array<{ date: string } & KPIMetrics>;
  clusterBreakdown?: Array<{ name: string; count: number; percentage: number }>;
  dateFilter: DateFilterOptions;
  onDataPointClick?: (date: string, count: number) => void;
  onClusterClick?: (clusterName: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4', '#f59e0b', '#ef4444', '#84cc16'];

/**
 * Cluster Count Chart with time series and breakdown views
 */
export function ClusterCountChart({
  data,
  clusterBreakdown = [],
  dateFilter,
  onDataPointClick,
  onClusterClick
}: ClusterCountChartProps) {
  
  // Format data for time series chart
  const timeSeriesData = data.map(point => ({
    date: point.date,
    count: point.clusterCount,
    displayDate: format(parseISO(point.date), dateFilter.type === 'weekly' ? 'MMM d' : 'MMM d'),
    fullDate: format(parseISO(point.date), 'MMM d, yyyy')
  }));

  // Custom tooltip for time series
  const TimeSeriesTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-slate-900">{data.fullDate}</p>
          <p className="text-sm text-slate-600">
            Clusters: <span className="font-medium text-cyan-600">{data.count}</span>
          </p>
          {dateFilter.type === 'weekly' && (
            <p className="text-xs text-slate-500">Week starting {data.displayDate}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-slate-900">{data.name}</p>
          <p className="text-sm text-slate-600">
            Count: <span className="font-medium text-cyan-600">{data.count}</span>
          </p>
          <p className="text-sm text-slate-600">
            Share: <span className="font-medium text-cyan-600">{data.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Handle click events
  const handleTimeSeriesClick = (data: any) => {
    if (onDataPointClick && data && data.activePayload) {
      const point = data.activePayload[0].payload;
      onDataPointClick(point.date, point.count);
    }
  };

  const handlePieClick = (data: any) => {
    if (onClusterClick && data) {
      onClusterClick(data.name);
    }
  };

  // Calculate summary stats
  const totalClusters = timeSeriesData.reduce((sum, d) => sum + d.count, 0);
  const avgClusters = totalClusters / timeSeriesData.length || 0;
  const maxClusters = Math.max(...timeSeriesData.map(d => d.count));
  const minClusters = Math.min(...timeSeriesData.map(d => d.count));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Time Series Chart */}
      <Card className="xl:col-span-2 bg-white shadow-sm border border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center">
            <Building className="w-5 h-5 mr-2 text-cyan-600" />
            Cluster Count Over Time
            <span className="ml-auto text-sm font-normal text-slate-500">
              {dateFilter.type === 'weekly' ? 'Weekly' : 'Daily'} View
            </span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {dateFilter.type === 'weekly' ? (
                <BarChart 
                  data={timeSeriesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  onClick={handleTimeSeriesClick}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="displayDate"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value.toString()}
                  />
                  <Tooltip content={<TimeSeriesTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart 
                  data={timeSeriesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  onClick={handleTimeSeriesClick}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="displayDate"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value.toString()}
                  />
                  <Tooltip content={<TimeSeriesTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#06b6d4', strokeWidth: 2, stroke: '#ffffff' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* Summary stats */}
          <div className="mt-4 grid grid-cols-4 gap-4 text-center">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-600">Total</div>
              <div className="text-sm font-medium text-slate-900">{totalClusters}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-600">Average</div>
              <div className="text-sm font-medium text-slate-900">{avgClusters.toFixed(1)}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-600">Maximum</div>
              <div className="text-sm font-medium text-slate-900">{maxClusters}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-600">Minimum</div>
              <div className="text-sm font-medium text-slate-900">{minClusters}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cluster Breakdown Pie Chart */}
      {clusterBreakdown.length > 0 && (
        <Card className="bg-white shadow-sm border border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Cluster Distribution
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clusterBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="count"
                    onClick={handlePieClick}
                  >
                    {clusterBreakdown.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        className="cursor-pointer hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="mt-4 space-y-2">
              {clusterBreakdown.slice(0, 6).map((item, index) => (
                <div 
                  key={item.name}
                  className="flex items-center justify-between text-sm cursor-pointer hover:bg-slate-50 p-2 rounded"
                  onClick={() => onClusterClick?.(item.name)}
                >
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded mr-2"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-slate-700 truncate">{item.name}</span>
                  </div>
                  <div className="text-slate-600 font-medium">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </div>
                </div>
              ))}
              
              {clusterBreakdown.length > 6 && (
                <div className="text-xs text-slate-500 text-center pt-2">
                  +{clusterBreakdown.length - 6} more clusters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
