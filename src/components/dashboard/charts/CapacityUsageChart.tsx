import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expand } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { processCapacityUsageData } from "@/lib/emrDataProcessor";
import type { EmrCluster } from "../../../../shared/schema";

interface CapacityUsageChartProps {
  clusters: EmrCluster[];
  onDataPointClick: (clusterId: string) => void;
  onExpand?: () => void;
}

export function CapacityUsageChart({ clusters, onDataPointClick, onExpand }: CapacityUsageChartProps) {
  const data = processCapacityUsageData(clusters);

  const handleDataPointClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clusterId = data.activePayload[0].payload.clusterId;
      if (clusterId) {
        onDataPointClick(clusterId);
      }
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200" data-testid="chart-capacity-usage">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Memory Capacity vs Usage</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-slate-400 hover:text-slate-600"
          onClick={onExpand}
          title="Expand chart"
        >
          <Expand className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={data} onClick={handleDataPointClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="totalCapacityGB"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                label={{ value: 'Total Capacity (GB)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                dataKey="allocatedMemoryGB"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                label={{ value: 'Allocated Memory (GB)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: any, name: string, props: any) => {
                  const payload = props.payload;
                  if (name === 'totalCapacityGB') return [`${value.toFixed(1)} GB`, 'Total Capacity'];
                  if (name === 'allocatedMemoryGB') return [`${value.toFixed(1)} GB (${payload.clusterCount || 1} clusters)`, 'Allocated Memory'];
                  return [value, name];
                }}
                labelFormatter={() => ''}
              />
              <Scatter
                dataKey="allocatedMemoryGB"
                fill="#f59e0b"
                stroke="#f59e0b"
                strokeWidth={2}
                r={8}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
