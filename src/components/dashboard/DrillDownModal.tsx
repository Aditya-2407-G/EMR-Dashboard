import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

import type { EmrCluster } from "../../../shared/schema";

interface DrillDownModalProps {
  clusterId: string | null;
  onClose: () => void;
  allClusters: EmrCluster[];
}

export function DrillDownModal({ clusterId, onClose, allClusters }: DrillDownModalProps) {
  const cluster = allClusters.find(c => c.clusterId === clusterId);
  
  if (!cluster) {
    return null;
  }

  // Get historical data for the same cluster name
  const historicalData = allClusters
    .filter(c => c.clusterName === cluster.clusterName)
    .map(c => ({
      date: format(new Date(c.creationDateTime), 'MM/dd'),
      memoryUsage: (c.maxMemoryTotalMB && c.maxMemoryTotalMB > 0) ? ((c.maxMemoryAllocatedMB || 0) / c.maxMemoryTotalMB) * 100 : 0,
      clusterId: c.clusterId,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const runtimeHours = cluster.endDateTime 
    ? Math.abs(new Date(cluster.endDateTime).getTime() - new Date(cluster.creationDateTime).getTime()) / (1000 * 60 * 60)
    : 0;

  const memoryUsagePercentage = (cluster.maxMemoryTotalMB && cluster.maxMemoryTotalMB > 0) 
    ? ((cluster.maxMemoryAllocatedMB || 0) / cluster.maxMemoryTotalMB) * 100 
    : 0;

  const memoryEfficiency = memoryUsagePercentage;

  return (
    <Dialog open={!!clusterId} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="modal-drill-down" aria-describedby="cluster-details">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            {cluster.clusterName} - {cluster.clusterId}
          </DialogTitle>
          <div id="cluster-details" className="sr-only">
            Detailed information and performance metrics for the selected EMR cluster
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {/* Cluster Information */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-900">Cluster Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {cluster.clusterName}</div>
              <div><span className="font-medium">ID:</span> {cluster.clusterId}</div>
              <div>
                <span className="font-medium">State:</span> 
                <Badge 
                  variant={cluster.state === 'RUNNING' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {cluster.state}
                </Badge>
              </div>
              <div><span className="font-medium">Created:</span> {format(new Date(cluster.creationDateTime), 'PPpp')}</div>
              {cluster.endDateTime && (
                <div><span className="font-medium">Ended:</span> {format(new Date(cluster.endDateTime), 'PPpp')}</div>
              )}
            </CardContent>
          </Card>

          {/* Memory Metrics */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-emerald-900">Memory Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-medium">Total Memory:</span> {((cluster.maxMemoryTotalMB || 0) / 1024).toFixed(0)} GB</div>
              <div><span className="font-medium">Allocated Memory:</span> {((cluster.maxMemoryAllocatedMB || 0) / 1024).toFixed(0)} GB</div>
              <div><span className="font-medium">Usage Percentage:</span> {memoryUsagePercentage.toFixed(1)}%</div>
              <div><span className="font-medium">Remaining Capacity:</span> {cluster.minCapacityRemainingGB} GB</div>
              <div><span className="font-medium">YARN Available:</span> {cluster.minYARNMemoryAvailablePercentage}%</div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-purple-900">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-medium">Runtime:</span> {runtimeHours.toFixed(1)} hours</div>
              <div><span className="font-medium">Unhealthy Nodes:</span> {cluster.maxMRUnhealthyNodes}</div>
              <div><span className="font-medium">Memory Efficiency:</span> {memoryEfficiency.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Historical Performance Chart */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Historical Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData}>
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
                    formatter={(value: any) => [`${value.toFixed(1)}%`, 'Memory Usage']}
                  />
                  <Line
                    type="monotone"
                    dataKey="memoryUsage"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
