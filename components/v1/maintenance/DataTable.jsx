import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import pb from "@/services/pocketbase";
import ReadMaintenance from "@/components/v1/dialogs/ReadMaintenance";
import UpdateMaintenance from "@/components/v1/dialogs/UpdateMaintenance";

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

// Component specifically for rendering the interval information
const IntervalCell = ({ row }) => {
  const maintenanceType = row.original;

  if (maintenanceType.recurrence_interval_km && maintenanceType.recurrence_interval_days) {
    return (
      <div>
        <div className="font-medium">{maintenanceType.recurrence_interval_km} km</div>
        <div className="text-muted-foreground text-sm">or {maintenanceType.recurrence_interval_days} days</div>
      </div>
    );
  } else if (maintenanceType.recurrence_interval_km) {
    return <span>{maintenanceType.recurrence_interval_km} km</span>;
  } else if (maintenanceType.recurrence_interval_days) {
    return <span>{maintenanceType.recurrence_interval_days} days</span>;
  } else {
    return <span className="text-muted-foreground">No interval set</span>;
  }
};

// Component specifically for rendering the Action buttons
const ActionsCell = ({ row, meta }) => {
  const maintenanceTypeId = row.original.id;
  const refreshData = meta?.refreshData;
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleView = () => setIsViewDialogOpen(true);
  const handleEdit = () => setIsEditDialogOpen(true);

  // Function to handle the delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      await pb.collection('maintenance_type').delete(maintenanceTypeId);
      toast.success("Maintenance type deleted successfully.");

      // Call refreshData if it exists to refresh the table
      if (typeof refreshData === "function") {
        refreshData();
      }
    } catch (error) {
      console.error('Error deleting maintenance type:', error);
      toast.error("Failed to delete maintenance type.");
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
              maintenance type and may affect any maintenance records related to it.
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

      {/* Integrate ReadMaintenance component */}
      <ReadMaintenance
        isOpen={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        maintenanceTypeId={maintenanceTypeId}
      />

      {/* Integrate UpdateMaintenance component */}
      <UpdateMaintenance
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maintenanceTypeId={maintenanceTypeId}
        onSuccess={refreshData}
      />
    </div>
  );
};

const DataTable = ({ maintenanceTypes = [], refreshData }) => {
  const columns = React.useMemo(
    () => [
      {
        accessorFn: (row) => row?.name,
        header: "Name",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.description,
        header: "Description",
        cell: ({ getValue }) => {
          const value = getValue();
          // Truncate description if it's too long
          return value
            ? (value.length > 100 ? value.substring(0, 100) + '...' : value)
            : "-";
        },
      },
      {
        accessorKey: "interval",
        header: "Recurrence Interval",
        cell: IntervalCell,
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
    data: maintenanceTypes,
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
      {maintenanceTypes.length === 0 && (
        <div className="text-center p-4 text-muted-foreground">
          No maintenance types available.
        </div>
      )}
    </div>
  );
};

export default DataTable;