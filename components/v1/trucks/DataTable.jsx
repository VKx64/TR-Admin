import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteTruck } from "@/services/trucks";
import { toast } from "sonner";
import ReadTruck from "@/components/v1/dialogs/ReadTruck";
import UpdateTruck from "@/components/v1/dialogs/UpdateTruck";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Component specifically for rendering the Image cell with Popover
const ImageCell = ({ row }) => {
  const truck = row.original;
  const userAvatar = truck
    ? `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${truck.collectionId}/${truck.id}/${truck.truck_image}`
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Small image displayed in the table row */}
        <img
          src={userAvatar}
          alt="Truck Thumbnail"
          // These classes apply at all screen sizes
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
          src={userAvatar}
          alt="Truck Large"
          // These classes apply at all screen sizes
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

// Component specifically for rendering the Action buttons
const ActionsCell = ({ row, meta }) => {
  const truckId = row.original.id;
  const refreshData = meta?.refreshData;
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleView = () => setIsViewDialogOpen(true);
  const handleEdit = () => setIsEditDialogOpen(true);

  // Function to handle the delete confirmation
  const handleDeleteConfirm = async () => {
    const success = await deleteTruck(truckId);
    if (success) {
      toast.success("Truck deleted successfully.");
      // Call refreshData if it exists to refresh the table
      if (typeof refreshData === "function") {
        refreshData();
      } else {
        console.log("Truck deleted, please refresh the list manually.");
      }
    } else {
      toast.error("Failed to delete truck.");
    }
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={handleView}>
        View
      </Button>
      <Button size="sm" variant="outline" onClick={handleEdit}>
        Edit
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive">
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              truck record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* Call handleDeleteConfirm when Continue is clicked */}
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Integrate ReadTruck Dialog */}
      <ReadTruck
        isOpen={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        truckId={truckId}
      />

      {/* Integrate UpdateTruck Dialog */}
      <UpdateTruck
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        truckId={truckId}
        onSuccess={refreshData}
      />
    </div>
  );
};

const DataTable = ({ trucks = [], refreshData }) => {
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
        accessorFn: (row) => row?.truck_type,
        header: "Truck Type",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.truck_model,
        header: "Model",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.expand?.users_id?.username,
        header: "Driver",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        id: "actions",
        header: "Actions",
        cell: (props) => <ActionsCell {...props} meta={{ refreshData }} />,
      },
    ],
    [refreshData]
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
                  // These classes apply at all screen sizes
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
            // This hover class applies at all screen sizes
            <tr key={row.id} className="hover:bg-muted/50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  // These classes apply at all screen sizes
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
          No truck data available.
        </div>
      )}
    </div>
  );
};

export default DataTable;
