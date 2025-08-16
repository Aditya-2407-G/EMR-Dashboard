import { useEmrDataContext } from "@/context/EmrDataContext";

/**
 * Custom hook for accessing EMR data from context
 * This is a wrapper around useEmrDataContext for backward compatibility
 * @returns Object containing clusters data, analytics, loading state, and refetch function
 */
export function useEmrData() {
  return useEmrDataContext();
}
