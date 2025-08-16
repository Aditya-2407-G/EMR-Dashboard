/**
 * Paginated Cluster Table Component for EMR Dashboard
 * 
 * Displays EMR cluster details in a paginated table with advanced features:
 * - Pagination with configurable page sizes (10, 25, 50, 100)
 * - Search functionality across cluster names and IDs
 * - State-based filtering  
 * - Responsive navigation controls (first, previous, page numbers, next, last)
 * - Auto-reset pagination on filter changes
 * - Real-time item count and pagination status
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import type { EmrCluster } from "../../../shared/schema";

interface ClusterTableProps {
  clusters: EmrCluster[];
  onFilterChange: (filters: { clusterName?: string; state?: string; searchTerm?: string }) => void;
  onRowClick: (clusterId: string) => void;
}

export function ClusterTable({ clusters, onFilterChange, onRowClick }: ClusterTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset to first page when clusters change (due to filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [clusters.length]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
    onFilterChange({ searchTerm: value, state: stateFilter });
  };

  const handleStateFilterChange = (value: string) => {
    const state = value === "all" ? "" : value;
    setStateFilter(state);
    setCurrentPage(1); // Reset to first page on filter change
    onFilterChange({ searchTerm, state });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Calculate pagination
  const totalItems = clusters.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClusters = clusters.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }
    
    return pages;
  };

  const uniqueStates = Array.from(new Set(clusters.map(cluster => cluster.state)));

  return (
    <Card className="bg-white shadow-sm border border-slate-200" data-testid="table-clusters">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Cluster Details</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} clusters
            </p>
          </div>
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
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-24" data-testid="select-items-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
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
              {currentClusters.map((cluster) => {
                // Improved memory usage calculation with validation
                let memoryUsage = 0;
                try {
                  const totalMB = cluster.maxMemoryTotalMB || 0;
                  const allocatedMB = cluster.maxMemoryAllocatedMB || 0;
                  
                  if (totalMB > 0) {
                    if (allocatedMB <= totalMB) {
                      memoryUsage = (allocatedMB / totalMB) * 100;
                    } else {
                      memoryUsage = 100; // Cap at 100% if allocated exceeds total
                    }
                  }
                } catch (error) {
                  console.warn(`Error calculating memory usage for cluster ${cluster.clusterId}:`, error);
                }
                
                // Improved runtime calculation with validation
                let runtimeHours = 0;
                try {
                  if (cluster.endDateTime && cluster.creationDateTime) {
                    const startTime = new Date(cluster.creationDateTime).getTime();
                    const endTime = new Date(cluster.endDateTime).getTime();
                    
                    if (!isNaN(startTime) && !isNaN(endTime) && endTime >= startTime) {
                      runtimeHours = (endTime - startTime) / (1000 * 60 * 60);
                    }
                  }
                } catch (error) {
                  console.warn(`Error calculating runtime for cluster ${cluster.clusterId}:`, error);
                }

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
        
        {/* Pagination Controls */}
        {totalItems > 0 && totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                {/* First Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="w-9 h-9 p-0"
                  data-testid="pagination-first"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                
                {/* Previous Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 p-0"
                  data-testid="pagination-previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {/* Page Numbers */}
                {getPageNumbers().map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-9 h-9 p-0"
                    data-testid={`pagination-page-${pageNum}`}
                  >
                    {pageNum}
                  </Button>
                ))}
                
                {/* Next Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 p-0"
                  data-testid="pagination-next"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                
                {/* Last Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 p-0"
                  data-testid="pagination-last"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-700">Items per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-20 h-8" data-testid="pagination-items-per-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
