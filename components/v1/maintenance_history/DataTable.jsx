import React, { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

import { format } from "date-fns";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch (error) {
    console.error("Invalid date:", dateString, error);
    return "Invalid Date";
  }
};

const DataTable = ({ records, refreshData }) => {
  const data = useMemo(() => records, [records]);

  const columns = useMemo(
    () => [
      {
        header: "Truck",
        accessorKey: "expand.truck.plate_number",
        cell: ({ row }) => row.original.expand?.truck?.plate_number || "N/A",
      },
      {
        header: "Maintenance Type",
        accessorKey: "expand.maintenance_type.name",
        cell: ({ row }) => row.original.expand?.maintenance_type?.name || "N/A",
      },
      {
        header: "Completion Date",
        accessorKey: "completion_date",
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        header: "Cost",
        accessorKey: "cost",
        cell: ({ getValue }) => `$${getValue()?.toFixed(2)}`,
      },
      {
        header: "Logged By",
        accessorKey: "expand.logging_admin.username",
        cell: ({ row }) => row.original.expand?.logging_admin?.username || "N/A",
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      refreshData,
    },
  });

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <table className="min-w-full w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
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
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;