import React from "react";
import { Icon } from "@iconify/react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import CreateMaintenance from "../dialogs/CreateMaintenance";

/**
 * Header component for the maintenance management section
 * Provides search functionality, filtering, and maintenance type creation
 */
const Header = ({ onRefresh }) => {
  // Maintenance types for filter dropdown
  const maintenanceTypes = [
    { id: 'all', label: 'All Types' },
    { id: 'engine', label: 'Engine Maintenance' },
    { id: 'transmission', label: 'Transmission' },
    { id: 'tires', label: 'Tires & Wheels' },
    { id: 'brakes', label: 'Brake System' },
    { id: 'inspection', label: 'Regular Inspection' },
  ]

  return (
    <div className="w-full p-0 bg-white shadow-none border-none rounded-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon='material-symbols:build-outline' className="text-3xl"/>
          <h1 className="text-2xl font-semibold">Maintenance Management</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Icon
              icon="mdi:magnify"
              width="18"
              height="18"
              className="absolute top-1/2 left-2 -translate-y-1/2 transform text-gray-500"
            />
            <Input className="w-64 pl-8" placeholder="Search maintenance records..." />
          </div>

          {/* Maintenance Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <span>Filter by Type</span>
                <Icon icon="mdi:chevron-down" width="16" height="16" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {maintenanceTypes.map(type => (
                <DropdownMenuItem key={type.id}>
                  {type.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={onRefresh}
            className="flex items-center gap-2"
            title="Refresh maintenance data"
          >
            <Icon icon="mdi:refresh" width="18" height="18" />
            <span>Refresh</span>
          </Button>

          {/* Add New Maintenance Type Dialog */}
          <CreateMaintenance />
        </div>
      </div>
    </div>
  );
};

export default Header;