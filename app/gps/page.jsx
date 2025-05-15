'use client'

import Header from '@/components/v1/gps/Header'
import React, { useState, useEffect, useCallback } from 'react'
import pb from '@/services/pocketbase'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@iconify/react'
import dynamic from 'next/dynamic'

// Dynamically import the OpenLayersMapDisplay component to ensure client-side rendering
const OpenLayersMapDisplay = dynamic(
  () => import('@/components/v1/gps/OpenLayersMapDisplay'),
  {
    ssr: false,
    // Optional: add a loading component here if needed while the map component itself loads
    // loading: () => <p>Loading map component...</p>
  }
);

// Function to fetch GPS data using PocketBase SDK
async function fetchGPSData(truckId = null) {
  try {
    if (truckId && truckId !== 'all') {
      // If a specific truck is selected, fetch that truck with its statistics
      const truck = await pb.collection('trucks').getOne(truckId, {
        expand: 'truck_statistics',
        requestKey: null // Add requestKey to avoid auto-cancellation
      });
      return truck;
    } else {
      // If 'all' is selected, fetch all trucks with their statistics
      const records = await pb.collection('trucks').getFullList({
        expand: 'truck_statistics',
        sort: '-created',
        requestKey: null // Add requestKey to avoid auto-cancellation
      });
      return records;
    }
  } catch (error) {
    console.error('Failed to fetch GPS data:', error);
    // In case of error, or if no data, ensure a consistent structure or handle appropriately upstream
    return null;
  }
}

const GPSPage = () => {
  const [truckData, setTruckData] = useState(null)
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTruckId, setSelectedTruckId] = useState('all');

  const refreshGPSData = useCallback(async () => {
    setIsLoading(true);
    console.log("Refreshing GPS data...");
    const data = await fetchGPSData(selectedTruckId);
    setTruckData(data);
    setIsLoading(false);
    console.log("GPS data refreshed.");
  }, [selectedTruckId]);

  // Handle truck selection from the dropdown
  const handleTruckSelect = useCallback((truckId) => {
    setSelectedTruckId(truckId);
  }, []);

  // Refresh data when selected truck changes
  useEffect(() => {
    refreshGPSData();

    // Set up polling for real-time updates (every 30 seconds)
    const intervalId = setInterval(refreshGPSData, 30000);

    return () => clearInterval(intervalId);
  }, [refreshGPSData, selectedTruckId]); // selectedTruckId is included as per original code, refreshGPSData depends on it.

  // Determine if we're showing a single truck or multiple
  const isSingleTruck = truckData && !Array.isArray(truckData);
  const statistics = isSingleTruck ? truckData?.expand?.truck_statistics : null;

  console.log("test truckdata", truckData)

  return (
    <div className='p-6 space-y-6'>
      {/* Header - Pass refreshGPSData function and handleTruckSelect */}
      <Header onRefresh={refreshGPSData} onTruckSelect={handleTruckSelect} />

      {/* GPS Data Display */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[180px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
          </div>
        </div>
      ) : isSingleTruck ? (
        // Single truck view with detailed statistics
        <div className="space-y-6">
          {/* Info Cards - First row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Driver Info Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Driver</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  <Icon icon="mdi:account" className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{truckData.expand?.users_id?.username || "No driver assigned"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Current Location Card (text) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Current Location (Text)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  <Icon icon="mdi:map-marker" className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {statistics && typeof statistics.latitude === 'number' && typeof statistics.longitude === 'number' ?
                      `${statistics.latitude.toFixed(6)}, ${statistics.longitude.toFixed(6)}` :
                      "Location unavailable"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  <Icon
                    icon={statistics?.status === "moving" ? "mdi:truck-fast" : "mdi:truck"}
                    className="h-3.5 w-3.5 text-muted-foreground"
                  />
                  <span className="text-sm font-medium capitalize">{statistics?.status || "Unknown"}</span>
                  {statistics?.direction && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (Heading {statistics.direction})
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards - Second row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Speed Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Current Speed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-semibold">
                    {statistics?.speed ? statistics.speed.toFixed(1) : "0"}
                  </span>
                  <span className="text-xs text-muted-foreground mb-0.5">km/h</span>
                </div>
              </CardContent>
            </Card>

            {/* Total Mileage Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Mileage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-semibold">
                    {statistics?.total_mileage ?
                      new Intl.NumberFormat().format(statistics.total_mileage) : "0"}
                  </span>
                  <span className="text-xs text-muted-foreground mb-0.5">km</span>
                </div>
              </CardContent>
            </Card>

            {/* Last Updated */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Last Updated</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium">
                  {statistics ?
                    new Date(statistics.updated).toLocaleTimeString() :
                    "N/A"}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Map Card - Now using OpenLayersMapDisplay */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Live Location Map</CardTitle>
            </CardHeader>
            <CardContent>
              {statistics && typeof statistics.latitude === 'number' && typeof statistics.longitude === 'number' ? (
                <OpenLayersMapDisplay
                  latitude={statistics.latitude}
                  longitude={statistics.longitude}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center bg-muted/10 rounded-sm">
                  <div className="text-center">
                    <Icon icon="mdi:map-off" className="text-4xl text-muted-foreground/60 mb-3" />
                    <p className="text-sm text-muted-foreground">Location data unavailable for map</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Multiple trucks overview - simplified message
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icon icon="mdi:truck" className="text-4xl text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">Select a Truck</h3>
          <p className="text-sm text-muted-foreground">
            Please select a specific truck to view GPS statistics and map.
          </p>
        </div>
      )}
    </div>
  )
}

export default GPSPage