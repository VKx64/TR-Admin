'use client'

import Header from '@/components/v1/maintenance_request/Header'
import React, { useState, useEffect, useCallback } from 'react'
import pb from '@/services/pocketbase'
import DataTable from '@/components/v1/maintenance_request/DataTable'
import { Skeleton } from '@/components/ui/skeleton'

// Function to fetch maintenance requests data using PocketBase SDK
async function fetchMaintenanceRequestsData() {
  try {
    const records = await pb.collection('maintenance_request').getFullList({
      expand: 'truck,maintenance_type,requesting_driver,admin_handler',
      sort: '-created',
    });
    console.log("Fetched Maintenance Requests:", records);
    return records;
  } catch (error) {
    console.error('Failed to fetch maintenance requests data:', error);
    return [];
  }
}

const MaintenanceRequestPage = () => {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true);

  const refreshRequests = useCallback(async () => {
    setIsLoading(true);
    console.log("Refreshing maintenance requests data...");
    const data = await fetchMaintenanceRequestsData();
    setRequests(data);
    setIsLoading(false);
    console.log("Maintenance requests data refreshed.");
  }, []);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  return (
    <div className='flex flex-col h-full w-full p-4 bg-white gap-4'>

      {/* Header - Pass refreshRequests function */}
      <Header onRefresh={refreshRequests} />

      {/* Maintenance Requests Table - Show skeleton while loading */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable requests={requests} refreshData={refreshRequests} />
      )}

    </div>
  )
}

export default MaintenanceRequestPage