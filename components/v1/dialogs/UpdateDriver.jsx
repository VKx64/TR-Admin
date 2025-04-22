'use client'
// React and Hooks
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Icon } from '@iconify/react';
import { getDriverById, updateDriver } from "@/services/drivers";

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

// Zod schema for form validation
const driverFormSchema = z.object({
  // User details
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal('')),
  role: z.string().optional(),

  // Driver details
  address: z.string().optional(),
  phone: z.string().optional(),
  driver_license_number: z.string().optional(),
  driver_license_code: z.string().optional(),
  driver_license_picture: z.any().optional(),
});

const UpdateDriver = ({ isOpen, onClose, driverId, onSuccess }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const fileInputRef = useRef(null);

  // Form initialization
  const form = useForm({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      username: "",
      email: "",
      role: "",
      address: "",
      phone: "",
      driver_license_number: "",
      driver_license_code: "",
    },
  });

  useEffect(() => {
    if (isOpen && driverId) {
      loadDriverData();
    }
  }, [isOpen, driverId]);

  const loadDriverData = async () => {
    setLoading(true);
    try {
      const driverData = await getDriverById(driverId);

      // Get driver details data if available
      const driverDetails = driverData.expand?.driver_details_id || {};

      // Reset the form with the driver data
      form.reset({
        username: driverData.username || "",
        email: driverData.email || "",
        role: driverData.role || "",
        address: driverDetails.address || "",
        phone: driverDetails.phone || "",
        driver_license_number: driverDetails.driver_license_number || "",
        driver_license_code: driverDetails.driver_license_code || "",
      });

      // Set license image preview if available
      if (driverDetails.driver_license_picture) {
        setImagePreview(`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${driverDetails.collectionId}/${driverDetails.id}/${driverDetails.driver_license_picture}`);
      }
    } catch (error) {
      console.error("Error loading driver data:", error);
      toast.error("Failed to load driver data");
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
    form.setValue("driver_license_picture", null);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Prepare user data and driver details data
      const userData = {
        username: data.username,
        email: data.email,
        role: data.role,
      };

      const driverDetailsData = {
        address: data.address,
        phone: data.phone,
        driver_license_number: data.driver_license_number,
        driver_license_code: data.driver_license_code,
      };

      // Update the driver with form data and image file
      await updateDriver(driverId, userData, driverDetailsData, imageFile);

      toast.success("Driver updated successfully");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating driver:", error);
      toast.error("Failed to update driver");
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
            {loading ? "Loading..." : "Edit Driver"}
          </DialogTitle>
          <DialogDescription>
            Update the details of this driver in your fleet.
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
                  <TabsTrigger value="license">License Details</TabsTrigger>
                  <TabsTrigger value="image">License Image</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., johndoe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., john.doe@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="driver">Driver</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 123 Main St, City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., +1 234 567 8901" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* License Details Tab */}
                <TabsContent value="license" className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="driver_license_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., DL12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="driver_license_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Class/Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Class A, CDL" {...field} />
                          </FormControl>
                          <FormMessage />
                          <FormDescription>
                            Specify the driver license class or type (e.g., CDL, Class A, B, C, etc.)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* License Image Tab */}
                <TabsContent value="image" className="space-y-6">
                  <Card className="border rounded-md">
                    <CardHeader>
                      <CardTitle>License Image</CardTitle>
                      <CardDescription>Upload or update the driver's license image</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                      {/* Image Preview */}
                      <div className="relative w-full max-w-md aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="License preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center text-center p-2">
                            <Icon icon="mdi:license" className="h-16 w-16 text-muted-foreground/50 mb-2" />
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
                      <FormMessage>{form.formState.errors.driver_license_picture?.message}</FormMessage>
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

export default UpdateDriver;