'use client'
// React and Hooks
import React, { useState, useRef } from 'react'

// Third-party Libraries
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Icon } from '@iconify/react'
import { toast } from "sonner"

// Project Services
import pb from "@/services/pocketbase"

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

// --- Constants --- //

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

// Default form values
const defaultFormValues = {
  name: "",
  description: "",
  recurrence_interval_km: "",
  recurrence_interval_days: "",
  formRows: [
    { id: "completed_by", label: "Completed By" },
    { id: "notes", label: "Completion Notes" }
  ]
}

// --- Component Definition --- //

const CreateMaintenance = () => {
  // --- State and Refs --- //
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // --- Form Initialization --- //
  const form = useForm({
    resolver: zodResolver(maintenanceTypeSchema),
    defaultValues: defaultFormValues,
  })

  // --- Helper Functions --- //

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

  // Generate the JSON schema from form rows
  const generateFormSchema = (formRows) => {
    return formRows.map(row => ({
      id: row.id,
      label: row.label
    }));
  };

  // Resets the form fields
  const resetForm = () => {
    form.reset(defaultFormValues);
    setActiveTab('basic');
  }

  // Closes the dialog and resets the form
  const closeDialog = () => {
    setIsOpen(false);
    resetForm();
  }

  // --- Form Submission --- //
  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Generate form schema JSON from the formRows
      const formSchema = generateFormSchema(data.formRows);

      // Create the maintenance type record
      await pb.collection('maintenance_type').create({
        name: data.name,
        description: data.description || "",
        recurrence_interval_km: data.recurrence_interval_km,
        recurrence_interval_days: data.recurrence_interval_days,
        form_schema: formSchema,
      });

      toast.success("Maintenance type created successfully!");
      closeDialog();
    } catch (error) {
      console.error('Error creating maintenance type:', error);
      const errorMessage = error?.response?.message || 'Failed to create maintenance type. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  // --- Render Logic --- //
  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : closeDialog()}>
      <DialogTrigger asChild>
        <Button>
          <Icon icon="mingcute:calendar-add-fill" className="mr-2" />
          Add Maintenance Type
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle>Create New Maintenance Type</DialogTitle>
          <DialogDescription>
            Define a new type of maintenance task with its recurrence parameters and completion form structure.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
              <Button onClick={closeDialog} type="button" variant="outline">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <Icon icon="mdi:loading" className="mr-2 animate-spin" />
                    Creating...
                  </div>
                ) : (
                  'Create Maintenance Type'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateMaintenance