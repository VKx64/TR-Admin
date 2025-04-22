import React from 'react'
import { Icon } from "@iconify/react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import CreateRefuel from "../dialogs/CreateRefuel";

/**
 * Header component for the fuel management section
 * Provides search functionality and refresh capability
 */
const Header = ({ onRefresh }) => {
  return (
    <div className="w-full p-0 bg-white shadow-none border-none rounded-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon='mingcute:gas-station-line' className="text-3xl"/>
          <h1 className="text-2xl font-semibold">Fuel Trucks Management</h1>
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
            <Input className="w-64 pl-8" placeholder="Search fuel records..." />
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={onRefresh}
            className="flex items-center gap-2"
            title="Refresh fuel data"
          >
            <Icon icon="mdi:refresh" width="18" height="18" />
            <span>Refresh</span>
          </Button>

          {/* Add New Refuel Dialog */}
          <CreateRefuel onSuccess={onRefresh} />
        </div>
      </div>
    </div>
  );
};

export default Header;