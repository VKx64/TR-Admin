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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// --- Constants --- //

// Zod schema for form validation
const driverFormSchema = z.object({
  // User account fields
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().default("driver"),
  avatar: z.any().optional(),

  // Driver details fields
  region: z.string().min(1, "Region is required"),
  province: z.string().min(1, "Province is required"),
  city: z.string().min(1, "City/Municipality is required"),
  barangay: z.string().min(1, "Barangay is required"),
  postalCode: z.string().optional(),
  streetAddress: z.string().optional(),
  phone: z.string().optional(),
  driver_license_number: z.string().min(1, "License number is required"),
  driver_license_code: z.string().optional(),
  driver_license_picture: z.any().optional(),
  user_id: z.string().optional(),
})

// Default form values
const defaultFormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  password: "",
  role: "driver",
  avatar: null,

  region: "",
  province: "",
  city: "",
  barangay: "",
  postalCode: "",
  streetAddress: "",
  phone: "",
  driver_license_number: "",
  driver_license_code: "",
  driver_license_picture: null,
  user_id: "",
}

// --- Component Definition --- //

const CreateDriver = () => {
  // --- State and Refs --- //
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('account')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [licensePreview, setLicensePreview] = useState(null)
  const avatarFileInputRef = useRef(null)
  const licenseFileInputRef = useRef(null)

  // Address selection states
  const [regions, setRegions] = useState([])
  const [provinces, setProvinces] = useState([])
  const [cities, setCities] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingBarangays, setLoadingBarangays] = useState(false)

  // --- Form Initialization --- //
  const form = useForm({
    resolver: zodResolver(driverFormSchema),
    defaultValues: defaultFormValues,
  })

  // --- API Data Fetching --- //

  // Fetch regions on component mount
  useEffect(() => {
    const fetchRegions = async () => {
      setLoadingRegions(true)
      try {
        const response = await fetch('https://psgc.cloud/api/regions')
        const data = await response.json()
        setRegions(data)
      } catch (error) {
        console.error('Failed to fetch regions:', error)
        toast.error('Failed to load regions. Please try again.')
      } finally {
        setLoadingRegions(false)
      }
    }

    fetchRegions()
  }, [])

  // Fetch provinces when region changes
  useEffect(() => {
    const regionCode = form.watch('region')
    if (!regionCode) {
      setProvinces([])
      setCities([])
      setBarangays([])
      return
    }

    const fetchProvinces = async () => {
      setLoadingProvinces(true)
      try {
        const response = await fetch(`https://psgc.cloud/api/regions/${regionCode}/provinces`)
        const data = await response.json()
        setProvinces(data)
        form.setValue('province', '')
        form.setValue('city', '')
        form.setValue('barangay', '')
      } catch (error) {
        console.error('Failed to fetch provinces:', error)
        toast.error('Failed to load provinces. Please try again.')
      } finally {
        setLoadingProvinces(false)
      }
    }

    fetchProvinces()
  }, [form.watch('region')])

  // Fetch cities when province changes
  useEffect(() => {
    const provinceCode = form.watch('province')
    if (!provinceCode) {
      setCities([])
      setBarangays([])
      return
    }

    const fetchCities = async () => {
      setLoadingCities(true)
      try {
        const response = await fetch(`https://psgc.cloud/api/provinces/${provinceCode}/cities-municipalities`)
        const data = await response.json()
        setCities(data)
        form.setValue('city', '')
        form.setValue('barangay', '')
      } catch (error) {
        console.error('Failed to fetch cities:', error)
        toast.error('Failed to load cities. Please try again.')
      } finally {
        setLoadingCities(false)
      }
    }

    fetchCities()
  }, [form.watch('province')])

  // Fetch barangays when city changes
  useEffect(() => {
    const cityCode = form.watch('city')
    if (!cityCode) {
      setBarangays([])
      return
    }

    const fetchBarangays = async () => {
      setLoadingBarangays(true)
      try {
        const response = await fetch(`https://psgc.cloud/api/cities-municipalities/${cityCode}/barangays`)
        const data = await response.json()
        setBarangays(data)
        form.setValue('barangay', '')
      } catch (error) {
        console.error('Failed to fetch barangays:', error)
        toast.error('Failed to load barangays. Please try again.')
      } finally {
        setLoadingBarangays(false)
      }
    }

    fetchBarangays()
  }, [form.watch('city')])

  // --- Helper Functions --- //

  // Generate the full name from firstName, middleName, and lastName
  const generateFullName = (firstName, middleName, lastName) => {
    const middleNamePart = middleName ? ` ${middleName}` : '';
    return `${firstName}${middleNamePart} ${lastName}`.trim();
  };

  // Format the complete address for storage
  const formatCompleteAddress = (data) => {
    const street = data.streetAddress?.trim() || '';
    const barangay = barangays.find(b => b.code === data.barangay)?.name || data.barangay || '';
    const city = cities.find(c => c.code === data.city)?.name || data.city || '';
    const province = provinces.find(p => p.code === data.province)?.name || data.province || '';
    const region = regions.find(r => r.code === data.region)?.name || data.region || '';
    const postal = data.postalCode?.trim() || '';

    const parts = [
      street,
      `Brgy. ${barangay}`,
      city,
      province,
      region,
      postal ? `Postal Code: ${postal}` : ''
    ].filter(Boolean);

    return parts.join(', ');
  };

  // Resets the form fields, image previews, and active tab
  const resetForm = () => {
    form.reset(defaultFormValues) // Reset react-hook-form state
    setAvatarPreview(null)
    setLicensePreview(null)
    setActiveTab('account')
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '' // Clear the avatar file input
    }
    if (licenseFileInputRef.current) {
      licenseFileInputRef.current.value = '' // Clear the license file input
    }
  }

  // Closes the dialog and resets the form
  const closeDialog = () => {
    setIsOpen(false)
    resetForm()
  }

  // Opens the hidden avatar file input dialog
  const handleAvatarClick = () => {
    avatarFileInputRef.current?.click()
  }

  // Opens the hidden license file input dialog
  const handleLicenseClick = () => {
    licenseFileInputRef.current?.click()
  }

  // Handles the selection of an avatar image file
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      form.setValue("avatar", file, { shouldValidate: true })
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  // Handles the selection of a license image file
  const handleLicenseChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      form.setValue("driver_license_picture", file, { shouldValidate: true })
      setLicensePreview(URL.createObjectURL(file))
    }
  }

  // --- Form Submission --- //
  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      // Create driver details record first
      const driverDetailsData = new FormData()

      // Format the complete address from all address fields
      const completeAddress = formatCompleteAddress(data);
      driverDetailsData.append("address", completeAddress)

      // Add the individual address components for potential future use
      driverDetailsData.append("region_code", data.region)
      driverDetailsData.append("province_code", data.province)
      driverDetailsData.append("city_code", data.city)
      driverDetailsData.append("barangay_code", data.barangay)
      driverDetailsData.append("postal_code", data.postalCode || "")
      driverDetailsData.append("street_address", data.streetAddress || "")

      driverDetailsData.append("phone", data.phone || "")
      driverDetailsData.append("driver_license_number", data.driver_license_number)
      driverDetailsData.append("driver_license_code", data.driver_license_code || "")

      // Add the current authenticated user's ID
      if (pb.authStore.record) {
        driverDetailsData.append("user_id", pb.authStore.record.id)
      }

      if (data.driver_license_picture) {
        driverDetailsData.append("driver_license_picture", data.driver_license_picture)
      }

      const driverDetails = await pb.collection('driver_details').create(driverDetailsData)

      // Generate the full name for the username field
      const fullName = generateFullName(data.firstName, data.middleName, data.lastName);

      // Now create the user record with reference to driver details
      const userData = new FormData()
      userData.append("username", fullName) // Store the full name in the username field
      userData.append("email", data.email)
      userData.append("password", data.password)
      userData.append("passwordConfirm", data.password)
      userData.append("role", "driver")
      userData.append("driver_details_id", driverDetails.id)
      userData.append("emailVisibility", true) // Ensure email visibility is set to true

      // Also add the current authenticated user's ID to the user record
      if (pb.authStore.record) {
        userData.append("user_id", pb.authStore.record.id)
      }

      if (data.avatar) {
        userData.append("avatar", data.avatar)
      }

      // Create user with driver role
      await pb.collection('users').create(userData)

      toast.success("Driver registered successfully!")
      closeDialog()
    } catch (error) {
      console.error('Error creating driver:', error)
      const errorMessage = error?.response?.message || 'Failed to register driver. Please try again.'
      toast.error(errorMessage)

      // If there was an error, try to clean up the driver_details record if it was created
      // This could be expanded with more robust error handling
    } finally {
      setIsLoading(false)
    }
  }

  // --- Render Logic --- //
  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : closeDialog()}>
      <DialogTrigger asChild>
        <Button>
          <Icon icon="mdi:account-plus" className="mr-2" />
          Add Driver
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle>Register New Driver</DialogTitle>
          <DialogDescription>
            Enter account and driver details to register a new driver.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="details">Driver Details</TabsTrigger>
                <TabsTrigger value="license">License Info</TabsTrigger>
              </TabsList>

              {/* Account Tab */}
              <TabsContent value="account" className="space-y-6">
                {/* User Account Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="middleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Middle Name</FormLabel>
                          <FormControl>
                            <Input placeholder="M." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input placeholder="••••••••" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Card className="border rounded-md">
                    <CardHeader>
                      <CardTitle>Profile Picture</CardTitle>
                      <CardDescription>Upload a profile picture for the driver</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                      {/* Avatar Preview */}
                      <div className="relative w-32 h-32 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Profile preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center text-center p-2">
                            <Icon icon="mdi:account" className="h-16 w-16 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>

                      {/* Avatar Controls */}
                      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAvatarClick}
                          className="flex-1"
                        >
                          <Icon icon="mdi:upload" className="mr-2 h-4 w-4" />
                          {avatarPreview ? "Change Picture" : "Upload Picture"}
                        </Button>

                        {avatarPreview && (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                              setAvatarPreview(null);
                              form.setValue("avatar", null);
                              if (avatarFileInputRef.current) {
                                avatarFileInputRef.current.value = '';
                              }
                            }}
                            className="flex-1"
                          >
                            <Icon icon="mdi:delete" className="mr-2 h-4 w-4" />
                            Remove Picture
                          </Button>
                        )}

                        <input
                          ref={avatarFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                          aria-hidden="true"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Driver Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <div className="space-y-4">
                  <Card className="border rounded-md">
                    <CardHeader>
                      <CardTitle>Address Information</CardTitle>
                      <CardDescription>Please provide the driver's complete address</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Region */}
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={loadingRegions}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {loadingRegions ? (
                                  <SelectItem value="loading" disabled>Loading regions...</SelectItem>
                                ) : regions.map(region => (
                                  <SelectItem key={region.code} value={region.code}>
                                    {region.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Province */}
                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Province *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={loadingProvinces || !form.watch('region')}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a province" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {loadingProvinces ? (
                                  <SelectItem value="loading" disabled>Loading provinces...</SelectItem>
                                ) : !form.watch('region') ? (
                                  <SelectItem value="select-region" disabled>Select a region first</SelectItem>
                                ) : provinces.length === 0 ? (
                                  <SelectItem value="no-provinces" disabled>No provinces available</SelectItem>
                                ) : provinces.map(province => (
                                  <SelectItem key={province.code} value={province.code}>
                                    {province.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* City/Municipality */}
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City/Municipality *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={loadingCities || !form.watch('province')}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a city/municipality" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {loadingCities ? (
                                  <SelectItem value="loading" disabled>Loading cities...</SelectItem>
                                ) : !form.watch('province') ? (
                                  <SelectItem value="select-province" disabled>Select a province first</SelectItem>
                                ) : cities.length === 0 ? (
                                  <SelectItem value="no-cities" disabled>No cities available</SelectItem>
                                ) : cities.map(city => (
                                  <SelectItem key={city.code} value={city.code}>
                                    {city.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Barangay */}
                      <FormField
                        control={form.control}
                        name="barangay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Barangay *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={loadingBarangays || !form.watch('city')}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a barangay" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {loadingBarangays ? (
                                  <SelectItem value="loading" disabled>Loading barangays...</SelectItem>
                                ) : !form.watch('city') ? (
                                  <SelectItem value="select-city" disabled>Select a city first</SelectItem>
                                ) : barangays.length === 0 ? (
                                  <SelectItem value="no-barangays" disabled>No barangays available</SelectItem>
                                ) : barangays.map(barangay => (
                                  <SelectItem key={barangay.code} value={barangay.code}>
                                    {barangay.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Street Address */}
                      <FormField
                        control={form.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 123 Main Street, Unit 456"
                                value={field.value || ''}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Postal Code */}
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 1200"
                                value={field.value || ''}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Phone Number - Moved inside the Address Information card */}
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="(123) 456-7890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* License Tab */}
              <TabsContent value="license" className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="driver_license_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="DL12345678" {...field} />
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
                        <FormLabel>License Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., CDL-A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Card className="border rounded-md">
                    <CardHeader>
                      <CardTitle>License Photo</CardTitle>
                      <CardDescription>Upload a photo of the driver's license</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                      {/* License Preview */}
                      <div className="relative w-full max-w-md aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
                        {licensePreview ? (
                          <img
                            src={licensePreview}
                            alt="License preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center text-center p-2">
                            <Icon icon="mdi:card-account-details" className="h-16 w-16 text-muted-foreground/50 mb-2" />
                            <span className="text-muted-foreground">No license photo selected</span>
                          </div>
                        )}
                      </div>

                      {/* License Controls */}
                      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleLicenseClick}
                          className="flex-1"
                        >
                          <Icon icon="mdi:upload" className="mr-2 h-4 w-4" />
                          {licensePreview ? "Change Photo" : "Upload Photo"}
                        </Button>

                        {licensePreview && (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                              setLicensePreview(null);
                              form.setValue("driver_license_picture", null);
                              if (licenseFileInputRef.current) {
                                licenseFileInputRef.current.value = '';
                              }
                            }}
                            className="flex-1"
                          >
                            <Icon icon="mdi:delete" className="mr-2 h-4 w-4" />
                            Remove Photo
                          </Button>
                        )}

                        <input
                          ref={licenseFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLicenseChange}
                          className="hidden"
                          aria-hidden="true"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
                    Registering...
                  </div>
                ) : (
                  'Register Driver'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDriver