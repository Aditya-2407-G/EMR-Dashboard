import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { EmrCluster } from "../../../shared/schema";

interface ClusterTableProps {
  clusters: EmrCluster[];
  onFilterChange: (filters: { clusterName?: string; state?: string; searchTerm?: string }) => void;
  onRowClick: (clusterId: string) => void;
}

export function ClusterTable({ clusters, onFilterChange, onRowClick }: ClusterTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onFilterChange({ searchTerm: value, state: stateFilter });
  };

  const handleStateFilterChange = (value: string) => {
    const state = value === "all" ? "" : value;
    setStateFilter(state);
    onFilterChange({ searchTerm, state });
  };

  const uniqueStates = Array.from(new Set(clusters.map(cluster => cluster.state)));

  return (
    <Card className="bg-white shadow-sm border border-slate-200" data-testid="table-clusters">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">Cluster Details</CardTitle>
          <div className="flex items-center space-x-3">
            <Input
              placeholder="Search clusters..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-64"
              data-testid="input-search-clusters"
            />
            <Select value={stateFilter} onValueChange={handleStateFilterChange}>
              <SelectTrigger className="w-40" data-testid="select-state-filter">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cluster Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cluster ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Memory Usage %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">YARN Available %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Runtime</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {clusters.map((cluster) => {
                const memoryUsage = (cluster.maxMemoryTotalMB && cluster.maxMemoryTotalMB > 0) 
                  ? ((cluster.maxMemoryAllocatedMB || 0) / cluster.maxMemoryTotalMB) * 100 
                  : 0;
                
                const runtimeHours = cluster.endDateTime 
                  ? Math.abs(new Date(cluster.endDateTime).getTime() - new Date(cluster.creationDateTime).getTime()) / (1000 * 60 * 60)
                  : 0;

                return (
                  <tr 
                    key={cluster.id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onRowClick(cluster.clusterId)}
                    data-testid={`row-cluster-${cluster.clusterId}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${cluster.state === 'RUNNING' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                        <span className="text-sm font-medium text-slate-900">{cluster.clusterName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{cluster.clusterId}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={cluster.state === 'RUNNING' ? 'default' : 'secondary'}>
                        {cluster.state}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{memoryUsage.toFixed(1)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{cluster.minYARNMemoryAvailablePercentage}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{runtimeHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(cluster.clusterId);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        data-testid={`button-view-details-${cluster.clusterId}`}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {clusters.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No clusters found. Upload data to get started.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
