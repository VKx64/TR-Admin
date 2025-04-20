'use client'
// React and Hooks
import { useState, useEffect, useRef } from "react";
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
import { Label } from "../../ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/card";
import { getTruckById, updateTruck } from "@/services/trucks";

// Zod schema for form validation
const truckFormSchema = z.object({
  plate_number: z.string().min(1, "Plate number is required"),
  truck_model: z.string().min(1, "Truck model is required"),
  truck_color: z.string().optional(),
  truck_date: z.string()
    .optional()
    .refine(
      (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
      { message: "Date must be in YYYY-MM-DD format" }
    )
    .refine(
      (val) => {
        if (!val) return true; // Allow empty value
        const [year, month, day] = val.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return (
          !isNaN(date.getTime()) &&
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day
        );
      },
      { message: "Please enter a valid date" }
    ),
  truck_manufacturer: z.string().optional(),
  truck_engine_power: z.string().optional(),
  truck_engine_capacity: z.string().optional(),
  truck_fuel_type: z.string().optional(),
  tire_brand: z.string().optional(),
  tire_sizes: z.string().optional(),
  tire_psi: z.string().optional(),
  tire_lifespan: z.string().optional(),
  truck_type: z.string().optional(),
  truck_image: z.any().optional(),
});

const UpdateTruck = ({ isOpen, onClose, truckId, onSuccess }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const fileInputRef = useRef(null);

  // Form initialization
  const form = useForm({
    resolver: zodResolver(truckFormSchema),
    defaultValues: {
      plate_number: "",
      truck_model: "",
      truck_color: "",
      truck_type: "",
      truck_date: "",
      truck_manufacturer: "",
      truck_engine_power: "",
      truck_engine_capacity: "",
      truck_fuel_type: "",
      tire_brand: "",
      tire_sizes: "",
      tire_psi: "",
      tire_lifespan: "",
    },
  });

  useEffect(() => {
    if (isOpen && truckId) {
      loadTruckData();
    }
  }, [isOpen, truckId]);

  const loadTruckData = async () => {
    setLoading(true);
    try {
      const truckData = await getTruckById(truckId);

      // Format date as YYYY-MM-DD for input
      let formattedDate = "";
      if (truckData.truck_date) {
        const date = new Date(truckData.truck_date);
        formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }

      // Reset the form with the truck data
      form.reset({
        plate_number: truckData.plate_number || "",
        truck_model: truckData.truck_model || "",
        truck_color: truckData.truck_color || "",
        truck_type: truckData.truck_type || "",
        truck_date: formattedDate,
        truck_manufacturer: truckData.truck_manufacturer || "",
        truck_engine_power: truckData.truck_engine_power || "",
        truck_engine_capacity: truckData.truck_engine_capacity || "",
        truck_fuel_type: truckData.truck_fuel_type || "",
        tire_brand: truckData.tire_brand || "",
        tire_sizes: truckData.tire_sizes || "",
        tire_psi: truckData.tire_psi || "",
        tire_lifespan: truckData.tire_lifespan || "",
      });

      // Set image preview if available
      if (truckData.truck_image) {
        setImagePreview(`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${truckData.collectionId}/${truckData.id}/${truckData.truck_image}`);
      }
    } catch (error) {
      console.error("Error loading truck data:", error);
      toast.error("Failed to load truck data");
    } finally {
      setLoading(false);
    }
  };

  // Handle image click to open file selector
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Handle image change from file input
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // Clear the selected image
  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    fileInputRef.current.value = '';
    // This will tell the backend to remove the existing image
    form.setValue("truck_image", null);
  };

  // Format date input as user types
  const handleDateInputChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^\d-]/g, ''); // Remove non-digit/non-dash

    // Auto-insert dashes
    if (value.length === 4 && !value.includes('-')) {
      value += '-';
    } else if (value.length === 7 && value.indexOf('-', 5) === -1) {
      value += '-';
    }

    // Limit length
    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    form.setValue('truck_date', value, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Update the truck with form data and image file
      await updateTruck(truckId, data, imageFile);

      toast.success("Truck updated successfully");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating truck:", error);
      toast.error("Failed to update truck");
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
            {loading ? "Loading..." : "Edit Truck"}
          </DialogTitle>
          <DialogDescription>
            Update the details of this truck in your fleet.
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
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="engine">Engine</TabsTrigger>
                  <TabsTrigger value="tires">Tires</TabsTrigger>
                  <TabsTrigger value="image">Image</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-6">
                  {/* Basic Fields */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="plate_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plate Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., ABC-123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="truck_model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Isuzu NQR" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="truck_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., White" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="truck_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Truck Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Pickup, Semi, Box" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="truck_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Production Date</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="YYYY-MM-DD"
                              {...field}
                              onChange={handleDateInputChange}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground">
                            Enter date in YYYY-MM-DD format (e.g., 2025-04-20)
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Engine Tab */}
                <TabsContent value="engine" className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="truck_manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Volvo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="truck_engine_power"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engine Power</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 400HP" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="truck_engine_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engine Capacity</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 6.7L" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="truck_fuel_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuel Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select fuel type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Diesel">Diesel</SelectItem>
                              <SelectItem value="Gasoline">Gasoline</SelectItem>
                              <SelectItem value="Electric">Electric</SelectItem>
                              <SelectItem value="CNG">CNG</SelectItem>
                              <SelectItem value="LPG">LPG</SelectItem>
                              <SelectItem value="Hybrid">Hybrid</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Tires Tab */}
                <TabsContent value="tires" className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="tire_brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tire Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Bridgestone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tire_sizes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tire Sizes</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 295/75R22.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tire_psi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recommended PSI</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 105-115" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tire_lifespan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Tire Lifespan</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 50,000 miles" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Image Tab */}
                <TabsContent value="image" className="space-y-6">
                  <Card className="border rounded-md">
                    <CardHeader>
                      <CardTitle>Truck Image</CardTitle>
                      <CardDescription>Upload or update the truck's image</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                      {/* Image Preview */}
                      <div className="relative w-full max-w-md aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Truck preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center text-center p-2">
                            <Icon icon="mdi:truck-image" className="h-16 w-16 text-muted-foreground/50 mb-2" />
                            <span className="text-muted-foreground">No image selected</span>
                          </div>
                        )}
                      </div>

                      {/* Image Controls */}
                      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleImageClick}
                          className="flex-1"
                        >
                          <Icon icon="mdi:upload" className="mr-2 h-4 w-4" />
                          {imagePreview ? "Change Image" : "Upload Image"}
                        </Button>

                        {imagePreview && (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={clearImage}
                            className="flex-1"
                          >
                            <Icon icon="mdi:delete" className="mr-2 h-4 w-4" />
                            Remove Image
                          </Button>
                        )}

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          aria-hidden="true"
                        />
                      </div>
                      <FormMessage>{form.formState.errors.truck_image?.message}</FormMessage>
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

export default UpdateTruck;