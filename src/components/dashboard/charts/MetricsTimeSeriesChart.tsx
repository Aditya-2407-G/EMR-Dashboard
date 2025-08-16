import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expand } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  type DateFilterOptions, 
  type KPIMetrics
} from '@/lib/data-processing';
import { format, parseISO } from 'date-fns';

interface MetricsTimeSeriesChartProps {
  data: Array<{ date: string } & KPIMetrics>;
  metric: keyof KPIMetrics;
  title: string;
  color: string;
  unit: string;
  dateFilter: DateFilterOptions;
  onDataPointClick?: (date: string, value: number) => void;
  height?: number;
  showReferenceLine?: boolean;
  referenceValue?: number;
  onExpand?: () => void;
}

/**
 * Chart component for displaying time series metrics data
 */
export function MetricsTimeSeriesChart({
  data,
  metric,
  title,
  color,
  unit,
  dateFilter,
  onDataPointClick,
  showReferenceLine = false,
  referenceValue,
  onExpand
}: MetricsTimeSeriesChartProps) {
  
  // Format data for chart
  const chartData = data.map(point => ({
    date: point.date,
    value: point[metric] as number,
    displayDate: format(parseISO(point.date), dateFilter.type === 'weekly' ? 'MMM d' : 'MMM d'),
    fullDate: format(parseISO(point.date), 'MMM d, yyyy'),
    formattedValue: `${(point[metric] as number).toFixed(1)}${unit}`
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-slate-900">{data.fullDate}</p>
          <p className="text-sm text-slate-600">
            {title}: <span className="font-medium" style={{ color }}>{data.formattedValue}</span>
          </p>
          {dateFilter.type === 'weekly' && (
            <p className="text-xs text-slate-500">Week starting {data.displayDate}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Handle click events
  const handleClick = (data: any) => {
    if (onDataPointClick && data && data.activePayload) {
      const point = data.activePayload[0].payload;
      onDataPointClick(point.date, point.value);
    }
  };

  // Get color variations
  const getStrokeColor = () => {
    const colorMap: Record<string, string> = {
      'emerald': '#10b981',
      'blue': '#3b82f6', 
      'purple': '#8b5cf6',
      'rose': '#f43f5e',
      'cyan': '#06b6d4'
    };
    return colorMap[color] || '#6b7280';
  };

  const getFillColor = () => {
    const colorMap: Record<string, string> = {
      'emerald': '#ecfdf5',
      'blue': '#eff6ff',
      'purple': '#f5f3ff', 
      'rose': '#fef2f2',
      'cyan': '#ecfeff'
    };
    return colorMap[color] || '#f8fafc';
  };

  // Get Y-axis domain based on metric type
  const getYAxisDomain = () => {
    if (metric.includes('Percent')) {
      return [0, 100];
    }
    const values = chartData.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding];
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-normal text-slate-500">
              {dateFilter.type === 'weekly' ? 'Weekly' : 'Daily'} View
            </span>
            {onExpand && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-400 hover:text-slate-600"
                onClick={onExpand}
                title="Expand chart"
              >
                <Expand className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              onClick={handleClick}
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
                domain={getYAxisDomain()}
                tickFormatter={(value) => `${value.toFixed(0)}${unit}`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {showReferenceLine && referenceValue && (
                <ReferenceLine 
                  y={referenceValue}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: `Target: ${referenceValue}${unit}`, position: "top" }}
                />
              )}
              
              <Line
                type="monotone"
                dataKey="value"
                stroke={getStrokeColor()}
                strokeWidth={2}
                dot={{ 
                  r: 4, 
                  fill: getStrokeColor(),
                  strokeWidth: 2,
                  stroke: '#ffffff'
                }}
                activeDot={{ 
                  r: 6, 
                  fill: getStrokeColor(),
                  strokeWidth: 2,
                  stroke: '#ffffff'
                }}
                fill={getFillColor()}
                fillOpacity={0.1}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-600">Average</div>
            <div className="text-sm font-medium text-slate-900">
              {(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(1)}{unit}
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-600">Maximum</div>
            <div className="text-sm font-medium text-slate-900">
              {Math.max(...chartData.map(d => d.value)).toFixed(1)}{unit}
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-600">Minimum</div>
            <div className="text-sm font-medium text-slate-900">
              {Math.min(...chartData.map(d => d.value)).toFixed(1)}{unit}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid layout component for displaying multiple metrics charts
 */
interface MetricsChartGridProps {
  data: Array<{ date: string } & KPIMetrics>;
  dateFilter: DateFilterOptions;
  onDataPointClick?: (metric: keyof KPIMetrics, date: string, value: number) => void;
  onChartExpand?: (title: string, metric: keyof KPIMetrics) => void;
}

export function MetricsChartGrid({ 
  data, 
  dateFilter, 
  onDataPointClick,
  onChartExpand 
}: MetricsChartGridProps) {
  
  const chartConfigs = [
    {
      metric: 'avgMemoryUsagePercent' as keyof KPIMetrics,
      title: 'Memory Usage %',
      color: 'emerald',
      unit: '%',
      showReferenceLine: true,
      referenceValue: 80
    },
    {
      metric: 'avgYARNMemoryAvailablePercent' as keyof KPIMetrics,
      title: 'YARN Memory Available %',
      color: 'blue',
      unit: '%',
      showReferenceLine: true,
      referenceValue: 20
    },
    {
      metric: 'avgRuntimeHours' as keyof KPIMetrics,
      title: 'Average Runtime Hours',
      color: 'purple',
      unit: 'h',
      showReferenceLine: false
    },
    {
      metric: 'avgRemainingCapacityGB' as keyof KPIMetrics,
      title: 'Remaining Capacity GB',
      color: 'rose',
      unit: 'GB',
      showReferenceLine: true,
      referenceValue: 200
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {chartConfigs.map((config) => (
        <MetricsTimeSeriesChart
          key={config.metric}
          data={data}
          metric={config.metric}
          title={config.title}
          color={config.color}
          unit={config.unit}
          dateFilter={dateFilter}
          onDataPointClick={(date, value) => 
            onDataPointClick?.(config.metric, date, value)
          }
          showReferenceLine={config.showReferenceLine}
          referenceValue={config.referenceValue}
          onExpand={() => onChartExpand?.(config.title, config.metric)}
        />
      ))}
    </div>
  );
}
