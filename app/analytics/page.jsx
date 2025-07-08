"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

const AnalyticsHub = () => {
  const router = useRouter();

  const analyticsModules = [
    {
      title: "Fuel Analytics",
      description: "Monitor fuel consumption, costs, efficiency, and forecasting",
      icon: "mdi:gas-station",
      color: "bg-blue-500",
      route: "/analytics/fuel",
      features: [
        "Fuel consumption tracking",
        "Cost analysis and forecasting",
        "MPG analytics by vehicle",
        "Fuel price predictions",
        "Efficiency comparisons"
      ]
    },
    {
      title: "Maintenance Analytics",
      description: "Track maintenance costs, schedules, and performance metrics",
      icon: "mdi:wrench",
      color: "bg-orange-500",
      route: "/analytics/maintenance",
      features: [
        "Maintenance cost tracking",
        "Issue-prone vehicle identification",
        "Completion rate analysis",
        "Preventive maintenance scheduling",
        "Labor cost optimization"
      ]
    },
    {
      title: "Trip Analytics",
      description: "Analyze trip performance, delivery metrics, and route optimization",
      icon: "mdi:map-marker-path",
      color: "bg-green-500",
      route: "/analytics/trips",
      features: [
        "Trip completion rates",
        "On-time delivery tracking",
        "Distance and duration analysis",
        "Driver performance metrics",
        "Route efficiency insights"
      ]
    },
    {
      title: "Vehicle Usage Analytics",
      description: "Monitor vehicle utilization, performance, and retirement planning",
      icon: "mdi:truck",
      color: "bg-purple-500",
      route: "/analytics/usage",
      features: [
        "Vehicle utilization rates",
        "Usage score calculations",
        "Retirement planning analytics",
        "Age vs performance correlation",
        "Upgrade recommendations"
      ]
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Choose an analytics module to view detailed insights and reports
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {analyticsModules.map((module, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${module.color}`}>
                  <Icon icon={module.icon} className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {module.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Key Features:</h4>
                <ul className="space-y-1">
                  {module.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-center">
                      <Icon icon="mdi:check-circle" className="h-4 w-4 mr-2 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                onClick={() => router.push(module.route)}
                className="w-full"
                variant="outline"
              >
                View {module.title}
                <Icon icon="mdi:arrow-right" className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsHub;
