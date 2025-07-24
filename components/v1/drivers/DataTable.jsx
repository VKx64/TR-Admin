import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReadDriver from "@/components/v1/dialogs/ReadDriver";
import UpdateDriver from "@/components/v1/dialogs/UpdateDriver";
import { archiveDriver, unarchiveDriver } from "@/services/drivers";

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

// Component for rendering the driver image with popover
const ImageCell = ({ row }) => {
  const driver = row.original;
  const userAvatar = driver?.avatar
    ? `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${driver.collectionId}/${driver.id}/${driver.avatar}`
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Small image displayed in the table row */}
        <img
          src={userAvatar}
          alt="Driver Thumbnail"
          className="w-12 h-12 object-cover rounded-full cursor-pointer"
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
          alt="Driver Large"
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

// Component for rendering the Action buttons
const ActionsCell = ({ row, meta }) => {
  const driverId = row.original.id;
  const refreshData = meta?.refreshData;
  const showArchived = meta?.showArchived;
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleView = () => setIsViewDialogOpen(true);
  const handleEdit = () => setIsEditDialogOpen(true);

  // Function to handle the archive confirmation
  const handleArchiveConfirm = async () => {
    try {
      const success = await archiveDriver(driverId);
      if (success) {
        toast.success("Driver archived successfully.");
        // Call refreshData if it exists to refresh the table
        if (typeof refreshData === "function") {
          refreshData();
        } else {
          console.log("Driver archived, please refresh the list manually.");
        }
      } else {
        toast.error("Failed to archive driver.");
      }
    } catch (error) {
      toast.error("Failed to archive driver.");
      console.error("Archive error:", error);
    }
  };

  // Function to handle the unarchive confirmation
  const handleUnarchiveConfirm = async () => {
    try {
      const success = await unarchiveDriver(driverId);
      if (success) {
        toast.success("Driver unarchived successfully.");
        // Call refreshData if it exists to refresh the table
        if (typeof refreshData === "function") {
          refreshData();
        } else {
          console.log("Driver unarchived, please refresh the list manually.");
        }
      } else {
        toast.error("Failed to unarchive driver.");
      }
    } catch (error) {
      toast.error("Failed to unarchive driver.");
      console.error("Unarchive error:", error);
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
        // Show Unarchive button for archived drivers
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600">
              Unarchive
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to unarchive this driver?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will restore the driver record to active status.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnarchiveConfirm}>
                Unarchive Driver
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        // Show Archive button for active drivers
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500 hover:border-amber-600">
              Archive
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to archive this driver?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will archive the driver record. Archived drivers can be restored later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveConfirm}>
                Archive Driver
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ReadDriver Dialog */}
      <ReadDriver
        isOpen={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        driverId={driverId}
      />

      {/* UpdateDriver Dialog */}
      <UpdateDriver
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        driverId={driverId}
        onSuccess={refreshData}
      />
    </div>
  );
};

const DataTable = ({ drivers = [], refreshData, showArchived = false }) => {
  const columns = React.useMemo(
    () => [
      {
        accessorKey: "image",
        header: "Image",
        cell: ImageCell,
      },
      {
        accessorFn: (row) => row?.username,
        header: "Name",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.email,
        header: "Email",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.expand?.driver_details_id?.phone,
        header: "Phone",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.expand?.driver_details_id?.driver_license_number,
        header: "License Number",
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
    data: drivers,
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
      {drivers.length === 0 && (
        <div className="text-center p-4 text-muted-foreground">
          No driver data available.
        </div>
      )}
    </div>
  );
};

export default DataTable;