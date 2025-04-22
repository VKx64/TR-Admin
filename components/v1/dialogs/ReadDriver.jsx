'use client'
import { useState, useEffect } from "react";
import { Icon } from '@iconify/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Separator } from "../../ui/separator";
import pb from "@/services/pocketbase";

const ReadDriver = ({ isOpen, onClose, driverId }) => {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    if (isOpen && driverId) {
      loadDriverData();
    }
  }, [isOpen, driverId]);

  const loadDriverData = async () => {
    setLoading(true);
    try {
      // Fetch the driver with expanded driver_details relation
      const driverData = await pb.collection('users').getOne(driverId, {
        expand: 'driver_details_id',
      });
      setDriver(driverData);
    } catch (error) {
      console.error("Error loading driver data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Extract first and last name from username (which stores the full name)
  const extractNames = (username) => {
    if (!username) return { firstName: 'N/A', lastName: 'N/A' };

    const nameParts = username.trim().split(' ');
    if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: 'N/A' };
    } else {
      return {
        firstName: nameParts[0],
        lastName: nameParts[nameParts.length - 1],
        middleName: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : ''
      };
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {loading ? "Loading Driver Details..." : `Driver: ${driver?.username || "Unknown"}`}
          </DialogTitle>
          <DialogDescription>
            View all details about this driver in your fleet.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : driver ? (
          <div className="mt-2">
            <Tabs defaultValue="personal" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="contact">Contact & Address</TabsTrigger>
                <TabsTrigger value="license">License</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Driver's personal details</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 flex justify-center mb-4">
                      {driver.avatar ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/users/${driver.id}/${driver.avatar}`}
                          alt={`${driver.username}'s avatar`}
                          className="w-32 h-32 rounded-full object-cover border-2 border-primary/20"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                          <Icon icon="mdi:account" className="w-16 h-16 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    <InfoItem label="First Name" value={extractNames(driver.username).firstName} />
                    <InfoItem label="Last Name" value={extractNames(driver.username).lastName} />
                    {extractNames(driver.username).middleName && (
                      <InfoItem label="Middle Name" value={extractNames(driver.username).middleName} />
                    )}
                    <InfoItem label="Email" value={driver.email} />
                    <InfoItem label="Role" value={driver.role} />
                    <InfoItem
                      label="Email Visibility"
                      value={driver.emailVisibility ? "Public" : "Private"}
                    />
                    <InfoItem
                      label="Verified"
                      value={driver.verified ? "Yes" : "No"}
                    />
                    <InfoItem
                      label="Account Created"
                      value={driver.created ? new Date(driver.created).toLocaleDateString() : "N/A"}
                    />
                    <InfoItem
                      label="Last Updated"
                      value={driver.updated ? new Date(driver.updated).toLocaleDateString() : "N/A"}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contact & Address Tab */}
              <TabsContent value="contact" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>Phone and address details</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4">
                    <InfoItem
                      label="Phone Number"
                      value={driver.expand?.driver_details_id?.phone || "N/A"}
                    />
                    <InfoItem
                      label="Full Address"
                      value={driver.expand?.driver_details_id?.address || "N/A"}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* License Tab */}
              <TabsContent value="license" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Driver's License</CardTitle>
                    <CardDescription>Driver's license information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem
                        label="License Number"
                        value={driver.expand?.driver_details_id?.driver_license_number || "N/A"}
                      />
                      <InfoItem
                        label="License Code"
                        value={driver.expand?.driver_details_id?.driver_license_code || "N/A"}
                      />
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">License Image</p>
                      {driver.expand?.driver_details_id?.driver_license_picture ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/driver_details/${driver.expand.driver_details_id.id}/${driver.expand.driver_details_id.driver_license_picture}`}
                          alt="Driver License"
                          className="max-h-[300px] w-auto rounded-md object-contain border border-border"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-48 bg-muted rounded-md p-4">
                          <Icon icon="mdi:card-account-details" className="h-16 w-16 text-muted-foreground/50 mb-2" />
                          <span className="text-muted-foreground">No license image available</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground">Driver not found or an error occurred</p>
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

export default ReadDriver;