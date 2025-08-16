# EMR Dashboard Metrics Documentation

## 📊 **Complete Metrics & Calculations Reference**

This document provides a comprehensive overview of all metrics, calculations, and formulas used in the EMR Dashboard after the recent sanity check fixes.

---

## 🗂️ **Data Source Fields (JSON)**

| Field Name | Type | Usage | Description |
|------------|------|-------|-------------|
| `earliest_time` | string | ❌ Not used | Reporting period start |
| `latest_time` | string | ❌ Not used | Reporting period end |
| `ClusterName` | string | ✅ Grouping | Cluster identifier for aggregation |
| `ClusterId` | string | ✅ Primary Key | Unique cluster instance ID |
| `CreationDateTime` | string | ✅ Calculations | Cluster start time (ISO format) |
| `EndDateTime` | string | ✅ Calculations | Cluster end time (ISO format) |
| `MinCapacityRemainingGB` | number | ✅ Direct usage | Remaining storage capacity |
| `MinYARNMemoryAvailablePercentage` | number | ✅ Direct usage | YARN memory availability |
| `MaxMemoryAllocatedMB` | number | ✅ Calculations | Peak allocated memory |
| `MaxMemoryTotalMB` | number | ✅ Calculations | Total available memory |
| `MaxMRUnhealthyNodes` | number | ✅ Health scoring | Peak unhealthy node count |
| `State` | string | ✅ Filtering | Cluster state (RUNNING, TERMINATED, etc.) |

---

## 🧮 **Core Calculation Formulas (Fixed & Improved)**

### **1. Memory Usage Percentage**
```typescript
// Formula: (Allocated Memory / Total Memory) × 100
// With validation and error handling
function calculateMemoryUsagePercent(allocatedMB: number, totalMB: number): number {
  if (typeof allocatedMB !== 'number' || typeof totalMB !== 'number') return 0;
  if (totalMB === 0) return 0;
  if (allocatedMB < 0 || totalMB < 0) return 0;
  if (allocatedMB > totalMB) return 100; // Cap at 100% for data inconsistencies
  
  return (allocatedMB / totalMB) * 100;
}
```

### **2. Runtime Hours (Improved)**
```typescript
// Formula: (End Time - Start Time) in milliseconds ÷ (1000 × 60 × 60)
// With robust error handling
function calculateRuntimeHours(creationDateTime: string, endDateTime: string): number {
  if (!creationDateTime || !endDateTime) return 0;
  
  const startDate = parseISO(creationDateTime);
  const endDate = parseISO(endDateTime);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  if (endDate < startDate) return 0; // Invalid time range
  
  return Math.max(0, differenceInHours(endDate, startDate));
}
```

### **3. Average Calculation (Standardized)**
```typescript
// Standardized across all components with validation
function calculateAverage(numbers: number[]): number {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  
  // Filter out invalid values (NaN, null, undefined, infinite)
  const validNumbers = numbers.filter(num => 
    typeof num === 'number' && !isNaN(num) && isFinite(num)
  );
  
  if (validNumbers.length === 0) return 0;
  return validNumbers.reduce((sum, num) => sum + num, 0) / validNumbers.length;
}
```

---

## 📈 **KPI Dashboard Cards (Fixed)**

### **Card 1: Avg Memory Usage %**
```typescript
avgMemoryUsagePercent = calculateAverage(
  clusters.map(cluster => calculateMemoryUsagePercent(
    cluster.maxMemoryAllocatedMB || 0, 
    cluster.maxMemoryTotalMB || 0
  ))
)
```

### **Card 2: Avg YARN Avail %**
```typescript
avgYARNMemoryAvailablePercent = calculateAverage(
  clusters.map(cluster => cluster.minYARNMemoryAvailablePercentage || 0)
)
```

### **Card 3: Avg Runtime Hours**
```typescript
avgRuntimeHours = calculateAverage(
  clusters.map(cluster => calculateRuntimeHours(
    cluster.creationDateTime, 
    cluster.endDateTime
  ))
)
```

### **Card 4: Avg Remaining Capacity GB**
```typescript
avgRemainingCapacityGB = calculateAverage(
  clusters.map(cluster => cluster.minCapacityRemainingGB || 0)
)
```

### **Card 5: Cluster Count**
```typescript
clusterCount = new Set(clusters.map(cluster => cluster.clusterName)).size
```

---

## 🏥 **Health Scoring (Enhanced)**

### **Daily Health Score Formula**
```typescript
// Updated to include unhealthy nodes penalty
function computeHealthScore(dailyMetrics: DailyMetrics): number {
  const memoryPenalty = Math.max(0, avgMemoryUsagePercent - 80) * 1.2;        // >80%
  const yarnPenalty = Math.max(0, 30 - avgYARNMemoryAvailablePercent) * 1.5; // <30%
  const capacityPenalty = Math.max(0, 200 - avgRemainingCapacityGB) * 0.1;   // <200GB
  const unhealthyNodesPenalty = avgUnhealthyNodes * 2.0;                     // NEW: Any unhealthy nodes
  
  const rawScore = 100 - (memoryPenalty + yarnPenalty + capacityPenalty + unhealthyNodesPenalty);
  return Math.max(0, Math.min(100, rawScore)); // Clamp 0-100
}
```

### **Health Score Thresholds**
- **90-100**: Excellent - All systems optimal
- **75-89**: Good - Minor issues, monitoring recommended  
- **60-74**: Fair - Some concerns, investigation needed
- **40-59**: Poor - Multiple issues, action required
- **0-39**: Critical - Immediate attention needed

---

## 🔧 **Fixed Issues Summary**

### **✅ Issue 1: Corrected "Capacity Used" Metric**
- **Before**: Misleadingly summed `minCapacityRemainingGB` and called it "capacityUsed"
- **After**: Correctly named `totalRemainingCapacityGB` to reflect actual meaning
- **Impact**: Eliminates confusion about whether metric shows used vs. remaining capacity

### **✅ Issue 2: Standardized Averaging Methods**
- **Before**: Different components used different averaging approaches
- **After**: Single `calculateAverage()` function with validation used everywhere
- **Impact**: Consistent calculations across all dashboard components

### **✅ Issue 3: Enhanced Error Handling**
- **Before**: Missing validation for date parsing and division by zero
- **After**: Comprehensive error handling with logging and fallbacks
- **Impact**: Dashboard remains stable with invalid/inconsistent data

### **✅ Issue 4: Utilized Unused Data Field**
- **Before**: `MaxMRUnhealthyNodes` field ignored completely
- **After**: Integrated into health scoring with 2.0x penalty multiplier
- **Impact**: More accurate health assessment considering node failures

### **✅ Issue 5: Added Data Validation**
- **Before**: No consistency checks (e.g., allocated > total memory)
- **After**: Validation with warnings and sensible fallbacks
- **Impact**: Better data quality assurance and debugging capabilities

---

## 📤 **Export Formats**

### **CSV Export Headers (Updated)**
```
Date, Avg Memory Usage %, Avg YARN Memory Available %, Avg Runtime Hours, 
Avg Remaining Capacity GB, Avg Unhealthy Nodes, Cluster Count, Clusters
```

### **Individual Cluster Export**
```
Cluster Name, Cluster ID, State, Creation Date, End Date, 
Memory Usage %, YARN Available %, Runtime Hours, Capacity Remaining GB
```

---

## ⚡ **Performance Optimizations**

1. **Filtered Calculations**: Only valid data included in averages
2. **Error Boundaries**: Graceful degradation for bad data
3. **Consistent Typing**: Full TypeScript validation
4. **Memory Efficient**: No unnecessary data duplication
5. **Logging**: Console warnings for data quality issues

---

## 📝 **Data Quality Checks**

The dashboard now performs these validation checks:

- ✅ Memory values are non-negative numbers
- ✅ Allocated memory doesn't exceed total memory (with warning)
- ✅ Date ranges are logical (end >= start)
- ✅ Date strings are valid ISO format
- ✅ Numeric fields are finite values
- ✅ Array inputs are validated before processing

---

## 🎯 **Best Practices for Data Quality**

1. **Consistent Date Formats**: Use ISO 8601 format for all timestamps
2. **Validate Ranges**: Ensure allocated ≤ total for memory fields
3. **Handle Missing Data**: Provide sensible defaults (0 for missing values)
4. **Monitor Console**: Check browser console for data quality warnings
5. **Regular Audits**: Review exported data for anomalies

---

*Last Updated: December 2024*
*Version: 2.0 (Post-Sanity Check Fixes)*
