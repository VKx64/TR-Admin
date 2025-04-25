import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import pb from "@/services/pocketbase";
import { format } from "date-fns";
import { Icon } from '@iconify/react';
import MaintenanceCompletionForm from "./MaintenanceCompletionForm";

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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";

// Status Select component for changing the status
const StatusSelect = ({ row, meta }) => {
  const request = row.original;
  const [updating, setUpdating] = useState(false);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const refreshData = meta?.refreshData;

  // If status is already "completed", prevent any changes
  const isCompleted = request.status === "completed";

  const handleStatusChange = async (newStatus) => {
    if (newStatus === request.status) return;

    // If the new status is "completed", show the completion form
    if (newStatus === "completed") {
      setShowCompletionForm(true);
      return;
    }

    setUpdating(true);
    try {
      const data = {
        status: newStatus,
        admin_handler: pb.authStore.model.id,
        handled_date: newStatus !== 'pending' ? new Date().toISOString().split('T')[0] : null,
      };

      await pb.collection('maintenance_request').update(request.id, data);
      toast.success(`Maintenance request status updated to ${newStatus}`);

      if (typeof refreshData === "function") {
        refreshData();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  // Status color mapping for the dropdown
  const getStatusColor = (status) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      approved: "bg-green-100 text-green-800 border-green-300",
      declined: "bg-red-100 text-red-800 border-red-300",
      completed: "bg-blue-100 text-blue-800 border-blue-300",
    };
    return statusColors[status] || "";
  };

  // Format status text with first letter capitalized
  const formatStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <>
      {isCompleted ? (
        // If completed, just show a static display instead of a dropdown
        <div className={`px-4 py-2 rounded-md text-center ${getStatusColor("completed")}`}>
          {formatStatusText(request.status)}
        </div>
      ) : (
        // Otherwise, show the interactive dropdown
        <Select
          disabled={updating || isCompleted}
          value={request.status}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className={`w-[120px] h-8 ${getStatusColor(request.status)}`}>
            <SelectValue placeholder="Change status">
              {formatStatusText(request.status)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approve</SelectItem>
            <SelectItem value="declined">Decline</SelectItem>
            <SelectItem value="completed">Complete</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Maintenance Completion Form */}
      <MaintenanceCompletionForm
        isOpen={showCompletionForm}
        onClose={() => setShowCompletionForm(false)}
        requestData={request}
        onComplete={refreshData}
      />
    </>
  );
};

// ActionsCell component for row actions
const ActionsCell = ({ row, meta }) => {
  const requestId = row.original.id;
  const refreshData = meta?.refreshData;

  // Function to handle request deletion
  const handleDeleteRequest = async () => {
    try {
      await pb.collection('maintenance_request').delete(requestId);
      toast.success("Maintenance request deleted successfully.");
      if (typeof refreshData === "function") {
        refreshData();
      }
    } catch (error) {
      console.error('Error deleting maintenance request:', error);
      toast.error("Failed to delete maintenance request.");
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
              maintenance request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Main DataTable component
const DataTable = ({ requests = [], refreshData }) => {
  const columns = React.useMemo(
    () => [
      {
        accessorFn: (row) => row?.expand?.truck?.plate_number,
        header: "Truck",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.expand?.maintenance_type?.name,
        header: "Maintenance Type",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.expand?.requesting_driver?.username,
        header: "Requested By",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorFn: (row) => row?.request_date,
        header: "Request Date",
        cell: ({ getValue }) => {
          const date = getValue();
          if (!date) return "-";
          return format(new Date(date), "MMM d, yyyy");
        },
      },
      {
        accessorFn: (row) => row?.current_mileage_at_request,
        header: "Mileage",
        cell: ({ getValue }) => {
          const mileage = getValue();
          return mileage ? `${mileage.toLocaleString()} km` : "-";
        },
      },
      {
        id: "status",
        header: "Status",
        cell: (props) => <StatusSelect {...props} meta={{ refreshData }} />,
      },
      {
        accessorFn: (row) => row?.admin_notes,
        header: "Notes",
        cell: ({ getValue }) => {
          const notes = getValue();
          if (!notes) return "-";

          // If notes are too long, truncate them
          return notes.length > 30
            ? `${notes.substring(0, 30)}...`
            : notes;
        },
      },
      {
        accessorFn: (row) => row?.expand?.admin_handler?.username,
        header: "Handled By",
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
    data: requests,
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
      {requests.length === 0 && (
        <div className="text-center p-8 text-muted-foreground">
          No maintenance requests available.
        </div>
      )}
    </div>
  );
};

export default DataTable;