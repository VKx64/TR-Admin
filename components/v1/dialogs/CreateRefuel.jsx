'use client'
// React and Hooks
import React, { useState, useRef, useEffect } from 'react'

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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

// --- Constants --- //

// Zod schema for form validation
const refuelFormSchema = z.object({
  truck_id: z.string().min(1, "Truck selection is required"),
  fuel_amount: z.coerce.number()
    .min(0.1, "Fuel amount must be greater than 0")
    .optional()
    .nullable(),
  fuel_price: z.coerce.number()
    .min(0.01, "Fuel price must be greater than 0")
    .optional()
    .nullable(),
  odometer_reading: z.coerce.number()
    .min(0, "Odometer reading cannot be negative")
    .optional()
    .nullable(),
  reciept: z.any().optional(),
})

// Default form values
const defaultFormValues = {
  truck_id: "",
  fuel_amount: "",
  fuel_price: "",
  odometer_reading: "",
  reciept: null,
}

// --- Component Definition --- //

const CreateRefuel = ({ onSuccess }) => {
  // --- State and Refs --- //
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('truck')
  const [previewImage, setPreviewImage] = useState(null)
  const [trucks, setTrucks] = useState([])
  const fileInputRef = useRef(null)

  // --- Fetch available trucks --- //
  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const records = await pb.collection('trucks').getFullList({
          sort: 'plate_number',
          fields: 'id,plate_number,truck_model'
        });
        setTrucks(records);
      } catch (error) {
        console.error('Failed to fetch trucks:', error);
        toast.error('Failed to load trucks. Please try again.');
      }
    };

    if (isOpen) {
      fetchTrucks();
    }
  }, [isOpen]);

  // --- Form Initialization --- //
  const form = useForm({
    resolver: zodResolver(refuelFormSchema),
    defaultValues: defaultFormValues,
  })

  // --- Helper Functions --- //

  // Resets the form fields, image preview, and active tab
  const resetForm = () => {
    form.reset(defaultFormValues) // Reset react-hook-form state
    setPreviewImage(null)
    setActiveTab('truck')
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

  // Handles the selection of a receipt image file
  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      form.setValue("reciept", file, { shouldValidate: true })
      setPreviewImage(URL.createObjectURL(file))
    }
  }

  // --- Form Submission --- //

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const formData = new FormData()

      // Add truck relation
      formData.append('truck_id', data.truck_id)

      // Add number values
      if (data.fuel_amount !== undefined && data.fuel_amount !== null && data.fuel_amount !== '') {
        formData.append('fuel_amount', data.fuel_amount)
      }

      if (data.fuel_price !== undefined && data.fuel_price !== null && data.fuel_price !== '') {
        formData.append('fuel_price', data.fuel_price)
      }

      if (data.odometer_reading !== undefined && data.odometer_reading !== null && data.odometer_reading !== '') {
        formData.append('odometer_reading', data.odometer_reading)
      }

      // Add receipt image if present
      if (data.reciept) {
        formData.append('reciept', data.reciept)
      }

      await pb.collection('truck_fuel').create(formData)
      toast.success("Refuel record added successfully!")
      closeDialog()

      // Call onSuccess callback if provided to refresh data
      if (typeof onSuccess === 'function') {
        onSuccess()
      }
    } catch (error) {
      console.error('Error creating refuel record:', error)
      const errorMessage = error?.response?.message || 'Failed to create refuel record. Please try again.'
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
          <Icon icon="mingcute:gas-station-fill" className="mr-2" />
          Add Refuel Record
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle>Add Truck Refuel Record</DialogTitle>
          <DialogDescription>
            Enter the details of the truck refueling.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="truck">Select Truck</TabsTrigger>
                <TabsTrigger value="refuel">Refuel Details</TabsTrigger>
                <TabsTrigger value="receipt">Receipt</TabsTrigger>
              </TabsList>

              {/* Select Truck Tab */}
              <TabsContent value="truck" className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="truck_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Truck *</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            <option value="">Select a truck</option>
                            {trucks.map((truck) => (
                              <option key={truck.id} value={truck.id}>
                                {truck.plate_number} - {truck.truck_model}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="text-sm text-muted-foreground">
                    Select the truck for which you are adding a refuel record.
                  </div>
                </div>
              </TabsContent>

              {/* Refuel Details Tab */}
              <TabsContent value="refuel" className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fuel_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel Amount (L)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 50.5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fuel_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel Price (₱)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 75.50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="odometer_reading"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odometer Reading (km)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="e.g., 12500.5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Receipt Tab */}
              <TabsContent value="receipt" className="space-y-6">
                <Card className="border rounded-md">
                  <CardHeader>
                    <CardTitle>Receipt Image</CardTitle>
                    <CardDescription>Upload an image of the refuel receipt</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center space-y-4">
                    {/* Image Preview */}
                    <div className="relative w-full max-w-md aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt="Receipt preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-center p-2">
                          <Icon icon="mdi:receipt" className="h-16 w-16 text-muted-foreground/50 mb-2" />
                          <span className="text-muted-foreground">No receipt image selected</span>
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
                        {previewImage ? "Change Receipt" : "Upload Receipt"}
                      </Button>

                      {previewImage && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            setPreviewImage(null);
                            form.setValue("reciept", null);
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
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        aria-hidden="true"
                      />
                    </div>
                    <FormMessage>{form.formState.errors.reciept?.message}</FormMessage>
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
                  'Save Refuel Record'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateRefuel