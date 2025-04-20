'use client'
import { useState, useEffect } from "react";
import { Icon } from '@iconify/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Separator } from "../../ui/separator";
import { getTruckById } from "../../../services/trucks";

const ReadTruck = ({ isOpen, onClose, truckId }) => {
  const [truck, setTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (isOpen && truckId) {
      loadTruckData();
    }
  }, [isOpen, truckId]);

  const loadTruckData = async () => {
    setLoading(true);
    try {
      const truckData = await getTruckById(truckId);
      setTruck(truckData);
    } catch (error) {
      console.error("Error loading truck data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {loading ? "Loading Truck Details..." : `Truck: ${truck?.plate_number || "Unknown"}`}
          </DialogTitle>
          <DialogDescription>
            View all details about this truck in your fleet.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : truck ? (
          <div className="mt-2">
            <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="engine">Engine</TabsTrigger>
                <TabsTrigger value="tires">Tires</TabsTrigger>
                <TabsTrigger value="image">Image</TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>General Information</CardTitle>
                    <CardDescription>Basic details about the truck</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <InfoItem label="Plate Number" value={truck.plate_number} />
                    <InfoItem label="Model" value={truck.truck_model} />
                    <InfoItem label="Type" value={truck.truck_type} />
                    <InfoItem label="Color" value={truck.truck_color} />
                    <InfoItem label="Manufacturer" value={truck.truck_manufacturer} />
                    <InfoItem
                      label="Manufacturing Date"
                      value={truck.truck_date ? new Date(truck.truck_date).toLocaleDateString() : "N/A"}
                    />
                    <InfoItem
                      label="Added to Fleet"
                      value={truck.created ? new Date(truck.created).toLocaleDateString() : "N/A"}
                    />
                    <InfoItem
                      label="Last Updated"
                      value={truck.updated ? new Date(truck.updated).toLocaleDateString() : "N/A"}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Engine & Fuel Tab */}
              <TabsContent value="engine" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Engine Specifications</CardTitle>
                    <CardDescription>Engine and fuel details</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <InfoItem label="Engine Power" value={truck.truck_engine_power} />
                    <InfoItem label="Engine Capacity" value={truck.truck_engine_capacity} />
                    <InfoItem label="Fuel Type" value={truck.truck_fuel_type} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tires Tab */}
              <TabsContent value="tires" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tire Information</CardTitle>
                    <CardDescription>Details about truck tires</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <InfoItem label="Tire Brand" value={truck.tire_brand} />
                    <InfoItem label="Tire Sizes" value={truck.tire_sizes} />
                    <InfoItem label="Tire PSI" value={truck.tire_psi} />
                    <InfoItem label="Tire Lifespan" value={truck.tire_lifespan} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Image Tab */}
              <TabsContent value="image" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Truck Image</CardTitle>
                    <CardDescription>Visual representation of the truck</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    {truck.truck_image ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${truck.collectionId}/${truck.id}/${truck.truck_image}`}
                        alt={`Truck ${truck.plate_number}`}
                        className="max-h-[400px] rounded-md object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-md p-4 w-full">
                        <Icon icon="mdi:truck-image" className="h-16 w-16 text-muted-foreground/50 mb-2" />
                        <span className="text-muted-foreground">No image available</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground">Truck not found or an error occurred</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const InfoItem = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium">{value || "N/A"}</p>
    <Separator className="mt-2" />
  </div>
);

export default ReadTruck;