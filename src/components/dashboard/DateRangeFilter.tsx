/**
 * Date Range Filter Component for EMR Dashboard
 * 
 * Provides date filtering options for EMR metrics including:
 * - Daily view (last 30 days)
 * - Weekly view (last 12 weeks) 
 * - Custom date range selection
 */

import { useState } from 'react';
import { Calendar, ChevronDown, CalendarDays, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
// import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, subDays, subWeeks, startOfDay, endOfDay, parse } from 'date-fns';
import { Input } from '@/components/ui/input';
import type { DateRange as CalendarDateRange } from 'react-day-picker';

export type DateFilterType = 'daily' | 'weekly' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateFilterOption {
  type: DateFilterType;
  label: string;
  range: DateRange;
  description: string;
}

interface DateRangeFilterProps {
  onFilterChange: (filter: DateFilterOption) => void;
  dataRange?: DateRange; // Available data date range
  selectedFilter?: DateFilterOption;
}

/**
 * DateRangeFilter component with preset and custom date range options
 */
export function DateRangeFilter({ 
  onFilterChange, 
  dataRange,
  selectedFilter 
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<CalendarDateRange | undefined>();

  /**
   * Safely updates the internal custom date range ensuring start <= end
   */
  const updateCustomRange = (from?: Date, to?: Date) => {
    if (from && to && from > to) {
      setCustomDateRange({ from: to, to: from });
    } else {
      setCustomDateRange({ from, to });
    }
  };

  // Default date ranges constrained by available data
  const today = new Date();
  const dataStart = dataRange?.startDate || startOfDay(subDays(today, 30));
  const dataEnd = dataRange?.endDate || endOfDay(today);
  
  // Helper function to get constrained start date
  const getConstrainedStartDate = (idealStart: Date): Date => {
    if (!dataRange) return idealStart;
    return idealStart < dataStart ? dataStart : idealStart;
  };
  
  const defaultFilters: DateFilterOption[] = [
    {
      type: 'daily',
      label: 'Daily View',
      range: {
        startDate: startOfDay(getConstrainedStartDate(subDays(dataEnd, 30))),
        endDate: endOfDay(dataEnd)
      },
      description: dataRange ? 
        `Daily aggregation - Available data range` : 
        'Last 30 days - Daily aggregation'
    },
    {
      type: 'weekly', 
      label: 'Weekly View',
      range: {
        startDate: startOfDay(getConstrainedStartDate(subWeeks(dataEnd, 12))),
        endDate: endOfDay(dataEnd)
      },
      description: dataRange ?
        `Weekly aggregation - Available data range` :
        'Last 12 weeks - Weekly aggregation'
    }
  ];

  // Handle preset filter selection
  const handlePresetFilter = (filter: DateFilterOption) => {
    onFilterChange(filter);
    setIsOpen(false);
  };

  // Handle custom date range
  const handleCustomRange = () => {
    if (!customDateRange?.from || !customDateRange?.to) return;
    
    const customFilter: DateFilterOption = {
      type: 'custom',
      label: 'Custom Range',
      range: {
        startDate: startOfDay(customDateRange.from),
        endDate: endOfDay(customDateRange.to)
      },
      description: `${format(customDateRange.from, 'MMM d, yyyy')} - ${format(customDateRange.to, 'MMM d, yyyy')}`
    };
    
    onFilterChange(customFilter);
    setIsOpen(false);
    // Clear the custom dates after applying
    setCustomDateRange(undefined);
  };

  // Get display text for current filter
  const getDisplayText = () => {
    if (!selectedFilter) return 'Select Date Range';
    
    if (selectedFilter.type === 'custom') {
      return `${format(selectedFilter.range.startDate, 'MMM d')} - ${format(selectedFilter.range.endDate, 'MMM d, yyyy')}`;
    }
    
    return selectedFilter.label;
  };

  // Check if date is within available data range
  const isDateInRange = (date: Date) => {
    if (!dataRange) return true;
    return date >= dataRange.startDate && date <= dataRange.endDate;
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Date Range:</span>
          </div>
          
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={cn(
                  "justify-between min-w-[180px]",
                  !selectedFilter && "text-slate-500"
                )}
              >
                <span className="truncate">{getDisplayText()}</span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-[680px] p-4" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-slate-900">Preset Ranges</h4>
                  
                  {defaultFilters.map((filter) => (
                    <Button
                      key={filter.type}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start h-auto p-3 text-left",
                        selectedFilter?.type === filter.type && "bg-blue-50 border-blue-200"
                      )}
                      onClick={() => handlePresetFilter(filter)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {filter.type === 'daily' ? (
                            <CalendarDays className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-slate-900">{filter.label}</div>
                          <div className="text-xs text-slate-600">{filter.description}</div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-slate-900">Custom Range</h4>
                    <p className="text-xs text-slate-600">Pick dates on the calendar or type them below</p>

                    <div className="grid grid-cols-1 ">

                      {/* Manual Inputs */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700">Start date</label>
                            <Input
                              type="date"
                              value={customDateRange?.from ? format(customDateRange.from, 'yyyy-MM-dd') : ''}
                              min={dataRange ? format(dataRange.startDate, 'yyyy-MM-dd') : undefined}
                              max={dataRange ? format(dataRange.endDate, 'yyyy-MM-dd') : format(today, 'yyyy-MM-dd')}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (!value) {
                                  updateCustomRange(undefined, customDateRange?.to);
                                  return;
                                }
                                const parsed = parse(value, 'yyyy-MM-dd', new Date());
                                if (!isNaN(parsed.getTime()) && isDateInRange(parsed)) {
                                  updateCustomRange(parsed, customDateRange?.to);
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700">End date</label>
                            <Input
                              type="date"
                              value={customDateRange?.to ? format(customDateRange.to, 'yyyy-MM-dd') : ''}
                              min={dataRange ? format(dataRange.startDate, 'yyyy-MM-dd') : undefined}
                              max={dataRange ? format(dataRange.endDate, 'yyyy-MM-dd') : format(today, 'yyyy-MM-dd')}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (!value) {
                                  updateCustomRange(customDateRange?.from, undefined);
                                  return;
                                }
                                const parsed = parse(value, 'yyyy-MM-dd', new Date());
                                if (!isNaN(parsed.getTime()) && isDateInRange(parsed)) {
                                  updateCustomRange(customDateRange?.from, parsed);
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Selected Range Display */}
                        {customDateRange?.from && customDateRange?.to && (
                          <div className="text-sm text-slate-700 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                            <div className="font-medium">Selected Range:</div>
                            <div>{format(customDateRange.from, 'MMM d, yyyy')} - {format(customDateRange.to, 'MMM d, yyyy')}</div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button 
                            size="sm"
                            className="flex-1"
                            disabled={!customDateRange?.from || !customDateRange?.to}
                            onClick={handleCustomRange}
                          >
                            Apply
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setCustomDateRange(undefined)}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </div>
                
                {dataRange && (
                  <div className="border-t pt-3">
                    <div className="text-xs text-slate-500">
                      Available data: {format(dataRange.startDate, 'MMM d, yyyy')} - {format(dataRange.endDate, 'MMM d, yyyy')}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
