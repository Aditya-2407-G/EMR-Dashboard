/**
 * Chart Expand Modal Component for EMR Dashboard
 * 
 * Provides a full-screen modal view for charts with enhanced sizing and controls.
 * Supports all chart types used in the dashboard.
 */

import { useState } from 'react';
import { X, Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ChartExpandModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  chartData?: any; // For potential CSV export functionality
}

/**
 * Modal component for expanding charts to full screen view
 */
export function ChartExpandModal({
  isOpen,
  onClose,
  title,
  children,
  chartData
}: ChartExpandModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  /**
   * Handles CSV export of chart data
   */
  const handleExportChart = () => {
    if (!chartData || !Array.isArray(chartData)) {
      console.warn('No chart data available for export');
      return;
    }

    try {
      // Convert chart data to CSV format
      const headers = Object.keys(chartData[0] || {});
      const csvHeader = headers.join(',');
      
      const csvRows = chartData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle different data types
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value?.toString() || '';
        }).join(',')
      );

      const csvContent = [csvHeader, ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting chart data:', error);
    }
  };

  /**
   * Toggles fullscreen mode
   */
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
        <DialogHeader className="flex flex-row items-center justify-between p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold text-slate-900">
            {title} - Expanded View
          </DialogTitle>
          
          <div className="flex items-center space-x-2">
            {chartData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportChart}
                className="text-slate-600 hover:text-slate-800"
                title="Export chart data as CSV"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="text-slate-600 hover:text-slate-800"
              title="Toggle fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              title="Close expanded view"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 p-6 overflow-hidden">
          <div className="w-full h-[calc(95vh-120px)]">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing chart expansion state
 */
export function useChartExpand() {
  const [expandedChart, setExpandedChart] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    data?: any;
  }>({
    isOpen: false,
    title: '',
    content: null,
    data: undefined
  });

  const openChart = (title: string, content: React.ReactNode, data?: any) => {
    setExpandedChart({
      isOpen: true,
      title,
      content,
      data
    });
  };

  const closeChart = () => {
    setExpandedChart({
      isOpen: false,
      title: '',
      content: null,
      data: undefined
    });
  };

  return {
    expandedChart,
    openChart,
    closeChart
  };
}
