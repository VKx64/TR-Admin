import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

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

import { format } from "date-fns";

// Component specifically for rendering the Action buttons
const ActionsCell = ({ row, meta }) => {
  const recordId = row.original.id;
  const refreshData = meta?.refreshData;
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const handleView = () => setIsViewDialogOpen(true);

  // Function to handle the delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      // TODO: Implement delete maintenance record logic
      // const success = await deleteMaintenance(recordId);
      const success = true; // Placeholder until implementation

      if (success) {
        toast.success("Maintenance record deleted successfully.");
        // Call refreshData if it exists to refresh the table
        if (typeof refreshData === "function") {
          refreshData();
        } else {
          console.log("Maintenance record deleted, please refresh the list manually.");
        }
      } else {
        toast.error("Failed to delete maintenance record.");
      }
    } catch (error) {
      console.error("Error deleting maintenance record:", error);
      toast.error("An error occurred while deleting the maintenance record.");
    }
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={handleView}>
        View Details
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
              maintenance record.
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

      {/* TODO: Implement ReadMaintenance Dialog */}
      {/* <ReadMaintenance
        isOpen={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        maintenanceId={recordId}
      /> */}
    </div>
  );
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch (error) {
    return dateString || "-";
  }
};

const DataTable = ({ maintenanceRecords = [], refreshData }) => {
  const columns = React.useMemo(
    () => [
      {
        accessorFn: (row) => row?.expand?.truck?.plate_number,
        header: "Truck",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.expand?.truck?.expand?.users_id?.username,
        header: "Driver",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.expand?.maintenance_type?.name,
        header: "Maintenance Type",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => formatDate(row?.completion_date),
        header: "Completion Date",
        cell: ({ getValue }) => getValue(),
      },
      {
        accessorFn: (row) => row?.expand?.logging_admin?.username,
        header: "Logged By",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.cost ? `$${row.cost.toFixed(2)}` : "-",
        header: "Cost",
        cell: ({ getValue }) => getValue(),
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
    data: maintenanceRecords,
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
      {maintenanceRecords.length === 0 && (
        <div className="text-center p-4 text-muted-foreground">
          No maintenance history records available.
        </div>
      )}
    </div>
  );
};

export default DataTable;