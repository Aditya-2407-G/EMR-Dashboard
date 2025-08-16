import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expand } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { processYarnMemoryData } from "@/lib/emrDataProcessor";
import type { EmrCluster } from "../../../../shared/schema";

interface YarnMemoryChartProps {
  clusters: EmrCluster[];
  onDataPointClick: (clusterId: string) => void;
}

export function YarnMemoryChart({ clusters, onDataPointClick }: YarnMemoryChartProps) {
  const data = processYarnMemoryData(clusters);

  const handleDataPointClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clusterId = data.activePayload[0].payload.clusterId;
      if (clusterId) {
        onDataPointClick(clusterId);
      }
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200" data-testid="chart-yarn-memory">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">YARN Memory Available</CardTitle>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
          <Expand className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} onClick={handleDataPointClick}>
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
                label={{ value: 'YARN Available %', angle: -90, position: 'insideLeft' }}
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
                  return [`${value.toFixed(1)}% (Range: ${payload.minYarn?.toFixed(1)}%-${payload.maxYarn?.toFixed(1)}%)`, 'Daily Avg YARN Available'];
                }}
              />
              <Area
                type="monotone"
                dataKey="yarnMemoryAvailable"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
