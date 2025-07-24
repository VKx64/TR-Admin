'use client'

import Header from '@/components/v1/drivers/Header'
import React, { useState, useEffect, useCallback } from 'react'
import pb from '@/services/pocketbase'
import DataTable from '@/components/v1/drivers/DataTable'
import { Skeleton } from '@/components/ui/skeleton'

// Function to fetch drivers data using PocketBase SDK
async function fetchDriversData(showArchived = false) {
  try {
    const filter = showArchived
      ? 'role = "driver" && driver_details_id.is_archived = true'
      : 'role = "driver" && driver_details_id.is_archived != true';

    const records = await pb.collection('users').getFullList({
      filter: filter,
      expand: 'driver_details_id',
      sort: '-created',
    });
    console.log(`Fetched ${showArchived ? 'Archived' : 'Active'} Drivers:`, records);
    return records;
  } catch (error) {
    console.error('Failed to fetch drivers data:', error);
    return [];
  }
}

const DriversPage = () => {
  const [drivers, setDrivers] = useState([])
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const refreshDrivers = useCallback(async () => {
    setIsLoading(true);
    console.log(`Refreshing ${showArchived ? 'archived' : 'active'} drivers data...`);
    const data = await fetchDriversData(showArchived);
    setDrivers(data);
    setIsLoading(false);
    console.log("Drivers data refreshed.");
  }, [showArchived]);

  const handleToggleArchived = useCallback(() => {
    setShowArchived(prev => !prev);
  }, []);

  useEffect(() => {
    refreshDrivers();
  }, [refreshDrivers]);

  return (
    <div className='flex flex-col h-full w-full p-4 bg-white gap-4'>

      {/* Header - Pass refreshDrivers function and archive state */}
      <Header
        onRefresh={refreshDrivers}
        showArchived={showArchived}
        onToggleArchived={handleToggleArchived}
      />

      {/* Drivers Table - Show skeleton while loading */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable
          drivers={drivers}
          refreshData={refreshDrivers}
          showArchived={showArchived}
        />
      )}

    </div>
  )
}

export default DriversPage