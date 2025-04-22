'use client'

import Header from '@/components/v1/maintenance/Header'
import DataTable from '@/components/v1/maintenance/DataTable'
import React, { useState, useEffect, useCallback } from 'react'
import pb from '@/services/pocketbase'
import { Skeleton } from '@/components/ui/skeleton'

// Function to fetch maintenance types data using PocketBase SDK
async function fetchMaintenanceTypesData() {
  try {
    const records = await pb.collection('maintenance_type').getFullList({
      sort: '-created',
      requestKey: null,
    });
    console.log("Fetched Maintenance Types:", records);
    return records;
  } catch (error) {
    console.error('Failed to fetch maintenance types data:', error);
    return [];
  }
}

const MaintenancePage = () => {
  const [maintenanceTypes, setMaintenanceTypes] = useState([])
  const [isLoading, setIsLoading] = useState(true);

  const refreshMaintenanceTypes = useCallback(async () => {
    setIsLoading(true);
    console.log("Refreshing maintenance types data...");
    const data = await fetchMaintenanceTypesData();
    setMaintenanceTypes(data);
    setIsLoading(false);
    console.log("Maintenance types data refreshed.");
  }, []);

  useEffect(() => {
    refreshMaintenanceTypes();
  }, [refreshMaintenanceTypes]);

  return (
    <div className='flex flex-col h-full w-full p-4 bg-white gap-4'>
      {/* Header - Pass refreshMaintenanceTypes function */}
      <Header onRefresh={refreshMaintenanceTypes} />

      {/* Maintenance Types Table - Show skeleton while loading */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable maintenanceTypes={maintenanceTypes} refreshData={refreshMaintenanceTypes} />
      )}
    </div>
  )
}

export default MaintenancePage