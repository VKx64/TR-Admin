'use client'

import Header from '@/components/v1/refuel/Header'
import React, { useState, useEffect, useCallback } from 'react'
import pb from '@/services/pocketbase'
import DataTable from '@/components/v1/refuel/DataTable'
import { Skeleton } from '@/components/ui/skeleton'

// Function to fetch refuel data using PocketBase SDK
async function fetchRefuelData() {
  try {
    const records = await pb.collection('truck_fuel').getFullList({
      expand: 'truck_id',
      sort: '-created',
    });
    console.log("Fetched Refuel Data:", records);
    return records;
  } catch (error) {
    console.error('Failed to fetch refuel data:', error);
    return [];
  }
}

const RefuelPage = () => {
  const [refuels, setRefuels] = useState([])
  const [isLoading, setIsLoading] = useState(true);

  const refreshRefuels = useCallback(async () => {
    setIsLoading(true);
    console.log("Refreshing refuel data...");
    const data = await fetchRefuelData();
    setRefuels(data);
    setIsLoading(false);
    console.log("Refuel data refreshed.");
  }, []);

  useEffect(() => {
    refreshRefuels();
  }, [refreshRefuels]);

  return (
    <div className='flex flex-col h-full w-full p-4 bg-white gap-4'>

      {/* Header - Pass refreshRefuels function */}
      <Header onRefresh={refreshRefuels} />

      {/* Refuel Table - Show skeleton while loading */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable refuels={refuels} refreshData={refreshRefuels} />
      )}

    </div>
  )
}

export default RefuelPage