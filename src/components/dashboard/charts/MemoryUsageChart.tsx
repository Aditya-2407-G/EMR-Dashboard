import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Expand } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { processMemoryUsageData } from "@/lib/emrDataProcessor";
import type { EmrCluster } from "../../../../shared/schema";

interface MemoryUsageChartProps {
  clusters: EmrCluster[];
  onDataPointClick: (clusterId: string) => void;
}

export function MemoryUsageChart({ clusters, onDataPointClick }: MemoryUsageChartProps) {
  const data = processMemoryUsageData(clusters);

  const handleDataPointClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clusterId = data.activePayload[0].payload.clusterId;
      if (clusterId) {
        onDataPointClick(clusterId);
      }
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200" data-testid="chart-memory-usage">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-900">Memory Usage Trends</CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">Time Series</Badge>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
            <Expand className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} onClick={handleDataPointClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                label={{ value: 'Memory Usage %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                labelFormatter={(value) => `Date: ${value}`}
                formatter={(value: any, _name: string, props: any) => {
                  const payload = props.payload;
                  return [
                    `${value.toFixed(1)}% (${payload.clusterCount || 1} clusters)`,
                    'Daily Avg Memory Usage'
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="memoryUsage"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
