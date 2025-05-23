import React, { useState } from "react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Component for the truck image cell with popover
const ImageCell = ({ row }) => {
  const truck = row.original;
  const truckImage = truck
    ? `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${truck.collectionId}/${truck.id}/${truck.truck_image}`
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Small image displayed in the table row */}
        <img
          src={truckImage}
          alt="Truck Thumbnail"
          className="w-12 h-12 object-cover rounded cursor-pointer"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/Images/avatar_placeholder.jpg";
          }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 flex justify-center items-center">
        {/* Larger image displayed in the popover when clicked */}
        <img
          src={truckImage}
          alt="Truck Large"
          className="max-w-xs max-h-96 object-contain rounded"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/Images/avatar_placeholder.jpg";
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

// Component for the driver assignment cell
const AssignDriverCell = ({ row, meta }) => {
  const [loading, setLoading] = useState(false);
  const truck = row.original;
  const currentDriverId = truck.users_id || 'unassigned';
  const { drivers, onAssignDriver } = meta;

  // Handle driver assignment
  const handleDriverAssignment = async (driverId) => {
    setLoading(true);
    try {
      // Convert "unassigned" back to null/empty string when sending to server
      const driverIdToSend = driverId === 'unassigned' ? null : driverId;
      const success = await onAssignDriver(truck.id, driverIdToSend);
      if (!success) {
        // If the assignment wasn't successful, we don't need to show another toast
        // as the parent component already handles that
      }
    } catch (error) {
      console.error("Error in driver assignment callback:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xs">
      <Select
        defaultValue={currentDriverId}
        onValueChange={handleDriverAssignment}
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Assign driver..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {drivers.map(driver => (
            <SelectItem key={driver.id} value={driver.id}>
              {driver.username}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const DataTable = ({ trucks = [], drivers = [], onAssignDriver, refreshData }) => {
  const columns = React.useMemo(
    () => [
      {
        accessorKey: "image",
        header: "Image",
        cell: ImageCell,
      },
      {
        accessorFn: (row) => row?.plate_number,
        header: "Plate Number",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        id: "assign",
        header: "Assign Driver",
        cell: (props) => <AssignDriverCell {...props} meta={{ drivers, onAssignDriver, refreshData }} />,
      },
      {
        accessorFn: (row) => row?.assigned_date,
        header: "Assigned Date",
        cell: ({ getValue }) => {
          const date = getValue();
          if (!date) return "-";
          // Format date to YYYY-MM-DD HH:mm
          try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return "-"; // Invalid date
            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            const hours = d.getHours().toString().padStart(2, '0');
            const minutes = d.getMinutes().toString().padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
          } catch (e) {
            console.error("Error formatting date:", e, "Raw date:", date);
            return "-"; // Fallback for any unexpected error during formatting
          }
        },
      },
    ],
    [drivers, onAssignDriver, refreshData]
  );

  const table = useReactTable({
    data: trucks,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="min-w-full table-auto">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 border-b text-left text-sm font-medium text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-2 border-b text-sm align-middle"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {trucks.length === 0 && (
        <div className="text-center p-4 text-muted-foreground">
          No trucks available for assignment.
        </div>
      )}
    </div>
  );
};

export default DataTable;