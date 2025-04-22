import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReadDriver from "@/components/v1/dialogs/ReadDriver";
import UpdateDriver from "@/components/v1/dialogs/UpdateDriver";
import { deleteDriver } from "@/services/drivers";

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
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleView = () => setIsViewDialogOpen(true);
  const handleEdit = () => setIsEditDialogOpen(true);

  // Function to handle the delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      const success = await deleteDriver(driverId);
      if (success) {
        toast.success("Driver deleted successfully.");
        // Call refreshData if it exists to refresh the table
        if (typeof refreshData === "function") {
          refreshData();
        } else {
          console.log("Driver deleted, please refresh the list manually.");
        }
      } else {
        toast.error("Failed to delete driver.");
      }
    } catch (error) {
      toast.error("Failed to delete driver.");
      console.error("Delete error:", error);
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
              driver record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

const DataTable = ({ drivers = [], refreshData }) => {
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
        cell: (props) => <ActionsCell {...props} meta={{ refreshData }} />,
      },
    ],
    [refreshData]
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