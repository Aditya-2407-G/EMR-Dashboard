import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expand } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { processClusterDistributionData } from "@/lib/emrDataProcessor";
import type { EmrCluster } from "../../../../shared/schema";

interface ClusterDistributionChartProps {
  clusters: EmrCluster[];
  onSegmentClick: (clusterName: string) => void;
  selectedClusterName?: string | null;
  onExpand?: () => void;
}

const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ClusterDistributionChart({ clusters, onSegmentClick, selectedClusterName, onExpand }: ClusterDistributionChartProps) {
  const data = processClusterDistributionData(clusters);

  const handleCellClick = (entry: any) => {
    if (entry && entry.name) {
      onSegmentClick(entry.name);
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200" data-testid="chart-cluster-distribution">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Cluster Distribution</CardTitle>
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
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                onClick={handleCellClick}
                cursor="pointer"
              >
                {data.map((entry, index) => {
                  const isSelected = selectedClusterName === entry.name;
                  const hasSelection = selectedClusterName !== null && selectedClusterName !== undefined;
                  const shouldFade = hasSelection && !isSelected;
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke={isSelected ? "#1f2937" : "transparent"}
                      strokeWidth={isSelected ? 3 : 0}
                      data-chart-element="pie-segment"
                      style={{
                        opacity: shouldFade ? 0.25 : 1,
                        filter: isSelected ? 'brightness(1.1) drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : shouldFade ? 'brightness(0.7)' : 'none',
                        transform: isSelected ? 'scale(1.05)' : shouldFade ? 'scale(0.98)' : 'scale(1)',
                        transformOrigin: '50% 50%',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  );
                })}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: any) => [`${value} clusters`, 'Count']}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
