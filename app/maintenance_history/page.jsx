'use client'

import Header from '@/components/v1/maintenance_history/Header'
import React, { useState, useEffect, useCallback } from 'react'
import pb from '@/services/pocketbase'
import DataTable from '@/components/v1/maintenance_history/DataTable'
import { Skeleton } from '@/components/ui/skeleton'

// Function to fetch maintenance records data using PocketBase SDK
async function fetchMaintenanceHistoryData() {
  try {
    const records = await pb.collection('maintenance_records').getFullList({
      expand: 'truck,maintenance_type,logging_admin,associated_request',
      sort: '-completion_date',
    });
    console.log("Fetched Maintenance History:", records);
    return records;
  } catch (error) {
    console.error('Failed to fetch maintenance history data:', error);
    return [];
  }
}

const MaintenanceHistoryPage = () => {
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true);

  const refreshRecords = useCallback(async () => {
    setIsLoading(true);
    console.log("Refreshing maintenance history data...");
    const data = await fetchMaintenanceHistoryData();
    setRecords(data);
    setIsLoading(false);
    console.log("Maintenance history data refreshed.");
  }, []);

  useEffect(() => {
    refreshRecords();
  }, [refreshRecords]);

  return (
    <div className='flex flex-col h-full w-full p-4 bg-white gap-4'>

      {/* Header - Pass refreshRecords function */}
      <Header onRefresh={refreshRecords} />

      {/* Maintenance History Table - Show skeleton while loading */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable records={records} refreshData={refreshRecords} />
      )}

    </div>
  )
}

export default MaintenanceHistoryPage