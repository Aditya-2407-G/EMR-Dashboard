import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expand } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { processRuntimeAnalysisData } from "@/lib/emrDataProcessor";
import type { EmrCluster } from "../../../../shared/schema";

interface RuntimeAnalysisChartProps {
  clusters: EmrCluster[];
  onBarClick: (clusterName: string) => void;
  selectedClusterName?: string | null;
  onExpand?: () => void;
}

export function RuntimeAnalysisChart({ clusters, onBarClick, selectedClusterName, onExpand }: RuntimeAnalysisChartProps) {
  const data = processRuntimeAnalysisData(clusters);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clusterName = data.activePayload[0].payload.name;
      if (clusterName) {
        onBarClick(clusterName);
      }
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200" data-testid="chart-runtime-analysis">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Runtime Analysis</CardTitle>
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
            <BarChart data={data} onClick={handleBarClick}>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                label={{ value: 'Runtime Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: any) => [`${value.toFixed(1)}h`, 'Total Runtime']}
                labelFormatter={(value) => `Cluster: ${value}`}
              />
              <Bar
                dataKey="totalRuntime"
                cursor="pointer"
              >
                {data.map((entry, index) => {
                  const isSelected = selectedClusterName === entry.name;
                  const hasSelection = selectedClusterName !== null && selectedClusterName !== undefined;
                  const shouldFade = hasSelection && !isSelected;
                  
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isSelected ? "#dc2626" : "#ef4444"}
                      stroke={isSelected ? "#991b1b" : "#ef4444"}
                      strokeWidth={isSelected ? 3 : 1}
                      data-chart-element="bar-segment"
                      style={{
                        opacity: shouldFade ? 0.25 : 1,
                        filter: isSelected ? 'url(#glow)' : shouldFade ? 'brightness(0.7)' : 'none',
                        transform: isSelected ? 'scale(1.02)' : shouldFade ? 'scale(0.98)' : 'scale(1)',
                        transformOrigin: '50% 50%',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
