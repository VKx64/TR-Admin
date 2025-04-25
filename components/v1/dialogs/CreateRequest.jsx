'use client'
// React and Hooks
import React, { useState, useEffect } from 'react'

// Third-party Libraries
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Icon } from '@iconify/react'
import { toast } from "sonner"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// --- Constants --- //

// Zod schema for form validation
const requestFormSchema = z.object({
  truck: z.string().min(1, "Truck is required"),
  maintenance_type: z.string().min(1, "Maintenance type is required"),
  requesting_driver: z.string().min(1, "Requesting driver is required"),
  request_date: z.date({
    required_error: "Request date is required",
  }),
  current_mileage_at_request: z.coerce.number().min(0, "Mileage must be a positive number"),
})

// Default form values
const defaultFormValues = {
  truck: "",
  maintenance_type: "",
  requesting_driver: "",
  request_date: new Date(),
  current_mileage_at_request: "",
}

// --- Component Definition --- //

const CreateRequest = () => {
  // --- State and Refs --- //
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [trucks, setTrucks] = useState([])
  const [maintenanceTypes, setMaintenanceTypes] = useState([])
  const [drivers, setDrivers] = useState([])

  // --- Form Initialization --- //
  const form = useForm({
    resolver: zodResolver(requestFormSchema),
    defaultValues: defaultFormValues,
  })

  // --- Fetch Data --- //
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch trucks
        const trucksData = await pb.collection('trucks').getList(1, 100, {
          sort: 'plate_number',
        })
        setTrucks(trucksData.items)

        // Fetch maintenance types
        const typesData = await pb.collection('maintenance_type').getList(1, 100, {
          sort: 'name',
        })
        setMaintenanceTypes(typesData.items)

        // Fetch drivers
        const driversData = await pb.collection('users').getList(1, 100, {
          filter: 'role = "driver"',
          sort: 'username',
        })
        setDrivers(driversData.items)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load required data')
      }
    }

    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  // --- Helper Functions --- //

  // Resets the form fields
  const resetForm = () => {
    form.reset(defaultFormValues)
  }

  // Closes the dialog and resets the form
  const closeDialog = () => {
    setIsOpen(false)
    resetForm()
  }

  // --- Form Submission --- //
  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      // Prepare data for submission
      const formData = {
        truck: data.truck,
        maintenance_type: data.maintenance_type,
        requesting_driver: data.requesting_driver,
        request_date: data.request_date.toISOString().split('T')[0],
        current_mileage_at_request: data.current_mileage_at_request,
        status: "pending", // Default status is pending
        admin_handler: pb.authStore.model.id, // Current logged in admin
        // handled_date and admin_notes are null by default
      }

      await pb.collection('maintenance_request').create(formData)
      toast.success("Maintenance request created successfully!")
      closeDialog()
    } catch (error) {
      console.error('Error creating maintenance request:', error)
      const errorMessage = error?.response?.message || 'Failed to create maintenance request. Please try again.'
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
          <Icon icon="material-symbols:build-circle-outline" className="mr-2" />
          Create Maintenance Request
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle>Create Maintenance Request</DialogTitle>
          <DialogDescription>
            Submit a new maintenance request for a truck in your fleet.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Truck Selection */}
              <FormField
                control={form.control}
                name="truck"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Truck *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select truck" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trucks.map((truck) => (
                          <SelectItem key={truck.id} value={truck.id}>
                            {truck.plate_number} - {truck.truck_model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Maintenance Type Selection */}
              <FormField
                control={form.control}
                name="maintenance_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select maintenance type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maintenanceTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Requesting Driver Selection */}
              <FormField
                control={form.control}
                name="requesting_driver"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requesting Driver *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Request Date - Following shadcn documentation exactly */}
              <FormField
                control={form.control}
                name="request_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Request Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current Mileage */}
              <FormField
                control={form.control}
                name="current_mileage_at_request"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Mileage *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter current mileage"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateRequest