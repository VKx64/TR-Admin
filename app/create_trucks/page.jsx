'use client'
import React, { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Icon } from '@iconify/react'
import pb from '@/services/pocketbase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label' // Not explicitly used with FormField, but good to keep if direct Label usage is planned
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

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
        if (!val) return true; // Optional field, valid if empty
        const year = parseInt(val, 10);
        // Current year is 2025 based on context
        return !isNaN(year) && year >= 1900 && year <= 2025 + 1;
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
  truck_image: z.any().optional(), // Will be File object or null
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

const CreateTruckPage = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const fileInputRef = useRef(null)

  const form = useForm({
    resolver: zodResolver(truckFormSchema),
    defaultValues: defaultFormValues,
  })

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result)
      }
      reader.readAsDataURL(file)
      form.setValue('truck_image', file) // Set the File object for submission
    } else {
      setPreviewImage(null)
      form.setValue('truck_image', null)
    }
  }

  const resetFormAndPreview = () => {
    form.reset(defaultFormValues)
    setPreviewImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = "" // Reset file input
    }
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    const formData = new FormData()

    // Append all fields to FormData
    Object.keys(data).forEach(key => {
      if (key === 'truck_image' && data.truck_image instanceof File) {
        formData.append(key, data.truck_image)
      } else if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        formData.append(key, data[key])
      }
    });

    // If a field is optional and empty, and your backend expects null or for it not to be present,
    // you might need to adjust the above loop or remove empty strings from formData if PocketBase errors on them.
    // For now, sending empty strings for optional fields if they are set as such.

    try {
      await pb.collection('trucks').create(formData)
      toast.success('Truck created successfully!')
      resetFormAndPreview()
      router.push('/trucks') // Navigate to trucks list page
    } catch (error) {
      console.error("Failed to create truck:", error)
      let errorMessage = 'Failed to create truck.'
      if (error.data && error.data.data) {
        const fieldErrors = Object.values(error.data.data).map(err => err.message).join('; ');
        if (fieldErrors) errorMessage += ` Details: ${fieldErrors}`;
      }
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">Create New Vehicle</h1>
            <p className="text-muted-foreground mb-6">Fill in the details below to add a new truck to the system.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4 mb-6">
                <FormField
                  control={form.control}
                  name="plate_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plate Number*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ABC 123" {...field} />
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
                      <FormLabel>Truck Model*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., FUSO Canter" {...field} />
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
                  name="truck_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 2023" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="truck_manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Mitsubishi" {...field} />
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
                        <Input placeholder="e.g., 6 Wheeler Cargo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            {/* Engine & Tire Details */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Engine Details</h3>
              <div className="grid grid-cols-1 gap-4 mb-6">
                <FormField
                  control={form.control}
                  name="truck_engine_power"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engine Power</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 150 HP" {...field} />
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
                        <Input placeholder="e.g., 3.0L" {...field} />
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
                      <FormControl>
                        <Input placeholder="e.g., Diesel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator className="my-4" />
              <h3 className="text-lg font-semibold mb-2">Tire Details</h3>
              <div className="grid grid-cols-1 gap-4 mb-6">
                <FormField
                  control={form.control}
                  name="tire_brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tire Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Michelin" {...field} />
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
                        <Input placeholder="e.g., 295/80R22.5" {...field} />
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
                      <FormLabel>Tire PSI</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 110 PSI" {...field} />
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
                      <FormLabel>Tire Lifespan (km)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 80000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            {/* Truck Image */}
            <div className="flex flex-col items-center justify-start">
              <h3 className="text-lg font-semibold mb-4">Truck Image</h3>
              <FormField
                control={form.control}
                name="truck_image"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <div
                        className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400"
                        onClick={handleImageClick}
                      >
                        <Avatar className="w-44 h-44">
                          <AvatarImage src={previewImage} alt="Truck preview" />
                          <AvatarFallback>
                            <Icon icon="mdi:image-plus" className="w-16 h-16 text-gray-400" />
                          </AvatarFallback>
                        </Avatar>
                        <Input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="mt-2">
                      Click to upload an image (max 5MB).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-8">
            <Button type="button" variant="outline" onClick={resetFormAndPreview} disabled={isLoading}>
              Reset
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Truck'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default CreateTruckPage