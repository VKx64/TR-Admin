'use client'

import Header from '@/components/v1/drivers/Header'
import React, { useState, useEffect, useCallback } from 'react'
import pb from '@/services/pocketbase'
import DataTable from '@/components/v1/drivers/DataTable'
import { Skeleton } from '@/components/ui/skeleton'

// Function to fetch drivers data using PocketBase SDK
async function fetchDriversData() {
  try {
    const records = await pb.collection('users').getFullList({
      filter: 'role = "driver"',
      expand: 'driver_details_id',
      sort: '-created',
    });
    console.log("Fetched Drivers:", records);
    return records;
  } catch (error) {
    console.error('Failed to fetch drivers data:', error);
    return [];
  }
}

const DriversPage = () => {
  const [drivers, setDrivers] = useState([])
  const [isLoading, setIsLoading] = useState(true);

  const refreshDrivers = useCallback(async () => {
    setIsLoading(true);
    console.log("Refreshing drivers data...");
    const data = await fetchDriversData();
    setDrivers(data);
    setIsLoading(false);
    console.log("Drivers data refreshed.");
  }, []);

  useEffect(() => {
    refreshDrivers();
  }, [refreshDrivers]);

  return (
    <div className='flex flex-col h-full w-full p-4 bg-white gap-4'>

      {/* Header - Pass refreshDrivers function */}
      <Header onRefresh={refreshDrivers} />

      {/* Drivers Table - Show skeleton while loading */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable drivers={drivers} refreshData={refreshDrivers} />
      )}

    </div>
  )
}

export default DriversPage