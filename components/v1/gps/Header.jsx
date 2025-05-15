import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import pb from "@/services/pocketbase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

/**
 * Header component for the GPS tracking section
 * Provides truck selection dropdown and data refresh
 */
const Header = ({ onRefresh, onTruckSelect }) => {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState("All Trucks");

  useEffect(() => {
    const fetchTrucks = async () => {
      setLoading(true);
      try {
        const records = await pb.collection('trucks').getFullList({
          sort: 'plate_number',
          fields: 'id,plate_number',
          requestKey: null // Add requestKey to avoid auto-cancellation
        });
        setTrucks(records);
      } catch (error) {
        console.error('Failed to fetch trucks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrucks();
  }, []);

  const handleTruckSelect = (truck) => {
    setSelectedTruck(truck.id === 'all' ? 'All Trucks' : truck.plate_number);
    if (onTruckSelect) {
      onTruckSelect(truck.id);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Icon icon='mdi:map-marker' className="text-2xl text-primary"/>
        <h2 className="text-2xl font-semibold">GPS Tracking</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative">
          <Input
            placeholder="Search vehicles..."
            className="w-[200px] pl-8"
          />
          <Icon
            icon="mdi:magnify"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
        </div>

        {/* Truck Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <span className="mr-1">{loading ? "Loading..." : selectedTruck}</span>
              <Icon icon="mdi:chevron-down" className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleTruckSelect({ id: 'all', plate_number: 'All Trucks' })}>
              All Trucks
            </DropdownMenuItem>
            {trucks.map(truck => (
              <DropdownMenuItem key={truck.id} onClick={() => handleTruckSelect(truck)}>
                {truck.plate_number}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-9 w-9 p-0"
          title="Refresh GPS data"
        >
          <Icon icon="mdi:refresh" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Header;