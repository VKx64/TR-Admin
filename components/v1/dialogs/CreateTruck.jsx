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
} from "@/components/ui/form"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

// --- Constants --- //

// Zod schema for form validation
const truckFormSchema = z.object({
  plate_number: z.string().min(1, "Plate number is required"),
  truck_model: z.string().min(1, "Truck model is required"),
  truck_color: z.string().optional(),
  truck_year: z.string()
    .optional()
    .refine(
      (val) => !val || /^\d{4}$/.test(val),
      { message: "Year must be in YYYY format" }
    )
    .refine(
      (val) => {
        if (!val) return true; // Allow empty value
        const year = parseInt(val, 10);
        return !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1;
      },
      { message: "Please enter a valid year between 1900 and next year" }
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
})

// Default form values
const defaultFormValues = {
  plate_number: "",
  truck_model: "",
  truck_color: "",
  truck_year: "",
  truck_manufacturer: "",
  truck_engine_power: "",
  truck_engine_capacity: "",
  truck_fuel_type: "",
  tire_brand: "",
  tire_sizes: "",
  tire_psi: "",
  tire_lifespan: "",
  truck_type: "",
  truck_image: null,
}

// --- Component Definition --- //

const CreateTruck = () => { // Remove onSuccess prop
  // --- State and Refs --- //
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [previewImage, setPreviewImage] = useState(null)
  const fileInputRef = useRef(null)

  // --- Form Initialization --- //
  const form = useForm({
    resolver: zodResolver(truckFormSchema),
    defaultValues: defaultFormValues,
  })

  // --- Helper Functions --- //

  // Resets the form fields, image preview, and active tab
  const resetForm = () => {
    form.reset(defaultFormValues) // Reset react-hook-form state
    setPreviewImage(null)
    setActiveTab('basic')
    if (fileInputRef.current) {
      fileInputRef.current.value = '' // Clear the file input element
    }
  }

  // Closes the dialog and resets the form
  const closeDialog = () => {
    setIsOpen(false)
    resetForm()
  }

  // Opens the hidden file input dialog
  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  // Handles the selection of an image file
  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      form.setValue("truck_image", file, { shouldValidate: true })
      setPreviewImage(URL.createObjectURL(file))
    }
  }

  // Formats the date input to YYYY-MM-DD as the user types
  const handleDateInputChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^\\d-]/g, ''); // Remove non-digit/non-dash

    // Auto-insert dashes
    if (value.length === 4 && !value.includes('-')) {
      value += '-';
    } else if (value.length === 7 && value.indexOf('-', 5) === -1) {
      value += '-'; // Completed this line
    }

    // Limit length
    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    form.setValue('truck_date', value, { shouldValidate: true });
  };

  // --- Form Submission --- //

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'truck_date' && value) {
          // Convert YYYY-MM-DD to full RFC3339 format
          const dateObj = new Date(value);
          if (!isNaN(dateObj.getTime())) {
            // Format as YYYY-MM-DDTHH:MM:SS.sssZ
            const formattedDate = dateObj.toISOString();
            formData.append(key, formattedDate);
          }
        } else if (key === 'truck_image' && value) {
          formData.append(key, value)
        } else if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value)
        }
      })

      await pb.collection('trucks').create(formData)
      toast.success("Truck added successfully!")
      closeDialog()
    } catch (error) {
      console.error('Error creating truck:', error)
      const errorMessage = error?.response?.message || 'Failed to create truck. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // --- Render Logic --- //

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : closeDialog()}>
      <DialogTrigger asChild>
        <Button>
          <Icon icon="mdi:truck-plus" className="mr-2" />
          Add New Truck
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle>Add New Truck</DialogTitle>
          <DialogDescription>
            Enter the details of the new truck to add to your fleet.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                    name="truck_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Production Year</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="YYYY"
                            {...field}
                            onChange={field.onChange}
                            value={field.value || ''}
                            maxLength={4} // Added maxLength attribute
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground">
                          Enter year in YYYY format (e.g., 2025)
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fuel type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Diesel">Diesel</SelectItem>
                            <SelectItem value="Regular">Regular</SelectItem>
                            <SelectItem value="Special">Special</SelectItem>
                            <SelectItem value="Premium">Premium</SelectItem>
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
                    <CardDescription>Upload an image of the truck</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center space-y-4">
                    {/* Image Preview */}
                    <div className="relative w-full max-w-md aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
                      {previewImage ? (
                        <img
                          src={previewImage}
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
                        {previewImage ? "Change Image" : "Upload Image"}
                      </Button>

                      {previewImage && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            setPreviewImage(null);
                            form.setValue("truck_image", null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
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
                  'Create Truck'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateTruck