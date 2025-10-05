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
import { Checkbox } from '@/components/ui/checkbox'
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
  accountType: z.enum(["email", "phone"]).default("email"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
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
  driver_license_number: z.string().min(1, "License number is required"),
  driver_license_code: z.array(z.string()).optional(),
  driver_license_picture: z.any().optional(),
  license_expiration_date: z.string().regex(/^\d{4}\/(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/, "Invalid date format. Use YYYY/MM/DD").optional(),
  user_id: z.string().optional(),
}).refine((data) => {
  // Validate that email is provided if accountType is "email"
  if (data.accountType === "email") {
    return data.email && z.string().email().safeParse(data.email).success;
  }
  // Validate that phone is provided if accountType is "phone"
  if (data.accountType === "phone") {
    return data.phone && data.phone.length > 0;
  }
  return true;
}, {
  message: "Please provide either a valid email or phone number",
  path: ["email"], // This will show the error on the email field
});

// Default form values
const defaultFormValues = {
  accountType: "email",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: "driver",
  avatar: null,

  region: "",
  province: "",
  city: "",
  barangay: "",
  postalCode: "",
  streetAddress: "",
  driver_license_number: "",
  driver_license_code: [],
  driver_license_picture: null,
  license_expiration_date: "",
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
  const [passwordSuffix, setPasswordSuffix] = useState('');
  const [isPasswordManuallySet, setIsPasswordManuallySet] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

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

  // --- Helper Functions --- //

  const generateRandomDigits = (length) => {
    let result = '';
    const characters = '0123456789';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const initializeAndResetFormStates = () => {
    const newSuffix = generateRandomDigits(8);
    setPasswordSuffix(newSuffix);
    setIsPasswordManuallySet(false);
    setShowPassword(true); // Reset password visibility to true (visible)
    form.reset(defaultFormValues); // Resets to { ..., password: "", ... }
    // Explicitly set initial password with only the suffix if lastName is empty
    form.setValue('password', newSuffix, { shouldValidate: true, shouldDirty: false });

    setAvatarPreview(null);
    setLicensePreview(null);
    // Reset address related states if they are not reset by form.reset
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    form.setValue("license_expiration_date", ""); // Ensure this is reset if not in defaultFormValues
    setActiveTab('account');
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
    if (licenseFileInputRef.current) {
      licenseFileInputRef.current.value = '';
    }
  };

  // --- API Data Fetching --- //

  // Fetch regions on component mount
  useEffect(() => {
    const fetchRegions = async () => {
      setLoadingRegions(true)
      try {
        const response = await fetch('https://psgc.cloud/api/regions', {
          requestKey: null // Add requestKey to avoid auto-cancellation
        })
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
        const response = await fetch(`https://psgc.cloud/api/regions/${regionCode}/provinces`, {
          requestKey: null // Add requestKey to avoid auto-cancellation
        })
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
        const response = await fetch(`https://psgc.cloud/api/provinces/${provinceCode}/cities-municipalities`, {
          requestKey: null // Add requestKey to avoid auto-cancellation
        })
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
        const response = await fetch(`https://psgc.cloud/api/cities-municipalities/${cityCode}/barangays`, {
          requestKey: null // Add requestKey to avoid auto-cancellation
        })
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

  // Effect to initialize and reset form states when dialog opens
  useEffect(() => {
    if (isOpen) {
      initializeAndResetFormStates();
    }
  }, [isOpen]);

  // Effect for dynamic password generation
  useEffect(() => {
    if (isOpen && !isPasswordManuallySet && passwordSuffix) {
      const lastName = form.watch('lastName');
      const newPassword = `${lastName || ''}${passwordSuffix}`;
      form.setValue('password', newPassword, { shouldValidate: true, shouldDirty: false });
    }
  }, [form.watch('lastName'), passwordSuffix, isPasswordManuallySet, isOpen, form]);


  // --- Helper Functions --- // (Original location of generateFullName, formatCompleteAddress, resetForm, closeDialog etc.)
  // Note: resetForm is now simplified as its logic is moved to initializeAndResetFormStates

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
    initializeAndResetFormStates(); // Call the new comprehensive reset function
  }

  // Closes the dialog and resets the form
  const closeDialog = () => {
    setIsOpen(false)
    resetForm()
  }

  // Image handling functions
  const handleAvatarClick = () => avatarFileInputRef.current?.click()
  const handleLicenseClick = () => licenseFileInputRef.current?.click()

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      form.setValue("avatar", file, { shouldValidate: true })
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

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

      // Add phone based on account type
      if (data.accountType === "phone") {
        driverDetailsData.append("phone", data.phone || "")
      } else {
        driverDetailsData.append("phone", "")
      }

      driverDetailsData.append("driver_license_number", data.driver_license_number)
      // Join the array of license codes into a comma-separated string
      driverDetailsData.append("driver_license_code", Array.isArray(data.driver_license_code) ? data.driver_license_code.join(", ") : "")
      if (data.license_expiration_date) {
        const formattedDate = data.license_expiration_date.replace(/\//g, '-');
        driverDetailsData.append("license_expiration_date", formattedDate)
      }

      // Add the current authenticated user's ID
      if (pb.authStore.record) {
        driverDetailsData.append("user_id", pb.authStore.record.id)
      }

      if (data.driver_license_picture) {
        driverDetailsData.append("driver_license_picture", data.driver_license_picture)
      }

      const driverDetails = await pb.collection('driver_details').create(driverDetailsData, {
        requestKey: null // Add requestKey to avoid auto-cancellation
      })

      // Generate the full name for the username field
      const fullName = generateFullName(data.firstName, data.middleName, data.lastName);

      // Now create the user record with reference to driver details
      const userData = new FormData()
      userData.append("username", fullName)

      // Add email or phone based on account type
      if (data.accountType === "email") {
        userData.append("email", data.email || "")
      } else {
        userData.append("email", "") // Empty email if using phone
      }

      userData.append("password", data.password)
      userData.append("passwordConfirm", data.password)
      userData.append("role", "driver")
      userData.append("driver_details_id", driverDetails.id)
      userData.append("emailVisibility", true)

      if (pb.authStore.record) {
        userData.append("user_id", pb.authStore.record.id)
      }

      if (data.avatar) {
        userData.append("avatar", data.avatar)
      }

      // Create user with driver role
      await pb.collection('users').create(userData, {
        requestKey: null // Add requestKey to avoid auto-cancellation
      })

      toast.success("Driver registered successfully!")
      closeDialog()
    } catch (error) {
      console.error('Error creating driver:', error)
      const errorMessage = error?.response?.message || 'Failed to register driver. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // --- Render Logic --- //
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) { // If dialog is closing
        closeDialog(); // Ensure form is reset
      }
    }}>
      <DialogTrigger asChild>
        <Button>
          <Icon icon="mdi:account-plus" className="mr-2" />
          Driver Registration
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
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
              <TabsContent value="account" className="space-y-4">
                {/* User Account Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Account Type Selection */}
                <div className="space-y-4">
                  <FormLabel>Account Creation Method</FormLabel>
                  <FormField
                    control={form.control}
                    name="accountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex gap-4">
                            <Button
                              type="button"
                              variant={field.value === "email" ? "default" : "outline"}
                              className="flex-1"
                              onClick={() => field.onChange("email")}
                            >
                              <Icon icon="mdi:email" className="mr-2" />
                              Email
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "phone" ? "default" : "outline"}
                              className="flex-1"
                              onClick={() => field.onChange("phone")}
                            >
                              <Icon icon="mdi:phone" className="mr-2" />
                              Phone Number
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Conditional Email or Phone Field */}
                {form.watch("accountType") === "email" ? (
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
                ) : (
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="+63 912 345 6789" type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setIsPasswordManuallySet(true);
                            }}
                            className="pr-10" // Add padding for the button
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            <Icon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Avatar Upload */}
                <div className="space-y-4">
                  <FormLabel>Profile Picture</FormLabel>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon icon="mdi:account" className="h-12 w-12 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAvatarClick}
                      >
                        {avatarPreview ? "Change Picture" : "Upload Picture"}
                      </Button>
                      {avatarPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAvatarPreview(null);
                            form.setValue("avatar", null);
                            if (avatarFileInputRef.current) {
                              avatarFileInputRef.current.value = '';
                            }
                          }}
                        >
                          Remove Picture
                        </Button>
                      )}
                    </div>
                  </div>
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    aria-hidden="true"
                  />
                </div>
              </TabsContent>

              {/* Driver Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Address Information</h3>

                  {/* Region */}
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
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
                        <FormLabel>Province</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
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
                        <FormLabel>City/Municipality</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
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
                        <FormLabel>Barangay</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Street Address */}
                    <FormField
                      control={form.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123 Main Street"
                              value={field.value || ''}
                              onChange={field.onChange}
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
                              placeholder="1200"
                              value={field.value || ''}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* License Tab */}
              <TabsContent value="license" className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="driver_license_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Number</FormLabel>
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
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">License Codes</FormLabel>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {["A / A1", "B / B1 / B2", "C", "D", "BE", "CE"].map((code) => (
                              <FormField
                                key={code}
                                control={form.control}
                                name="driver_license_code"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={code}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(code)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, code])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== code
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal">
                                        {code}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* License Expiration Date */}
                  <FormField
                    control={form.control}
                    name="license_expiration_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Expiration Date</FormLabel>
                        <FormControl>
                          <Input placeholder="YYYY/MM/DD" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* License Photo */}
                  <div className="space-y-4">
                    <FormLabel>License Photo</FormLabel>
                    <div className="bg-muted p-4 rounded-md">
                      <div className="flex flex-col items-center gap-4">
                        {licensePreview ? (
                          <div className="relative w-full max-w-md rounded-md overflow-hidden">
                            <img
                              src={licensePreview}
                              alt="License"
                              className="w-full h-auto max-h-[200px] object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-md w-full">
                            <Icon icon="mdi:license" className="h-10 w-10 text-muted-foreground/50 mb-2" />
                            <span className="text-sm text-muted-foreground">No license photo selected</span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleLicenseClick}
                          >
                            {licensePreview ? "Change Photo" : "Upload Photo"}
                          </Button>
                          {licensePreview && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setLicensePreview(null);
                                form.setValue("driver_license_picture", null);
                                if (licenseFileInputRef.current) {
                                  licenseFileInputRef.current.value = '';
                                }
                              }}
                            >
                              Remove Photo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <input
                      ref={licenseFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLicenseChange}
                      className="hidden"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button onClick={closeDialog} type="button" variant="outline">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icon icon="mdi:loading" className="mr-2 animate-spin" />
                    Registering...
                  </>
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