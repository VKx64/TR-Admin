'use client'
import { useState, useEffect } from "react";
import { Icon } from '@iconify/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Separator } from "../../ui/separator";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import pb from "@/services/pocketbase";

const ReadMaintenance = ({ isOpen, onClose, maintenanceTypeId }) => {
  const [maintenanceType, setMaintenanceType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (isOpen && maintenanceTypeId) {
      loadMaintenanceTypeData();
    }
  }, [isOpen, maintenanceTypeId]);

  const loadMaintenanceTypeData = async () => {
    setLoading(true);
    try {
      const record = await pb.collection('maintenance_type').getOne(maintenanceTypeId);
      setMaintenanceType(record);
    } catch (error) {
      console.error("Error loading maintenance type data:", error);
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
            {loading ? "Loading Maintenance Type..." : `Maintenance Type: ${maintenanceType?.name || "Unknown"}`}
          </DialogTitle>
          <DialogDescription>
            View details about this maintenance type.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : maintenanceType ? (
          <div className="mt-2">
            <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="preview">Form Preview</TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>General Information</CardTitle>
                    <CardDescription>Basic details about the maintenance type</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <InfoItem label="Name" value={maintenanceType.name} />
                    <InfoItem label="Description" value={maintenanceType.description} />
                    <InfoItem label="Recurrence Interval (km)" value={
                      maintenanceType.recurrence_interval_km
                        ? `${maintenanceType.recurrence_interval_km} km`
                        : "Not specified"
                    } />
                    <InfoItem label="Recurrence Interval (days)" value={
                      maintenanceType.recurrence_interval_days
                        ? `${maintenanceType.recurrence_interval_days} days`
                        : "Not specified"
                    } />
                    <InfoItem
                      label="Created On"
                      value={maintenanceType.created ? new Date(maintenanceType.created).toLocaleDateString() : "N/A"}
                    />
                    <InfoItem
                      label="Last Updated"
                      value={maintenanceType.updated ? new Date(maintenanceType.updated).toLocaleDateString() : "N/A"}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Form Preview Tab with actual form appearance */}
              <TabsContent value="preview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Maintenance Form</CardTitle>
                    <CardDescription>
                      This is the form that will be used when completing this maintenance task
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {maintenanceType.form_schema && maintenanceType.form_schema.length > 0 ? (
                      <div className="space-y-6">
                        {/* Display form fields with actual input elements */}
                        {maintenanceType.form_schema.map((field, index) => (
                          <div key={`field-${index}`} className="space-y-2">
                            <Label htmlFor={`field-${field.id}`} className="font-medium">
                              {field.label}
                            </Label>
                            <Input
                              id={`field-${field.id}`}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              disabled
                              className="bg-background border"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <Icon icon="mdi:form-textbox" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No Form Fields Defined</h3>
                        <p>This maintenance type doesn't have any form fields configured.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground">Maintenance type not found or an error occurred</p>
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

export default ReadMaintenance;