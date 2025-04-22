"use client";
import Header from '@/components/v1/assign_trucks/header';
import DataTable from '@/components/v1/assign_trucks/DataTable';
import React, { useState, useEffect } from 'react';
import pb from '@/services/pocketbase';
import { toast } from 'sonner';

const AssignTrucksPage = () => {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
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

  // Handle truck assignment to driver
  const handleAssignDriver = async (truckId, driverId) => {
    try {
      // driverId will be null if "unassigned" is selected
      await pb.collection('trucks').update(truckId, {
        users_id: driverId || null,
      });

      toast.success("Truck assignment updated successfully");
      fetchTrucks(); // Refresh truck data
      return true;
    } catch (error) {
      console.error("Error updating truck assignment:", error);
      toast.error("Failed to update truck assignment");
      return false;
    }
  };

  // Fetch trucks and drivers on component mount
  useEffect(() => {
    Promise.all([fetchTrucks(), fetchDrivers()]);
  }, []);

  return (
    <div className='flex flex-col h-full w-full p-4 bg-white gap-4'>
      <Header onRefresh={fetchTrucks} />

      {loading ? (
        <div className="w-full py-8 flex justify-center items-center">
          <p className="text-muted-foreground">Loading trucks...</p>
        </div>
      ) : (
        <DataTable
          trucks={trucks}
          drivers={drivers}
          onAssignDriver={handleAssignDriver}
          refreshData={fetchTrucks}
        />
      )}
    </div>
  );
};

export default AssignTrucksPage;