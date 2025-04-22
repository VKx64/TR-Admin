'use client'
// React and Hooks
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Icon } from '@iconify/react';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "../../ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/card";
import pb from "@/services/pocketbase";

// Zod schema for form validation
const maintenanceTypeSchema = z.object({
  name: z.string().min(1, "Maintenance type name is required"),
  description: z.string().optional(),
  recurrence_interval_km: z.string()
    .optional()
    .refine(val => val === '' || !isNaN(Number(val)), {
      message: "Recurrence interval must be a valid number",
    })
    .transform(val => val === '' ? null : Number(val)),
  recurrence_interval_days: z.string()
    .optional()
    .refine(val => val === '' || !isNaN(Number(val)), {
      message: "Recurrence interval must be a valid number",
    })
    .transform(val => val === '' ? null : Number(val)),
  formRows: z.array(
    z.object({
      id: z.string().min(1, "Field ID is required"),
      label: z.string().min(1, "Field label is required")
    })
  ).min(1, "At least one form field is required")
});

// Function to fetch maintenance type by ID
async function getMaintenanceTypeById(id) {
  try {
    const record = await pb.collection('maintenance_type').getOne(id);
    return record;
  } catch (error) {
    console.error("Error fetching maintenance type:", error);
    throw error;
  }
}

// Function to update maintenance type
async function updateMaintenanceType(id, data) {
  try {
    // Generate form schema JSON from the formRows
    const formSchema = data.formRows.map(row => ({
      id: row.id,
      label: row.label
    }));

    // Create the update payload
    const updateData = {
      name: data.name,
      description: data.description || "",
      recurrence_interval_km: data.recurrence_interval_km,
      recurrence_interval_days: data.recurrence_interval_days,
      form_schema: formSchema,
    };

    // Update the record
    await pb.collection('maintenance_type').update(id, updateData);
    return true;
  } catch (error) {
    console.error("Error updating maintenance type:", error);
    throw error;
  }
}

const UpdateMaintenance = ({ isOpen, onClose, maintenanceTypeId, onSuccess }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // Form initialization
  const form = useForm({
    resolver: zodResolver(maintenanceTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      recurrence_interval_km: "",
      recurrence_interval_days: "",
      formRows: [
        { id: "completed_by", label: "Completed By" },
        { id: "notes", label: "Completion Notes" }
      ]
    },
  });

  // Load maintenance type data when dialog opens
  useEffect(() => {
    if (isOpen && maintenanceTypeId) {
      loadMaintenanceTypeData();
    }
  }, [isOpen, maintenanceTypeId]);

  const loadMaintenanceTypeData = async () => {
    setLoading(true);
    try {
      const maintenanceType = await getMaintenanceTypeById(maintenanceTypeId);

      // Parse form_schema from JSON if it exists
      let formRows = [
        { id: "completed_by", label: "Completed By" },
        { id: "notes", label: "Completion Notes" }
      ];

      if (maintenanceType.form_schema && Array.isArray(maintenanceType.form_schema)) {
        formRows = maintenanceType.form_schema.map(field => ({
          id: field.id,
          label: field.label
        }));
      }

      // Reset the form with the maintenance type data
      form.reset({
        name: maintenanceType.name || "",
        description: maintenanceType.description || "",
        recurrence_interval_km: maintenanceType.recurrence_interval_km?.toString() || "",
        recurrence_interval_days: maintenanceType.recurrence_interval_days?.toString() || "",
        formRows: formRows
      });
    } catch (error) {
      console.error("Error loading maintenance type data:", error);
      toast.error("Failed to load maintenance type data");
    } finally {
      setLoading(false);
    }
  };

  // Add a new form field row
  const addFormRow = () => {
    const currentRows = form.getValues("formRows") || [];
    form.setValue("formRows", [
      ...currentRows,
      { id: "", label: "" }
    ]);
  };

  // Remove a form field row
  const removeFormRow = (index) => {
    const currentRows = form.getValues("formRows") || [];
    if (currentRows.length <= 1) {
      // Don't remove if it's the last row
      toast.error("You must have at least one form field");
      return;
    }
    const newRows = [...currentRows];
    newRows.splice(index, 1);
    form.setValue("formRows", newRows);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Update the maintenance type with form data
      await updateMaintenanceType(maintenanceTypeId, data);

      toast.success("Maintenance type updated successfully");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating maintenance type:", error);
      toast.error("Failed to update maintenance type");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {loading ? "Loading..." : "Edit Maintenance Type"}
          </DialogTitle>
          <DialogDescription>
            Update the details and form schema for this maintenance type.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="form">Form Fields</TabsTrigger>
                  <TabsTrigger value="preview">Form Preview</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-6">
                  <div className="space-y-4">
                    {/* Maintenance Type Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maintenance Type Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Engine Oil Change" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter a detailed description of what this maintenance involves..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Recurrence Intervals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recurrence_interval_km"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recurrence Interval (km)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 5000" type="number" {...field} />
                            </FormControl>
                            <FormDescription>
                              Distance threshold for maintenance
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="recurrence_interval_days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recurrence Interval (days)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 90" type="number" {...field} />
                            </FormControl>
                            <FormDescription>
                              Time threshold for maintenance
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Form Fields Tab */}
                <TabsContent value="form" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Form Fields Definition</CardTitle>
                      <CardDescription>
                        Define the fields that will be collected when this maintenance task is completed.
                        Each field needs an ID (for the database) and a Label (displayed to users).
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Form Field Rows */}
                        {form.watch("formRows")?.map((row, index) => (
                          <div key={index} className="flex items-end gap-3">
                            {/* Field ID */}
                            <div className="flex-1">
                              <FormField
                                control={form.control}
                                name={`formRows.${index}.id`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Field ID *</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="e.g., oil_brand"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Field Label */}
                            <div className="flex-1">
                              <FormField
                                control={form.control}
                                name={`formRows.${index}.label`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Field Label *</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="e.g., Oil Brand"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Delete Row Button */}
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeFormRow(index)}
                              className="h-10 w-10 mb-[2px]"
                            >
                              <Icon icon="mdi:delete" className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        {/* Add Field Button */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addFormRow}
                          className="w-full mt-4"
                        >
                          <Icon icon="mdi:plus" className="mr-2 h-4 w-4" />
                          Add Form Field
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Form Preview Tab */}
                <TabsContent value="preview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Form Preview</CardTitle>
                      <CardDescription>
                        This is how your form fields will appear when a maintenance task is completed.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 bg-muted/30 p-4 rounded-md">
                        {form.watch("formRows")?.map((row, index) => (
                          <div key={`preview-${index}`} className="space-y-1">
                            <label className="text-sm font-medium">
                              {row.label || "Unnamed Field"}
                            </label>
                            <div className="w-full h-9 bg-white border rounded-md"></div>
                          </div>
                        ))}
                        {form.watch("formRows")?.length === 0 && (
                          <div className="text-center text-muted-foreground py-8">
                            No form fields defined yet
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <DialogFooter className="flex justify-end gap-4 pt-4 border-t">
                <Button onClick={onClose} type="button" variant="outline" disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <div className="flex items-center">
                      <Icon icon="mdi:loading" className="mr-2 animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpdateMaintenance;