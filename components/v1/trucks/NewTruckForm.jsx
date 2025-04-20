'use client'
import React, { useState, useRef } from 'react'
import PocketBase from 'pocketbase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Icon } from '@iconify/react'
import { Input } from '@/components/ui/input'

// Initialize PocketBase
const pb = new PocketBase("https://dbfleet.07130116.xyz")

const NewTruck = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const fileInputRef = useRef(null)

  // Form state
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    bodyColor: '',
    productionDate: '',
    countryOfManufacturer: '',
    enginePower: '',
    engineCapacity: '',
    fuelType: '',
    gearboxType: '',
    steeringSystem: '',
    oilCapacity: '',
    fuelTankCapacity: '',
    tireBrand: '',
    commonTireSizes: '',
    recommendedPsi: '',
    expectedTireLifespan: '',
    image: null
  })

  const handleChange = (e) => {
    const { name, value, type } = e.target

    if (type === 'file') {
      setFormData({
        ...formData,
        [name]: e.target.files[0]
      })
    } else if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value ? parseFloat(value) : ''
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const handleImageClick = () => {
    fileInputRef.current.click()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')
    setIsSuccess(false)

    try {
      // Step 1: Create the fleet_details record
      const fleetDetailsData = {
        plate_number: formData.plateNumber,
        model: formData.model,
        body_color: formData.bodyColor,
        production_date: formData.productionDate || null,
        country_of_manufacturer: formData.countryOfManufacturer || '',
        engine_power: formData.enginePower || '',
        engine_capacity: formData.engineCapacity ? parseFloat(formData.engineCapacity) : null,
        fuel_type: formData.fuelType || '',
        gearbox_type: formData.gearboxType || '',
        steering_system: formData.steeringSystem || '',
        oil_capacity: formData.oilCapacity ? parseFloat(formData.oilCapacity) : null,
        fuel_tank_capacity: formData.fuelTankCapacity ? parseFloat(formData.fuelTankCapacity) : null
      }

      console.log("Creating fleet details:", fleetDetailsData);
      const fleetDetails = await pb.collection('fleet_details').create(fleetDetailsData, { requestKey: null });
      console.log('Fleet details created:', fleetDetails)

      // Step 2: Create the fleet_tires record
      const fleetTiresData = {
        tire_brand: formData.tireBrand || '',
        common_tire_sizes: formData.commonTireSizes || '',
        recommended_psi: formData.recommendedPsi || '',
        expected_tire_lifespan: formData.expectedTireLifespan || ''
      }

      console.log("Creating fleet tires:", fleetTiresData);
      const fleetTires = await pb.collection('fleet_tires').create(fleetTiresData, { requestKey: null });
      console.log('Fleet tires created:', fleetTires)

      // Step 3: Create the main fleets record with relationships
      const fleetFormData = new FormData()

      // Add the image if it exists
      if (formData.image) {
        fleetFormData.append('image', formData.image)
      }

      // Use the specific driver ID
      const driverId = 'q668gsp65ny2v7u';
      fleetFormData.append('driver', driverId);
      console.log("Using fixed driver ID:", driverId);

      fleetFormData.append('details', fleetDetails.id)
      fleetFormData.append('tires', fleetTires.id)

      console.log("Creating fleet with relations:", {
        driver: driverId,
        details: fleetDetails.id,
        tires: fleetTires.id
      });

      // Create the main fleet record
      const fleet = await pb.collection('fleets').create(fleetFormData, { requestKey: null })
      console.log('Fleet created successfully:', fleet)

      // Show success message and close the form after a short delay
      setIsSuccess(true)
      setTimeout(closeForm, 1500)
    } catch (error) {
      // Log error for debugging
      console.error('Error creating new truck:', error)

      // Enhanced error handling for PocketBase response
      let errorMsg = 'Failed to create new truck';
      if (error.response) {
        try {
          const responseData = error.response.data;
          // Add main error message if available
          if (responseData && responseData.message) {
            errorMsg += `: ${responseData.message}`;
          }
          // Add field validation errors if present
          if (responseData && responseData.data) {
            const fieldErrors = Object.entries(responseData.data)
              .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
              .join('; ');
            if (fieldErrors) {
              errorMsg += ` (${fieldErrors})`;
            }
          }
        } catch (e) {
          // Fallback if error response parsing fails
          console.error('Error parsing error response:', e);
        }
      } else {
        // Fallback for generic errors
        errorMsg += `: ${error.message}`;
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false)
    }
  }

  const closeForm = () => {
    setIsOpen(false)
    setFormData({
      plateNumber: '',
      model: '',
      bodyColor: '',
      productionDate: '',
      countryOfManufacturer: '',
      enginePower: '',
      engineCapacity: '',
      fuelType: '',
      gearboxType: '',
      steeringSystem: '',
      oilCapacity: '',
      fuelTankCapacity: '',
      tireBrand: '',
      commonTireSizes: '',
      recommendedPsi: '',
      expectedTireLifespan: '',
      image: null
    })
    setActiveTab('basic')
    setErrorMessage('')
    setIsSuccess(false)
  }

  // Check if required fields are filled
  const isFormValid = () => {
    return formData.plateNumber && formData.model
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeForm()
        } else {
          setIsOpen(true)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Icon icon="mdi:truck-plus" className="mr-2" />
          Add New Truck
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-6 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Truck</DialogTitle>
          <DialogDescription>
            Fill out the form below to add a new truck to the fleet management system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4">
          <Tabs
            defaultValue="basic"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-8">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="engine">Engine</TabsTrigger>
              <TabsTrigger value="capacity">Capacity</TabsTrigger>
              <TabsTrigger value="tires">Tires</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Truck Image
                </label>
                <div className="flex items-center gap-4">
                  <Card
                    className="w-32 h-32 flex items-center justify-center overflow-hidden bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={handleImageClick}
                  >
                    {formData.image ? (
                      <img
                        src={URL.createObjectURL(formData.image)}
                        alt="Truck preview"
                        className="w-full h-full object-fill"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Icon icon="mdi:truck-outline" className="text-gray-400 size-16" />
                        <span className="text-xs text-gray-500 mt-1">Click to upload</span>
                      </div>
                    )}
                  </Card>
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Basic Truck Details */}
              <div>
                <h3 className="font-medium mb-4">Basic Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Plate Number *
                    </label>
                    <Input
                      name="plateNumber"
                      value={formData.plateNumber}
                      onChange={handleChange}
                      placeholder="e.g., ABC-123"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Model *
                    </label>
                    <Input
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      placeholder="e.g., Isuzu NQR"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Body Color
                    </label>
                    <Input
                      name="bodyColor"
                      value={formData.bodyColor}
                      onChange={handleChange}
                      placeholder="e.g., White"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Production Date
                    </label>
                    <Input
                      type="date"
                      name="productionDate"
                      value={formData.productionDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Engine Tab */}
            <TabsContent value="engine" className="space-y-6">
              <div>
                <h3 className="font-medium mb-4">Engine & Performance Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Country of Manufacturer
                    </label>
                    <Input
                      name="countryOfManufacturer"
                      value={formData.countryOfManufacturer}
                      onChange={handleChange}
                      placeholder="e.g., Japan"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Engine Power
                    </label>
                    <Input
                      name="enginePower"
                      value={formData.enginePower}
                      onChange={handleChange}
                      placeholder="e.g., 150 HP"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Engine Capacity (cc)
                    </label>
                    <Input
                      type="number"
                      name="engineCapacity"
                      value={formData.engineCapacity}
                      onChange={handleChange}
                      placeholder="e.g., 5200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Fuel Type
                    </label>
                    <Input
                      name="fuelType"
                      value={formData.fuelType}
                      onChange={handleChange}
                      placeholder="e.g., Diesel"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Gearbox Type
                    </label>
                    <Input
                      name="gearboxType"
                      value={formData.gearboxType}
                      onChange={handleChange}
                      placeholder="e.g., Manual 6-speed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Steering System
                    </label>
                    <Input
                      name="steeringSystem"
                      value={formData.steeringSystem}
                      onChange={handleChange}
                      placeholder="e.g., Power Steering"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Capacity Tab */}
            <TabsContent value="capacity" className="space-y-6">
              <div>
                <h3 className="font-medium mb-4">Capacity Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Oil Capacity (liters)
                    </label>
                    <Input
                      type="number"
                      name="oilCapacity"
                      value={formData.oilCapacity}
                      onChange={handleChange}
                      placeholder="e.g., 15"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Fuel Tank Capacity (liters)
                    </label>
                    <Input
                      type="number"
                      name="fuelTankCapacity"
                      value={formData.fuelTankCapacity}
                      onChange={handleChange}
                      placeholder="e.g., 200"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tires Tab */}
            <TabsContent value="tires" className="space-y-6">
              <div>
                <h3 className="font-medium mb-4">Tire Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Tire Brand
                    </label>
                    <Input
                      name="tireBrand"
                      value={formData.tireBrand}
                      onChange={handleChange}
                      placeholder="e.g., Bridgestone"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Common Tire Sizes
                    </label>
                    <Input
                      name="commonTireSizes"
                      value={formData.commonTireSizes}
                      onChange={handleChange}
                      placeholder="e.g., 11R22.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Recommended PSI
                    </label>
                    <Input
                      name="recommendedPsi"
                      value={formData.recommendedPsi}
                      onChange={handleChange}
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Expected Tire Lifespan
                    </label>
                    <Input
                      name="expectedTireLifespan"
                      value={formData.expectedTireLifespan}
                      onChange={handleChange}
                      placeholder="e.g., 50,000 miles"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {errorMessage && (
            <div className="text-red-500 text-sm mt-2">
              {errorMessage}
            </div>
          )}

          {isSuccess && (
            <div className="text-green-500 text-sm mt-2">
              Truck created successfully!
            </div>
          )}

          <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
            <Button onClick={closeForm} variant="outline" type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? (
                <>
                  <Icon icon="mdi:loading" className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Truck'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default NewTruck