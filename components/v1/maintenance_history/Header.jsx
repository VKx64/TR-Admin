import React from "react";
import { Icon } from "@iconify/react";
import { Card } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

/**
 * Header component for the maintenance history section
 * Provides search functionality for maintenance records
 */
const Header = () => {
  return (
    <div className="w-full p-0 bg-white shadow-none border-none rounded-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon='material-symbols:build-outline' className="text-3xl"/>
          <h1 className="text-2xl font-semibold">Maintenance History</h1>
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
        </div>
      </div>
    </div>
  );
};

export default Header;