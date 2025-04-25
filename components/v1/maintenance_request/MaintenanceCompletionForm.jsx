import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import pb from "@/services/pocketbase";
import { Icon } from '@iconify/react';

// UI Components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Form validation schema
const completionFormSchema = z.object({
  odometer: z.string().min(1, "Current odometer reading is required"),
  cost: z.string().optional(),
  adminNotes: z.string().optional(),
  // Dynamic fields will be added to formValues separately
});

const MaintenanceCompletionForm = ({
  isOpen,
  onClose,
  requestData,
  onComplete
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formSchema, setFormSchema] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [receipt, setReceipt] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const fileInputRef = useRef(null);

  // Initialize form with react-hook-form
  const form = useForm({
    resolver: zodResolver(completionFormSchema),
    defaultValues: {
      odometer: "",
      cost: "",
      adminNotes: "",
    },
  });

  // Fetch form schema from maintenance type when component mounts
  useEffect(() => {
    const fetchFormSchema = async () => {
      if (!requestData?.expand?.maintenance_type?.id) return;

      try {
        const maintenanceType = await pb.collection('maintenance_type').getOne(
          requestData.expand.maintenance_type.id
        );

        if (maintenanceType?.form_schema) {
          setFormSchema(maintenanceType.form_schema);

          // Initialize form values
          const initialValues = {};
          maintenanceType.form_schema.forEach(field => {
            initialValues[field.id] = '';
          });
          setFormValues(initialValues);
        }
      } catch (error) {
        console.error('Error fetching maintenance type form schema:', error);
      }
    };

    const initializeForm = () => {
      if (requestData?.current_mileage_at_request) {
        form.setValue("odometer", requestData.current_mileage_at_request.toString());
      }
    };

    if (isOpen && requestData) {
      fetchFormSchema();
      initializeForm();
    }
  }, [isOpen, requestData, form]);

  // Handle input change for dynamic form fields
  const handleInputChange = (fieldId, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceipt(file);
    }
  };

  // Opens the hidden file input dialog
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Handle form submission
  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();

      // Add relation IDs
      formData.append('associated_request', requestData.id);
      formData.append('truck', requestData.truck);
      formData.append('maintenance_type', requestData.maintenance_type);
      formData.append('logging_admin', pb.authStore.model.id);

      // Add form values
      formData.append('completion_date', new Date().toISOString().split('T')[0]);
      formData.append('odometer_at_completion', parseFloat(data.odometer));

      // Add cost if provided
      if (data.cost.trim()) {
        formData.append('cost', parseFloat(data.cost));
      }

      // Add receipt if provided
      if (receipt) {
        formData.append('receipt', receipt);
      }

      // Add completion data as JSON
      formData.append('completion_data', JSON.stringify(formValues));

      // Create the maintenance record
      await pb.collection('maintenance_records').create(formData);

      // Update the maintenance request status to completed
      await pb.collection('maintenance_request').update(requestData.id, {
        status: 'completed',
        admin_handler: pb.authStore.model.id,
        handled_date: new Date().toISOString().split('T')[0],
        admin_notes: data.adminNotes // Use the separate admin notes field
      });

      toast.success("Maintenance request completed successfully!");

      // Trigger the onComplete callback
      if (onComplete) {
        onComplete();
      }

      onClose();
    } catch (error) {
      console.error('Error completing maintenance request:', error);
      toast.error("Failed to complete maintenance request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form on close
  const resetForm = () => {
    form.reset({
      odometer: requestData?.current_mileage_at_request?.toString() || "",
      cost: "",
      adminNotes: "",
    });
    setFormValues({});
    setReceipt(null);
    setActiveTab('details');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format the truck info for display
  const getTruckInfo = () => {
    if (!requestData?.expand?.truck) return "Unknown Truck";

    const truck = requestData.expand.truck;
    return `${truck.plate_number || "Unknown"} - ${truck.truck_model || ""}`;
  };

  // Format the maintenance type for display
  const getMaintenanceTypeInfo = () => {
    return requestData?.expand?.maintenance_type?.name || "Unknown Maintenance Type";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? null : onClose()}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle>Complete Maintenance Request</DialogTitle>
          <DialogDescription>
            Fill out the completion details for {getMaintenanceTypeInfo()} on {getTruckInfo()}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Odometer Reading - Always visible */}
            <FormField
              control={form.control}
              name="odometer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Odometer Reading (km) *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Current mileage"
                      type="number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tabbed Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="details">Maintenance Details</TabsTrigger>
                <TabsTrigger value="receipt">Cost & Receipt</TabsTrigger>
                <TabsTrigger value="notes">Admin Notes</TabsTrigger>
              </TabsList>

              {/* Maintenance Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Maintenance Details</CardTitle>
                    <CardDescription>
                      Fill out the specific maintenance details for this service
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formSchema.length > 0 ? (
                      formSchema.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
                          {field.id.includes('notes') || field.label.toLowerCase().includes('notes') ? (
                            <Textarea
                              id={`field-${field.id}`}
                              value={formValues[field.id] || ''}
                              onChange={(e) => handleInputChange(field.id, e.target.value)}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              rows={3}
                              className="w-full"
                            />
                          ) : (
                            <Input
                              id={`field-${field.id}`}
                              value={formValues[field.id] || ''}
                              onChange={(e) => handleInputChange(field.id, e.target.value)}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              className="w-full"
                            />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        No completion fields defined for this maintenance type
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Receipt Tab */}
              <TabsContent value="receipt" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cost & Receipt</CardTitle>
                    <CardDescription>
                      Enter the maintenance cost and upload any receipts or invoices
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Cost */}
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maintenance Cost</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter cost"
                              type="number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Receipt Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="receipt">Receipt / Invoice</Label>
                      <div className="flex flex-col gap-4">
                        <div className="relative w-full max-w-md aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden mx-auto">
                          {receipt ? (
                            <div className="w-full h-full flex items-center justify-center p-4">
                              <div className="text-center">
                                <Icon icon="material-symbols:file-present" className="h-16 w-16 text-primary mx-auto mb-2" />
                                <p className="text-sm font-medium truncate max-w-[200px]">{receipt.name}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-center p-2">
                              <Icon icon="mdi:receipt" className="h-16 w-16 text-muted-foreground/50 mb-2" />
                              <span className="text-muted-foreground">No receipt uploaded</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-row gap-4 w-full max-w-md mx-auto">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleImageClick}
                            className="flex-1"
                          >
                            <Icon icon="mdi:upload" className="mr-2 h-4 w-4" />
                            {receipt ? "Change Receipt" : "Upload Receipt"}
                          </Button>

                          {receipt && (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => {
                                setReceipt(null);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                              className="flex-1"
                            >
                              <Icon icon="mdi:delete" className="mr-2 h-4 w-4" />
                              Remove Receipt
                            </Button>
                          )}

                          <input
                            ref={fileInputRef}
                            id="receipt"
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,.pdf"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Admin Notes Tab */}
              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Admin Notes</CardTitle>
                    <CardDescription>
                      Add any administrative notes about this maintenance request
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="adminNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Enter any additional administrative notes"
                              rows={6}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex justify-end gap-4 pt-4 border-t mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                type="button"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Icon icon="mdi:loading" className="mr-2 animate-spin" />
                    Saving...
                  </div>
                ) : (
                  'Complete Maintenance'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceCompletionForm;