import { z } from "zod";

/**
 * EMR Cluster interface representing the structure of EMR cluster data
 * Used throughout the application for type safety and data validation
 */
export interface EmrCluster {
  id: string;
  clusterName: string;
  clusterId: string;
  creationDateTime: Date;
  endDateTime?: Date;
  minCapacityRemainingGB?: number;
  minYARNMemoryAvailablePercentage?: number;
  maxMemoryAllocatedMB?: number;
  maxMemoryTotalMB?: number;
  maxMRUnhealthyNodes?: number;
  state: string;
  rawData?: any;
  uploadedAt?: Date;
}

/**
 * EMR Data Upload interface for tracking file uploads
 */
export interface EmrDataUpload {
  id: string;
  filename: string;
  uploadedAt?: Date;
  clusterCount?: number;
  processingStatus?: string;
}

/**
 * Insert types for creating new EMR clusters and uploads
 * Omits auto-generated fields like id and uploadedAt
 */
export type InsertEmrCluster = Omit<EmrCluster, 'id' | 'uploadedAt'>;
export type InsertEmrDataUpload = Omit<EmrDataUpload, 'id' | 'uploadedAt'>;

// Raw EMR data structure from JSON uploads
export const rawEmrDataSchema = z.object({
  earliest_time: z.string(),
  latest_time: z.string(),
  ClusterName: z.string(),
  ClusterId: z.string(),
  CreationDateTime: z.string(),
  EndDateTime: z.string().optional(),
  MinCapacityRemainingGB: z.number(),
  MinYARNMemoryAvailablePercentage: z.number(),
  MaxMemoryAllocatedMB: z.number(),
  MaxMemoryTotalMB: z.number(),
  MaxMRUnhealthyNodes: z.number(),
  State: z.string(),
});

export type RawEmrData = z.infer<typeof rawEmrDataSchema>;
