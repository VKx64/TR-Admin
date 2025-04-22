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

/**
 * Header component for the truck assignment section
 * Provides search functionality and filtering
 */
const Header = ({ onRefresh }) => {
  // Assignment status options for filter dropdown
  const assignmentStatus = [
    { id: 'all', label: 'All Assignments' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'available', label: 'Available' },
    { id: 'maintenance', label: 'In Maintenance' }
  ]

  return (
    <div className="w-full p-0 bg-white shadow-none border-none rounded-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon='mingcute:truck-line' className="text-3xl"/>
          <h1 className="text-2xl font-semibold">Assign Trucks</h1>
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
            <Input className="w-64 pl-8" placeholder="Search assignments..." />
          </div>

          {/* Assignment Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <span>Filter by Status</span>
                <Icon icon="mdi:chevron-down" width="16" height="16" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {assignmentStatus.map(status => (
                <DropdownMenuItem key={status.id}>
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={onRefresh}
            className="flex items-center gap-2"
            title="Refresh assignment data"
          >
            <Icon icon="mdi:refresh" width="18" height="18" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Header;