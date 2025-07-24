import React from "react";
import { Icon } from "@iconify/react";
import { Input } from "../../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Button } from "../../ui/button";
import CreateTruck from "../dialogs/CreateTruck";

/**
 * Header component for the truck management section
 * Provides search functionality, filtering, and truck creation
 */
const Header = ({ onRefresh, showArchived, onToggleArchived }) => {
  // Truck types for filter dropdown
  const truckTypes = [
    { id: 'all', label: 'All Trucks' },
    { id: 'heavy', label: 'Heavy Duty' },
    { id: 'medium', label: 'Medium Duty' },
    { id: 'light', label: 'Light Duty' }
  ]

  return (
    <div className="w-full p-0 bg-white shadow-none border-none rounded-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon='mingcute:bus-line' className="text-3xl text-primary"/>
          <h1 className="text-2xl font-semibold">
            {showArchived ? "Archived Trucks" : "Truck Management"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Archive Toggle */}
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={onToggleArchived}
            className="flex items-center gap-2"
            title={showArchived ? "Show active trucks" : "Show archived trucks"}
          >
            <Icon icon={showArchived ? "mdi:archive-off" : "mdi:archive"} width="18" height="18" />
            <span>{showArchived ? "Show Active" : "Show Archived"}</span>
          </Button>

          {/* Search Bar */}
          <div className="relative">
            <Icon
              icon="mdi:magnify"
              width="18"
              height="18"
              className="absolute top-1/2 left-2 -translate-y-1/2 transform text-gray-500"
            />
            <Input className="w-64 pl-8" placeholder="Search trucks..." />
          </div>

          {/* Truck Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <span>Filter by Type</span>
                <Icon icon="mdi:chevron-down" width="16" height="16" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {truckTypes.map(type => (
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
            title="Refresh truck data"
          >
            <Icon icon="mdi:refresh" width="18" height="18" />
            <span>Refresh</span>
          </Button>

          {/* Add New Truck Dialog */}
          <CreateTruck />
        </div>
      </div>
    </div>
  );
};

export default Header;
