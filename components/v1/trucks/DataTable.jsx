import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteTruck, archiveTruck, unarchiveTruck } from "@/services/trucks";
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
  const showArchived = meta?.showArchived;
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleView = () => setIsViewDialogOpen(true);
  const handleEdit = () => setIsEditDialogOpen(true);

  // Function to handle the archive confirmation
  const handleArchiveConfirm = async () => {
    const success = await archiveTruck(truckId);
    if (success) {
      toast.success("Truck archived successfully.");
      // Call refreshData if it exists to refresh the table
      if (typeof refreshData === "function") {
        refreshData();
      } else {
        console.log("Truck archived, please refresh the list manually.");
      }
    } else {
      toast.error("Failed to archive truck.");
    }
  };

  // Function to handle the unarchive confirmation
  const handleUnarchiveConfirm = async () => {
    const success = await unarchiveTruck(truckId);
    if (success) {
      toast.success("Truck unarchived successfully.");
      // Call refreshData if it exists to refresh the table
      if (typeof refreshData === "function") {
        refreshData();
      } else {
        console.log("Truck unarchived, please refresh the list manually.");
      }
    } else {
      toast.error("Failed to unarchive truck.");
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

      {showArchived ? (
        // Show Unarchive button for archived trucks
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600">
              Unarchive
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to unarchive this truck?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will restore the truck record to active status.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnarchiveConfirm}>
                Unarchive Truck
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        // Show Archive button for active trucks
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500 hover:border-amber-600">
              Archive
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to archive this truck?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will archive the truck record. Archived trucks can be restored later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveConfirm}>
                Archive Truck
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

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

const DataTable = ({ trucks = [], refreshData, showArchived = false }) => {
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
        cell: (props) => <ActionsCell {...props} meta={{ refreshData, showArchived }} />,
      },
    ],
    [refreshData, showArchived]
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
