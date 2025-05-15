'use client'

import Header from '@/components/v1/trucks/Header'
import React, { useState, useEffect, useCallback } from 'react'
import pb from '@/services/pocketbase'
import DataTable from '@/components/v1/trucks/DataTable'
import { Skeleton } from '@/components/ui/skeleton'

// Function to fetch trucks data using PocketBase SDK
async function fetchTrucksData() {
  try {
    const records = await pb.collection('trucks').getFullList({
      expand: 'users_id',
      sort: '-created',
      requestKey: null // Add requestKey to avoid auto-cancellation
    });
    console.log("Fetched Trucks:", records);
    return records;
  } catch (error) {
    console.error('Failed to fetch trucks data:', error);
    return [];
  }
}

const TrucksPage = () => {
  const [trucks, setTrucks] = useState([])
  const [isLoading, setIsLoading] = useState(true);

  const refreshTrucks = useCallback(async () => {
    setIsLoading(true);
    console.log("Refreshing trucks data...");
    const data = await fetchTrucksData();
    setTrucks(data);
    setIsLoading(false);
    console.log("Trucks data refreshed.");
  }, []);

  useEffect(() => {
    refreshTrucks();
  }, [refreshTrucks]);

  return (
    <div className='flex flex-col h-full w-full p-4 bg-white gap-4'>

      {/* Header - Pass refreshTrucks function */}
      <Header onRefresh={refreshTrucks} />

      {/* Truck Table - Show skeleton while loading */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable trucks={trucks} refreshData={refreshTrucks} />
      )}

    </div>
  )
}

export default TrucksPage