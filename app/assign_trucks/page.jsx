"use client";
import Header from '@/components/v1/assign_trucks/header';
import DataTable from '@/components/v1/assign_trucks/DataTable';
import React, { useState, useEffect } from 'react';
import pb from '@/services/pocketbase';
import { toast } from 'sonner';

const AssignTrucksPage = () => {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch trucks from the database
  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const response = await pb.collection('trucks').getList(1, 100, {
        sort: 'created',
        expand: 'users_id', // Expand to get driver details
      });

      setTrucks(response.items);
    } catch (error) {
      console.error('Error fetching trucks:', error);
      toast.error('Failed to load trucks. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  // Function to fetch drivers from the database
  const fetchDrivers = async () => {
    try {
      const response = await pb.collection('users').getList(1, 50, {
        filter: 'role = "driver"',
        sort: 'username',
      });
      setDrivers(response.items || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load drivers. Please try again.');
    }
  };

  // Function to get drivers that are available for assignment
  const getAvailableDrivers = (trucksData, allDrivers) => {
    // Get all currently assigned driver IDs
    const assignedDriverIds = trucksData
      .filter(truck => truck.users_id) // Only trucks with assigned drivers
      .map(truck => truck.users_id);

    // Filter out drivers that are already assigned
    const available = allDrivers.filter(driver =>
      !assignedDriverIds.includes(driver.id)
    );

    return available;
  };

  // Function to get available drivers for a specific truck
  const getAvailableDriversForTruck = (truckId, trucksData, allDrivers) => {
    // Get all currently assigned driver IDs except for the current truck
    const assignedDriverIds = trucksData
      .filter(truck => truck.users_id && truck.id !== truckId) // Exclude current truck
      .map(truck => truck.users_id);

    // Filter out drivers that are already assigned to other trucks
    const available = allDrivers.filter(driver =>
      !assignedDriverIds.includes(driver.id)
    );

    return available;
  };

  // Function to update available drivers based on current truck assignments
  const updateAvailableDrivers = (trucksData = trucks, allDrivers = drivers) => {
    const available = getAvailableDrivers(trucksData, allDrivers);
    setAvailableDrivers(available);
  };  // Handle truck assignment to driver
  const handleAssignDriver = async (truckId, driverId) => {
    try {
      // driverId will be null if "unassigned" is selected
      const dataToUpdate = {
        users_id: driverId || null,
        assigned_date: driverId ? new Date().toISOString() : null,
      };
      await pb.collection('trucks').update(truckId, dataToUpdate);

      toast.success("Truck assignment updated successfully");

      // Refresh truck data which will trigger available drivers update
      await fetchTrucks();

      return true;
    } catch (error) {
      console.error("Error updating truck assignment:", error);
      toast.error("Failed to update truck assignment");
      return false;
    }
  };
  // Update available drivers when trucks or drivers data changes
  useEffect(() => {
    if (trucks.length > 0 && drivers.length > 0) {
      updateAvailableDrivers(trucks, drivers);
    }
  }, [trucks, drivers]);

  // Fetch trucks and drivers on component mount
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchTrucks(), fetchDrivers()]);
    };
    loadData();
  }, []);

  return (
    <div className='flex flex-col h-full w-full p-4 bg-white gap-4'>
      <Header onRefresh={fetchTrucks} />

      {loading ? (
        <div className="w-full py-8 flex justify-center items-center">
          <p className="text-muted-foreground">Loading trucks...</p>
        </div>
      ) : (        <DataTable
          trucks={trucks}
          drivers={drivers}
          availableDrivers={availableDrivers}
          getAvailableDriversForTruck={getAvailableDriversForTruck}
          onAssignDriver={handleAssignDriver}
          refreshData={fetchTrucks}
        />
      )}
    </div>
  );
};

export default AssignTrucksPage;