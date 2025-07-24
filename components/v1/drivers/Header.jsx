import React from 'react'
import { Icon } from "@iconify/react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import CreateDriver from "../dialogs/CreateDriver";

/**
 * Header component for the driver management section
 * Provides search functionality and data refresh
 */
const Header = ({ onRefresh, showArchived, onToggleArchived }) => {
  return (
    <div className="w-full p-0 bg-white shadow-none border-none rounded-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon='mdi:account-group' className="text-3xl"/>
          <h1 className="text-2xl font-semibold">
            {showArchived ? "Archived Drivers" : "Manage Drivers"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Archive Toggle */}
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={onToggleArchived}
            className="flex items-center gap-2"
            title={showArchived ? "Show active drivers" : "Show archived drivers"}
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
            <Input className="w-64 pl-8" placeholder="Search drivers..." />
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={onRefresh}
            className="flex items-center gap-2"
            title="Refresh driver data"
          >
            <Icon icon="mdi:refresh" width="18" height="18" />
            <span>Refresh</span>
          </Button>

          {/* Add New Driver Dialog */}
          <CreateDriver />
        </div>
      </div>
    </div>
  );
};

export default Header