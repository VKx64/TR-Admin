import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteRefuel } from "@/services/refuel";
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

// Component specifically for rendering the Receipt image cell with Popover
const ReceiptCell = ({ row }) => {
  const refuel = row.original;
  const receiptImage = refuel
    ? `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${refuel.collectionId}/${refuel.id}/${refuel.reciept}`
    : null;

  // If no receipt, return a placeholder text
  if (!refuel.reciept) {
    return <span className="text-muted-foreground">No receipt</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Small image displayed in the table row */}
        <img
          src={receiptImage}
          alt="Receipt Thumbnail"
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
          src={receiptImage}
          alt="Receipt Large"
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

// Component for formatting date in a readable format
const DateCell = ({ getValue }) => {
  const date = getValue();
  if (!date) return "-";

  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Component specifically for rendering the Action buttons
const ActionsCell = ({ row, meta }) => {
  const refuelId = row.original.id;
  const refreshData = meta?.refreshData;

  // Function to handle the delete confirmation
  const handleDeleteConfirm = async () => {
    const success = await deleteRefuel(refuelId);
    if (success) {
      toast.success("Refuel record deleted successfully.");
      // Call refreshData if it exists to refresh the table
      if (typeof refreshData === "function") {
        refreshData();
      } else {
        console.log("Refuel deleted, please refresh the list manually.");
      }
    } else {
      toast.error("Failed to delete refuel record.");
    }
  };

  return (
    <div className="flex gap-2">
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
              refuel record.
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
    </div>
  );
};

const DataTable = ({ refuels = [], refreshData }) => {
  const columns = React.useMemo(
    () => [
      {
        id: "receipt",
        header: "Receipt",
        cell: ReceiptCell,
      },
      {
        accessorFn: (row) => row?.expand?.truck_id?.plate_number,
        header: "Truck Plate",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.fuel_amount,
        header: "Fuel Amount (L)",
        cell: ({ getValue }) => {
          const value = getValue();
          return value !== null && value !== undefined ? value : "-";
        },
      },
      {
        accessorFn: (row) => row?.fuel_price,
        header: "Fuel Price (₱)",
        cell: ({ getValue }) => {
          const value = getValue();
          return value !== null && value !== undefined ? `₱${value.toFixed(2)}` : "-";
        },
      },
      {
        accessorFn: (row) => row?.odometer_reading,
        header: "Odometer (km)",
        cell: ({ getValue }) => {
          const value = getValue();
          return value !== null && value !== undefined ? `${value} km` : "-";
        },
      },
      {
        accessorFn: (row) => row?.created,
        header: "Refuel Date",
        cell: DateCell,
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
    data: refuels,
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
      {refuels.length === 0 && (
        <div className="text-center p-4 text-muted-foreground">
          No refuel data available.
        </div>
      )}
    </div>
  );
};

export default DataTable;