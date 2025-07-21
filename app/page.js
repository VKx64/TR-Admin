"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area, AreaChart } from 'recharts';
import { Icon } from '@iconify/react';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import pb from '@/services/pocketbase';

const Dashboard = () => {
  const router = useRouter();

  // Redirect to analytics hub
  useEffect(() => {
    router.push('/analytics');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="space-y-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Redirecting to Analytics Dashboard...</p>
      </div>
    </div>
  );
};

const OriginalDashboard = () => {  const [data, setData] = useState({
    fleet: { total: 0, assigned: 0, utilization: 0 },
    maintenance: { totalCost: 0, pendingRequests: 0, completionRate: 0, avgDays: 0, laborCost: 0 },
    maintenanceAnalytics: {
      vehiclesInMaintenance: [],
      issueProneVehicles: [],
    },
    fuel: { totalCost: 0, totalLiters: 0, avgMPG: 0, costPerMile: 0 },
    financial: { totalOperating: 0, costPerTruck: 0 },
    charts: {
      maintenanceTrend: [],
      fuelTrend: [],
      costBreakdown: []
    },
    fuelLogs: {
      recentEntries: []
    },
    costAnalytics: {
      breakdown: {
        fuel: 0,
        maintenance: 0,
        labor: 0,
        parts: 0,
        other: 0
      },
      budget: {
        monthly: 50000, // Default monthly budget
        variance: 0,
        percentUsed: 0
      },
      efficiency: {
        costPerKm: 0,
        costPerHour: 0,
        maintenanceCostPerTruck: 0
      }
    },
    forecasting: {
      fuelConsumption: {
        predictedToday: 0,
        predictedThisMonth: 0,
        predictedThisYear: 0,
        predictedNextYear: 0,
        trend: 'increasing', // 'increasing', 'decreasing', 'stable'
        confidence: 0,
        dailyAverage: 0
      },
      fuelPrice: {
        predictedToday: 0,
        predictedThisMonth: 0,
        predictedThisYear: 0,
        predictedNextYear: 0,
        trend: 'increasing',
        confidence: 0,
        currentAvgPrice: 0
      },
      costProjection: {
        today: 0,
        thisMonth: 0,
        thisYear: 0,
        nextYear: 0
      },
      perTruckData: {}
    },
    usageAnalytics: {
      highUsageVehicles: [],
      lowUsageVehicles: [],
      driverUsage: [],
      averageUsageScore: 0
    },
    mpgAnalytics: {
      byVehicleType: [],
      trends: [],
      topPerformers: [],
      poorPerformers: []
    },
    retirementAnalytics: {
      upcomingRetirements: [],
      upgradeCandidates: [],
      retirementTimeline: [],
      costProjections: {
        replacementCosts: [],
        savingsOpportunities: []
      },
      ageDistribution: [],
      maintenanceVsAge: [],
      recommendations: []
    },
    tripAnalytics: {
      totalTrips: 0,
      completedTrips: 0,
      ongoingTrips: 0,
      totalDistance: 0,
      totalDuration: 0,
      avgTripDuration: 0,
      avgDistance: 0,
      onTimeDeliveryRate: 0,
      recentTrips: [],
      tripsByDriver: [],
      tripsByVehicle: [],
      distanceByVehicleType: [],
      deliveryPerformance: {
        onTime: 0,
        early: 0,
        late: 0
      }
    }
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [usageThreshold, setUsageThreshold] = useState('medium'); // low, medium, high
  const [selectedTruck, setSelectedTruck] = useState('all'); // New state for truck selection

  // Usage threshold configurations
  const thresholdConfigs = {
    low: { high: 50, low: 20 },    // More relaxed thresholds
    medium: { high: 70, low: 30 }, // Balanced thresholds
    high: { high: 90, low: 50 }    // Strict thresholds
  };

  // Get current month date range
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching analytics data...');

      // First, let's fetch small samples to check field structure
      const sampleMaintenance = await pb.collection('maintenance_records').getList(1, 1, { requestKey: null });
      const sampleFuel = await pb.collection('truck_fuel').getList(1, 1, { requestKey: null });

      console.log('Sample maintenance record:', sampleMaintenance.items[0]);
      console.log('Sample fuel record:', sampleFuel.items[0]);

      // Fetch all required data collections
      const [
        trucks,
        maintenanceRecords,
        maintenanceRequests,
        maintenanceStatus,
        fuelRecords,
        truckStatistics,
        driverDetails
      ] = await Promise.all([
        pb.collection('trucks').getFullList({ requestKey: null }),
        pb.collection('maintenance_records').getFullList({ requestKey: null }),
        pb.collection('maintenance_request').getFullList({ requestKey: null }),
        pb.collection('maintenance_status').getFullList({ requestKey: null }),
        pb.collection('truck_fuel').getFullList({ requestKey: null }),
        pb.collection('truck_statistics').getFullList({ requestKey: null }),
        pb.collection('driver_details').getFullList({ requestKey: null })
      ]);      // Calculate Fleet Analytics
      const totalTrucks = trucks.length;
      const assignedTrucks = trucks.filter(truck => truck.users_id).length;
      const utilizationRate = totalTrucks > 0 ? (assignedTrucks / totalTrucks) * 100 : 0;

      // Calculate Maintenance Analytics for vehicles
      const maintenanceByTruck = maintenanceRecords.reduce((acc, record) => {
        const truckId = record.truck;
        if (truckId) {
          if (!acc[truckId]) {
            acc[truckId] = [];
          }
          acc[truckId].push(record);
        }
        return acc;
      }, {});

      const vehiclesInMaintenance = Object.keys(maintenanceByTruck).map(truckId => {
        const truckDetails = trucks.find(t => t.id === truckId);
        const truckRecords = maintenanceByTruck[truckId];
        const lastMaintenance = truckRecords.sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date))[0];

        return {
          id: truckId,
          plateNumber: truckDetails ? truckDetails.plate_number : 'Unknown Truck',
          maintenanceCount: truckRecords.length,
          lastMaintenanceDate: lastMaintenance ? lastMaintenance.completion_date : 'N/A',
        };
      });

      const ISSUE_PRONE_THRESHOLD = 3; // Example threshold
      const issueProneVehicles = vehiclesInMaintenance.filter(
        truck => truck.maintenanceCount >= ISSUE_PRONE_THRESHOLD
      );

      // Calculate Maintenance Analytics
      const totalMaintenanceCost = maintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
      const pendingRequests = maintenanceRequests.filter(req => req.status === 'pending' || req.status === 'in_progress').length;
      const completedRequests = maintenanceRequests.filter(req => req.status === 'completed').length;
      const completionRate = maintenanceRequests.length > 0 ? (completedRequests / maintenanceRequests.length) * 100 : 0;
        // Calculate average completion time
      const completedRecords = maintenanceRecords.filter(record => record.completion_date);
      const avgCompletionDays = completedRecords.length > 0 ?
        completedRecords.reduce((sum, record) => {
          const request = maintenanceRequests.find(req => req.id === record.associated_request);
          if (request && request.request_date && record.completion_date) {
            const days = Math.ceil((new Date(record.completion_date) - new Date(request.request_date)) / (1000 * 60 * 60 * 24));
            return sum + days;
          }
          return sum;
        }, 0) / completedRecords.length : 0;

      // Calculate Fuel Analytics
      const totalFuelCost = fuelRecords.reduce((sum, record) => {
        const calculatedPrice = (record.fuel_amount || 0) * (record.fuel_price || 0);
        return sum + calculatedPrice;
      }, 0);
      const totalLiters = fuelRecords.reduce((sum, record) => sum + (record.fuel_amount || 0), 0);

      // Calculate MPG and cost per mile
      let totalMPG = 0;
      let mpgCount = 0;
      let totalCostPerMile = 0;
        fuelRecords.forEach(record => {
        if (record.odometer_reading) {
          const truck = trucks.find(t => t.id === record.truck_id);
          if (truck) {
            // Simple MPG calculation - using estimated miles driven (simplified)
            const estimatedMilesDriven = 100; // Default estimated miles per fill-up
            const estimatedMPG = record.fuel_amount > 0 ? estimatedMilesDriven / record.fuel_amount : 0;
            if (estimatedMPG > 0 && estimatedMPG < 50) { // Reasonable range filter
              totalMPG += estimatedMPG;
              mpgCount++;
            }

            const calculatedCost = (record.fuel_amount || 0) * (record.fuel_price || 0);
            const costPerMile = estimatedMilesDriven > 0 ? calculatedCost / estimatedMilesDriven : 0;
            totalCostPerMile += costPerMile;
          }
        }
      });

      const avgMPG = mpgCount > 0 ? totalMPG / mpgCount : 0;
      const avgCostPerMile = fuelRecords.length > 0 ? totalCostPerMile / fuelRecords.length : 0;      // Calculate Financial Analytics
      const totalOperatingCost = totalMaintenanceCost + totalFuelCost;
      const costPerTruck = totalTrucks > 0 ? totalOperatingCost / totalTrucks : 0;

      // Get recent fuel entries (last 20 entries)
      const recentFuelEntries = fuelRecords
        .sort((a, b) => new Date(b.created) - new Date(a.created))
        .slice(0, 20)
        .map(record => {
          const truck = trucks.find(t => t.id === record.truck_id);
          return {
            id: record.id,
            truckPlate: truck?.plate_number || `Truck ${record.truck_id}`,
            fuelAmount: record.fuel_amount || 0,
            date: record.created,
            formattedDate: format(new Date(record.created), 'MMM dd, yyyy')
          };
        });

      // Fetch historical maintenance data for trend
      const historicalMaintenance = await Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const date = subMonths(currentMonth, 5 - i);
          const month = format(date, 'MMM yyyy');
          const start = startOfMonth(date);
          const end = endOfMonth(date);

          return pb.collection('maintenance_records').getFullList({
            requestKey: null,
            filter: `completion_date >= "${format(start, 'yyyy-MM-dd')}" && completion_date <= "${format(end, 'yyyy-MM-dd')}"`
          }).then(records => {
            const cost = records.reduce((sum, record) => sum + (record.cost || 0), 0);
            return { month, maintenance: cost };
          });
        })
      );

      // Fetch historical fuel data for trend
      const historicalFuel = await Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const date = subMonths(currentMonth, 5 - i);
          const month = format(date, 'MMM yyyy');
          const start = startOfMonth(date);
          const end = endOfMonth(date);

          return pb.collection('truck_fuel').getFullList({
            requestKey: null,
            filter: `created >= "${format(start, 'yyyy-MM-dd')}" && created <= "${format(end, 'yyyy-MM-dd')}"`
          }).then(records => {
            const cost = records.reduce((sum, record) => {
              const calculatedPrice = (record.fuel_amount || 0) * (record.fuel_price || 0);
              return sum + calculatedPrice;
            }, 0);
            return { month, fuel: cost };
          });
        })      );      // Debug chart data
      console.log('Chart Data Debug:', {
        historicalMaintenance,
        historicalFuel,
        recentFuelEntries
      });

      // Calculate Fuel Consumption and Price Forecasting
      const calculateForecasting = () => {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfThisYear = new Date(today.getFullYear(), 0, 1);
        const startOfNextYear = new Date(today.getFullYear() + 1, 0, 1);
        const endOfThisYear = new Date(today.getFullYear(), 11, 31);
        const endOfNextYear = new Date(today.getFullYear() + 1, 11, 31);

        // Calculate per-truck forecasting data
        const perTruckData = {};

        trucks.forEach(truck => {
          const truckFuelRecords = fuelRecords.filter(record => record.truck_id === truck.id);

          // Get historical fuel consumption for this truck
          const fuelConsumptionHistory = historicalFuel.map(item => ({
            month: item.month,
            consumption: truckFuelRecords.filter(record => {
              const recordDate = new Date(record.created);
              const [monthName, year] = item.month.split(' ');
              const itemDate = new Date(`${monthName} 1, ${year}`);
              return recordDate.getMonth() === itemDate.getMonth() &&
                     recordDate.getFullYear() === itemDate.getFullYear();
            }).reduce((sum, record) => sum + (record.fuel_amount || 0), 0)
          }));

          // Calculate average daily consumption for this truck
          const monthlyConsumption = fuelConsumptionHistory.map(item => item.consumption);
          const avgMonthlyConsumption = monthlyConsumption.length > 0 ?
            monthlyConsumption.reduce((sum, val) => sum + val, 0) / monthlyConsumption.length : 0;
          const avgDailyConsumption = avgMonthlyConsumption / 30; // Rough daily average

          // Simple linear trend calculation for consumption
          let consumptionTrend = 'stable';
          let consumptionSlope = 0;
          if (monthlyConsumption.length >= 3) {
            const recentAvg = monthlyConsumption.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
            const olderAvg = monthlyConsumption.slice(0, 3).reduce((sum, val) => sum + val, 0) / 3;
            consumptionSlope = (recentAvg - olderAvg) / 3;

            if (consumptionSlope > avgMonthlyConsumption * 0.05) {
              consumptionTrend = 'increasing';
            } else if (consumptionSlope < -avgMonthlyConsumption * 0.05) {
              consumptionTrend = 'decreasing';
            }
          }

          // Calculate consumption forecasts
          const daysInThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          const daysLeftInThisMonth = daysInThisMonth - today.getDate();
          const daysInThisYear = (endOfThisYear - startOfThisYear) / (1000 * 60 * 60 * 24);
          const daysLeftInThisYear = (endOfThisYear - today) / (1000 * 60 * 60 * 24);
          const daysInNextYear = (endOfNextYear - startOfNextYear) / (1000 * 60 * 60 * 24);

          const forecastConsumption = (days) => {
            const trendAdjustment = consumptionSlope * (days / 30);
            return Math.max(0, avgDailyConsumption * days + trendAdjustment);
          };

          // Calculate fuel price trends for this truck
          const truckFuelPriceHistory = truckFuelRecords
            .filter(record => record.fuel_price && record.fuel_price > 0)
            .sort((a, b) => new Date(a.created) - new Date(b.created));

          let avgFuelPrice = 0;
          let priceTrend = 'stable';
          let priceSlope = 0;

          if (truckFuelPriceHistory.length > 0) {
            avgFuelPrice = truckFuelPriceHistory.reduce((sum, record) => sum + record.fuel_price, 0) / truckFuelPriceHistory.length;

            // Calculate price trend using recent vs older prices
            if (truckFuelPriceHistory.length >= 6) {
              const recentPrices = truckFuelPriceHistory.slice(-Math.floor(truckFuelPriceHistory.length / 3));
              const olderPrices = truckFuelPriceHistory.slice(0, Math.floor(truckFuelPriceHistory.length / 3));

              const recentAvgPrice = recentPrices.reduce((sum, r) => sum + r.fuel_price, 0) / recentPrices.length;
              const olderAvgPrice = olderPrices.reduce((sum, r) => sum + r.fuel_price, 0) / olderPrices.length;

              priceSlope = (recentAvgPrice - olderAvgPrice) / Math.floor(truckFuelPriceHistory.length / 3);

              if (priceSlope > avgFuelPrice * 0.02) {
                priceTrend = 'increasing';
              } else if (priceSlope < -avgFuelPrice * 0.02) {
                priceTrend = 'decreasing';
              }
            }
          }

          // Forecast fuel prices
          const forecastPrice = (days) => {
            const trendAdjustment = priceSlope * (days / 30);
            return Math.max(0, avgFuelPrice + trendAdjustment);
          };

          // Calculate confidence based on data consistency
          const calculateConfidence = (values) => {
            if (values.length < 3) return 50;
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const coefficientOfVariation = variance > 0 ? Math.sqrt(variance) / mean : 0;
            return Math.max(60, Math.min(95, 90 - (coefficientOfVariation * 100)));
          };

          const consumptionConfidence = calculateConfidence(monthlyConsumption);
          const priceConfidence = truckFuelPriceHistory.length > 0 ?
            calculateConfidence(truckFuelPriceHistory.map(r => r.fuel_price)) : 50;

          perTruckData[truck.id] = {
            truckInfo: {
              id: truck.id,
              plateNumber: truck.plate_number,
              type: truck.truck_type || 'Unknown'
            },
            fuelConsumption: {
              predictedToday: Math.round(forecastConsumption(1) * 10) / 10,
              predictedThisMonth: Math.round(forecastConsumption(daysLeftInThisMonth)),
              predictedThisYear: Math.round(forecastConsumption(daysLeftInThisYear)),
              predictedNextYear: Math.round(forecastConsumption(daysInNextYear)),
              trend: consumptionTrend,
              confidence: Math.round(consumptionConfidence),
              dailyAverage: Math.round(avgDailyConsumption * 10) / 10
            },
            fuelPrice: {
              predictedToday: Math.round(forecastPrice(1) * 100) / 100,
              predictedThisMonth: Math.round(forecastPrice(daysLeftInThisMonth) * 100) / 100,
              predictedThisYear: Math.round(forecastPrice(daysLeftInThisYear) * 100) / 100,
              predictedNextYear: Math.round(forecastPrice(daysInNextYear) * 100) / 100,
              trend: priceTrend,
              confidence: Math.round(priceConfidence),
              currentAvgPrice: Math.round(avgFuelPrice * 100) / 100
            },
            costProjection: {
              today: Math.round(forecastConsumption(1) * forecastPrice(1)),
              thisMonth: Math.round(forecastConsumption(daysLeftInThisMonth) * forecastPrice(daysLeftInThisMonth)),
              thisYear: Math.round(forecastConsumption(daysLeftInThisYear) * forecastPrice(daysLeftInThisYear)),
              nextYear: Math.round(forecastConsumption(daysInNextYear) * forecastPrice(daysInNextYear))
            }
          };
        });

        // Calculate fleet-wide averages
        const allTruckData = Object.values(perTruckData);
        const fleetAvgDaily = allTruckData.length > 0 ?
          allTruckData.reduce((sum, truck) => sum + truck.fuelConsumption.dailyAverage, 0) / allTruckData.length : 0;
        const fleetAvgPrice = allTruckData.length > 0 ?
          allTruckData.reduce((sum, truck) => sum + truck.fuelPrice.currentAvgPrice, 0) / allTruckData.length : 0;
        const fleetAvgConfidence = allTruckData.length > 0 ?
          allTruckData.reduce((sum, truck) => sum + truck.fuelConsumption.confidence, 0) / allTruckData.length : 50;

        // Calculate days for fleet-wide forecasts
        const daysInThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const daysLeftInThisMonth = daysInThisMonth - today.getDate();
        const daysLeftInThisYear = (endOfThisYear - today) / (1000 * 60 * 60 * 24);
        const daysInNextYear = (endOfNextYear - startOfNextYear) / (1000 * 60 * 60 * 24);

        return {
          fuelConsumption: {
            predictedToday: Math.round(fleetAvgDaily * trucks.length * 10) / 10,
            predictedThisMonth: Math.round(fleetAvgDaily * trucks.length * daysLeftInThisMonth),
            predictedThisYear: Math.round(fleetAvgDaily * trucks.length * daysLeftInThisYear),
            predictedNextYear: Math.round(fleetAvgDaily * trucks.length * daysInNextYear),
            trend: allTruckData.length > 0 ? allTruckData[0].fuelConsumption.trend : 'stable',
            confidence: Math.round(fleetAvgConfidence),
            dailyAverage: Math.round(fleetAvgDaily * trucks.length * 10) / 10
          },
          fuelPrice: {
            predictedToday: Math.round(fleetAvgPrice * 100) / 100,
            predictedThisMonth: Math.round(fleetAvgPrice * 100) / 100,
            predictedThisYear: Math.round(fleetAvgPrice * 100) / 100,
            predictedNextYear: Math.round(fleetAvgPrice * 100) / 100,
            trend: allTruckData.length > 0 ? allTruckData[0].fuelPrice.trend : 'stable',
            confidence: Math.round(fleetAvgConfidence),
            currentAvgPrice: Math.round(fleetAvgPrice * 100) / 100
          },
          costProjection: {
            today: Math.round(fleetAvgDaily * trucks.length * fleetAvgPrice),
            thisMonth: Math.round(fleetAvgDaily * trucks.length * daysLeftInThisMonth * fleetAvgPrice),
            thisYear: Math.round(fleetAvgDaily * trucks.length * daysLeftInThisYear * fleetAvgPrice),
            nextYear: Math.round(fleetAvgDaily * trucks.length * daysInNextYear * fleetAvgPrice)
          },
          perTruckData
        };
      };

      const forecastingData = calculateForecasting();

      // Enhanced cost analytics calculations
      const calculateCostAnalytics = () => {
        // Calculate labor cost from maintenance completion_data
        let laborCost = 0;
        let partsCost = 0;
        let otherCost = 0;

        maintenanceRecords.forEach(record => {
          if (record.completion_data) {
            try {
              const completionData = typeof record.completion_data === 'string'
                ? JSON.parse(record.completion_data)
                : record.completion_data;

              laborCost += completionData.laborCost || 0;
              partsCost += completionData.partsCost || 0;
              otherCost += completionData.otherCost || 0;
            } catch (e) {
              // If parsing fails, assume basic cost structure
              const recordCost = record.cost || 0;
              laborCost += recordCost * 0.4; // Assume 40% labor
              partsCost += recordCost * 0.6; // Assume 60% parts
            }
          } else {
            // Default cost breakdown if no completion_data
            const recordCost = record.cost || 0;
            laborCost += recordCost * 0.4;
            partsCost += recordCost * 0.6;
          }
        });

        // Cost breakdown for pie chart
        const costBreakdown = [
          { category: 'Fuel', cost: totalFuelCost, percentage: 0 },
          { category: 'Labor', cost: laborCost, percentage: 0 },
          { category: 'Parts', cost: partsCost, percentage: 0 },
          { category: 'Other', cost: otherCost, percentage: 0 }
        ].filter(item => item.cost > 0); // Only include categories with actual costs

        const totalCosts = costBreakdown.reduce((sum, item) => sum + item.cost, 0);
        costBreakdown.forEach(item => {
          item.percentage = totalCosts > 0 ? Math.round((item.cost / totalCosts) * 100) : 0;
        });

        // Budget analysis
        const currentMonthCost = totalFuelCost + totalMaintenanceCost;
        const monthlyBudget = 50000; // Fixed monthly budget
        const variance = currentMonthCost - monthlyBudget;
        const percentUsed = monthlyBudget > 0 ? (currentMonthCost / monthlyBudget) * 100 : 0;

        // Efficiency metrics
        const totalKmDriven = truckStatistics.reduce((sum, stat) => sum + (stat.total_mileage || 0), 0);
        const totalHoursOperated = totalTrucks * 8 * 30; // Assume 8 hours/day, 30 days/month
        const costPerKm = totalKmDriven > 0 ? currentMonthCost / totalKmDriven : 0;
        const costPerHour = totalHoursOperated > 0 ? currentMonthCost / totalHoursOperated : 0;
        const maintenanceCostPerTruck = totalTrucks > 0 ? totalMaintenanceCost / totalTrucks : 0;

        return {
          breakdown: {
            fuel: totalFuelCost,
            maintenance: totalMaintenanceCost - laborCost,
            labor: laborCost,
            parts: partsCost,
            other: otherCost
          },
          budget: {
            monthly: monthlyBudget,
            variance: variance,
            percentUsed: Math.round(percentUsed)
          },
          efficiency: {
            costPerKm: Math.round(costPerKm * 100) / 100,
            costPerHour: Math.round(costPerHour * 100) / 100,
            maintenanceCostPerTruck: Math.round(maintenanceCostPerTruck)
          },
          charts: {
            costBreakdown
          }
        };
      };

      const costAnalytics = calculateCostAnalytics();

      // Calculate Usage Analytics
      const calculateUsageAnalytics = () => {
        const currentThresholds = thresholdConfigs[usageThreshold];

        // Calculate usage scores for each vehicle
        const vehicleUsageScores = trucks.map(truck => {
          // Get fuel records for this truck
          const truckFuelRecords = fuelRecords.filter(f => f.truck_id === truck.id);

          // Get maintenance records for this truck
          const truckMaintenanceRecords = maintenanceRecords.filter(m => m.truck === truck.id);

          // Get statistics for this truck
          const truckStats = truckStatistics.find(s => s.id === truck.truck_statistics);

          // Calculate metrics
          const totalMileage = truckStats?.total_mileage || 0;
          const fuelFrequency = truckFuelRecords.length;
          const maintenanceFrequency = truckMaintenanceRecords.length;

          // Days since last activity
          let daysSinceLastActivity = 0;
          const recentFuel = truckFuelRecords.sort((a, b) => new Date(b.created) - new Date(a.created))[0];
          const recentMaintenance = truckMaintenanceRecords.sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date))[0];

          const lastFuelDate = recentFuel ? new Date(recentFuel.created) : null;
          const lastMaintenanceDate = recentMaintenance ? new Date(recentMaintenance.completion_date) : null;

          const lastActivityDate = lastFuelDate && lastMaintenanceDate
            ? new Date(Math.max(lastFuelDate.getTime(), lastMaintenanceDate.getTime()))
            : lastFuelDate || lastMaintenanceDate;

          if (lastActivityDate) {
            daysSinceLastActivity = Math.floor((new Date() - lastActivityDate) / (1000 * 60 * 60 * 24));
          }

          // Calculate usage score (0-100)
          // Higher mileage, more fuel entries, recent activity = higher score
          const mileageScore = Math.min(totalMileage / 10000 * 40, 40); // 40% weight, max at 10k miles
          const fuelScore = Math.min(fuelFrequency * 5, 30); // 30% weight, 5 points per fuel entry
          const activityScore = Math.max(30 - (daysSinceLastActivity / 10), 0); // 30% weight, loses points for inactivity

          const usageScore = Math.round(mileageScore + fuelScore + activityScore);

          // Get driver info
          const driver = truck.users_id ? driverDetails.find(d => d.id === truck.users_id) : null;

          return {
            id: truck.id,
            plateNumber: truck.plate_number,
            truckType: truck.truck_type || 'Unknown',
            usageScore,
            totalMileage,
            fuelFrequency,
            maintenanceFrequency,
            daysSinceLastActivity,
            driverName: driver?.phone || 'Unassigned', // Using phone as name placeholder
            isAssigned: !!truck.users_id
          };
        });

        // Sort by usage score
        vehicleUsageScores.sort((a, b) => b.usageScore - a.usageScore);

        // Categorize vehicles
        const highUsageVehicles = vehicleUsageScores.filter(v => v.usageScore >= currentThresholds.high);
        const lowUsageVehicles = vehicleUsageScores.filter(v => v.usageScore <= currentThresholds.low);

        // Calculate driver usage patterns
        const driverUsageMap = {};
        vehicleUsageScores.forEach(vehicle => {
          if (vehicle.isAssigned) {
            if (!driverUsageMap[vehicle.driverName]) {
              driverUsageMap[vehicle.driverName] = {
                driverName: vehicle.driverName,
                vehicleCount: 0,
                totalUsageScore: 0,
                vehicles: []
              };
            }
            driverUsageMap[vehicle.driverName].vehicleCount++;
            driverUsageMap[vehicle.driverName].totalUsageScore += vehicle.usageScore;
            driverUsageMap[vehicle.driverName].vehicles.push(vehicle);
          }
        });

        const driverUsage = Object.values(driverUsageMap).map(driver => ({
          ...driver,
          averageUsageScore: Math.round(driver.totalUsageScore / driver.vehicleCount)
        })).sort((a, b) => b.averageUsageScore - a.averageUsageScore);

        const averageUsageScore = vehicleUsageScores.length > 0
          ? Math.round(vehicleUsageScores.reduce((sum, v) => sum + v.usageScore, 0) / vehicleUsageScores.length)
          : 0;

        return {
          highUsageVehicles,
          lowUsageVehicles,
          driverUsage,
          averageUsageScore,
          allVehicles: vehicleUsageScores
        };
      };

      // Calculate MPG Analytics by Vehicle Type
      const calculateMPGAnalytics = () => {
        // Group fuel records by truck type and calculate MPG
        const mpgByType = {};
        const mpgTrends = [];

        fuelRecords.forEach(record => {
          if (record.odometer_reading && record.fuel_amount > 0) {
            const truck = trucks.find(t => t.id === record.truck_id);
            if (truck) {
              const truckType = truck.truck_type || 'Unknown';

              // Find previous fuel record for the same truck to calculate actual MPG
              const truckFuelHistory = fuelRecords
                .filter(f => f.truck_id === record.truck_id && f.odometer_reading)
                .sort((a, b) => new Date(a.created) - new Date(b.created));

              const currentIndex = truckFuelHistory.findIndex(f => f.id === record.id);

              let mpg = 0;
              if (currentIndex > 0) {
                const previousRecord = truckFuelHistory[currentIndex - 1];
                const milesDriven = record.odometer_reading - previousRecord.odometer_reading;
                if (milesDriven > 0 && milesDriven < 1000) { // Reasonable range check
                  mpg = milesDriven / record.fuel_amount;
                }
              }

              if (mpg > 0 && mpg < 50) { // Valid MPG range
                // Group by vehicle type
                if (!mpgByType[truckType]) {
                  mpgByType[truckType] = {
                    type: truckType,
                    mpgReadings: [],
                    totalMPG: 0,
                    count: 0,
                    avgMPG: 0
                  };
                }

                mpgByType[truckType].mpgReadings.push({
                  mpg,
                  date: record.created,
                  truckId: record.truck_id,
                  plateNumber: truck.plate_number
                });
                mpgByType[truckType].totalMPG += mpg;
                mpgByType[truckType].count++;

                // Add to trends data
                mpgTrends.push({
                  date: record.created,
                  mpg,
                  truckType,
                  truckId: record.truck_id,
                  plateNumber: truck.plate_number,
                  month: format(new Date(record.created), 'MMM yyyy')
                });
              }
            }
          }
        });

        // Calculate averages and group trends by month and type
        const byVehicleType = Object.values(mpgByType).map(typeData => {
          typeData.avgMPG = Math.round((typeData.totalMPG / typeData.count) * 10) / 10;
          return typeData;
        }).sort((a, b) => b.avgMPG - a.avgMPG);

        // Group trends by month for charting
        const monthlyTrends = {};
        mpgTrends.forEach(trend => {
          const key = `${trend.month}-${trend.truckType}`;
          if (!monthlyTrends[key]) {
            monthlyTrends[key] = {
              month: trend.month,
              truckType: trend.truckType,
              mpgReadings: [],
              totalMPG: 0,
              count: 0
            };
          }
          monthlyTrends[key].mpgReadings.push(trend.mpg);
          monthlyTrends[key].totalMPG += trend.mpg;
          monthlyTrends[key].count++;
        });

        const trends = Object.values(monthlyTrends)
          .map(monthData => ({
            month: monthData.month,
            truckType: monthData.truckType,
            avgMPG: Math.round((monthData.totalMPG / monthData.count) * 10) / 10
          }))
          .sort((a, b) => new Date(a.month + ' 1') - new Date(b.month + ' 1'));

        // Identify top and poor performers
        const allVehiclesMPG = {};
        mpgTrends.forEach(trend => {
          if (!allVehiclesMPG[trend.truckId]) {
            allVehiclesMPG[trend.truckId] = {
              truckId: trend.truckId,
              plateNumber: trend.plateNumber,
              truckType: trend.truckType,
              mpgReadings: [],
              totalMPG: 0,
              count: 0
            };
          }
          allVehiclesMPG[trend.truckId].mpgReadings.push(trend.mpg);
          allVehiclesMPG[trend.truckId].totalMPG += trend.mpg;
          allVehiclesMPG[trend.truckId].count++;
        });

        const vehiclePerformance = Object.values(allVehiclesMPG)
          .map(vehicle => ({
            ...vehicle,
            avgMPG: Math.round((vehicle.totalMPG / vehicle.count) * 10) / 10
          }))
          .filter(vehicle => vehicle.count >= 2) // At least 2 readings
          .sort((a, b) => b.avgMPG - a.avgMPG);

        const topPerformers = vehiclePerformance.slice(0, 5);
        const poorPerformers = vehiclePerformance.slice(-5).reverse();

        return {
          byVehicleType,
          trends,
          topPerformers,
          poorPerformers,
          allTrends: mpgTrends
        };
      };

      const usageAnalytics = calculateUsageAnalytics();
      const mpgAnalytics = calculateMPGAnalytics();

      // Calculate Vehicle Retirement Analytics
      const calculateRetirementAnalytics = () => {
        const currentYear = new Date().getFullYear();

        // Calculate age for each truck and retirement projections
        const vehicleRetirementData = trucks.map(truck => {
          const purchaseYear = truck.truck_date ? new Date(truck.truck_date).getFullYear() : currentYear - 5; // Default to 5 years old if no date
          const vehicleAge = currentYear - purchaseYear;

          // Get maintenance history for this truck
          const truckMaintenanceRecords = maintenanceRecords.filter(m => m.truck === truck.id);
          const totalMaintenanceCost = truckMaintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
          const maintenanceFrequency = truckMaintenanceRecords.length;

          // Get fuel efficiency data
          const truckFuelRecords = fuelRecords.filter(f => f.truck_id === truck.id);
          let avgMPG = 0;
          let fuelEfficiencyScore = 50; // Default score

          if (truckFuelRecords.length > 1) {
            // Calculate MPG based on fuel records
            const mpgReadings = [];
            truckFuelRecords.forEach((record, index) => {
              if (index > 0 && record.odometer_reading && truckFuelRecords[index - 1].odometer_reading) {
                const milesDriven = record.odometer_reading - truckFuelRecords[index - 1].odometer_reading;
                if (milesDriven > 0 && milesDriven < 1000 && record.fuel_amount > 0) {
                  const mpg = milesDriven / record.fuel_amount;
                  if (mpg > 0 && mpg < 50) mpgReadings.push(mpg);
                }
              }
            });

            if (mpgReadings.length > 0) {
              avgMPG = mpgReadings.reduce((sum, mpg) => sum + mpg, 0) / mpgReadings.length;
              // Score based on MPG performance (higher is better)
              fuelEfficiencyScore = Math.min(Math.max((avgMPG / 20) * 100, 0), 100);
            }
          }

          // Calculate retirement score (0-100, lower = should retire sooner)
          const ageScore = Math.max(100 - (vehicleAge * 10), 0); // Decreases by 10 per year
          const maintenanceScore = Math.max(100 - (maintenanceFrequency * 5), 0); // Decreases by 5 per maintenance
          const costScore = Math.max(100 - (totalMaintenanceCost / 1000), 0); // Decreases based on cost

          const retirementScore = Math.round((ageScore + maintenanceScore + fuelEfficiencyScore + costScore) / 4);

          // Estimate years until retirement (based on industry standards)
          const standardRetirementAge = truck.truck_type?.toLowerCase().includes('heavy') ? 15 : 12;
          const yearsUntilRetirement = Math.max(standardRetirementAge - vehicleAge, 0);

          // Estimated replacement cost based on truck type
          const getReplacementCost = (truckType) => {
            const type = (truckType || '').toLowerCase();
            if (type.includes('heavy') || type.includes('large')) return 150000;
            if (type.includes('medium')) return 80000;
            if (type.includes('light') || type.includes('small')) return 50000;
            return 80000; // Default
          };

          const estimatedReplacementCost = getReplacementCost(truck.truck_type);

          return {
            id: truck.id,
            plateNumber: truck.plate_number,
            truckType: truck.truck_type || 'Unknown',
            manufacturer: truck.truck_manufacturer || 'Unknown',
            model: truck.truck_model || 'Unknown',
            purchaseYear,
            vehicleAge,
            retirementScore,
            yearsUntilRetirement,
            estimatedReplacementCost,
            totalMaintenanceCost,
            maintenanceFrequency,
            avgMPG: Math.round(avgMPG * 10) / 10,
            fuelEfficiencyScore: Math.round(fuelEfficiencyScore),
            isAssigned: !!truck.users_id,
            recentMaintenanceCost: truckMaintenanceRecords
              .filter(r => r.completion_date && new Date(r.completion_date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
              .reduce((sum, record) => sum + (record.cost || 0), 0)
          };
        });

        // Sort by retirement urgency (lowest score first)
        vehicleRetirementData.sort((a, b) => a.retirementScore - b.retirementScore);

        // Upcoming retirements (next 3 years)
        const upcomingRetirements = vehicleRetirementData.filter(v => v.yearsUntilRetirement <= 3);

        // Upgrade candidates (poor performance but not necessarily old)
        const upgradeCandidates = vehicleRetirementData.filter(v =>
          v.retirementScore < 40 ||
          (v.maintenanceFrequency > 5 && v.recentMaintenanceCost > 20000) ||
          v.fuelEfficiencyScore < 30
        );

        // Create retirement timeline for next 10 years
        const retirementTimeline = [];
        for (let year = 0; year <= 10; year++) {
          const yearData = {
            year: currentYear + year,
            vehiclesToRetire: vehicleRetirementData.filter(v => v.yearsUntilRetirement === year),
            totalReplacementCost: 0,
            count: 0
          };

          yearData.count = yearData.vehiclesToRetire.length;
          yearData.totalReplacementCost = yearData.vehiclesToRetire.reduce(
            (sum, v) => sum + v.estimatedReplacementCost, 0
          );

          if (yearData.count > 0) {
            retirementTimeline.push(yearData);
          }
        }

        // Age distribution for charts
        const ageGroups = {
          'New (0-2 years)': 0,
          'Young (3-5 years)': 0,
          'Mature (6-8 years)': 0,
          'Aging (9-12 years)': 0,
          'Old (13+ years)': 0
        };

        vehicleRetirementData.forEach(vehicle => {
          if (vehicle.vehicleAge <= 2) ageGroups['New (0-2 years)']++;
          else if (vehicle.vehicleAge <= 5) ageGroups['Young (3-5 years)']++;
          else if (vehicle.vehicleAge <= 8) ageGroups['Mature (6-8 years)']++;
          else if (vehicle.vehicleAge <= 12) ageGroups['Aging (9-12 years)']++;
          else ageGroups['Old (13+ years)']++;
        });

        const ageDistribution = Object.entries(ageGroups).map(([ageGroup, count]) => ({
          ageGroup,
          count,
          percentage: trucks.length > 0 ? Math.round((count / trucks.length) * 100) : 0
        }));

        // Maintenance cost vs age correlation
        const maintenanceVsAge = vehicleRetirementData.map(vehicle => ({
          vehicleAge: vehicle.vehicleAge,
          maintenanceCost: vehicle.totalMaintenanceCost,
          plateNumber: vehicle.plateNumber,
          retirementScore: vehicle.retirementScore
        }));

        // Generate recommendations
        const recommendations = [];

        if (upcomingRetirements.length > 0) {
          recommendations.push({
            type: 'urgent',
            title: 'Immediate Retirement Planning Required',
            description: `${upcomingRetirements.length} vehicle(s) should be retired within the next 3 years.`,
            action: 'Start budgeting for replacements and consider phased retirement.',
            vehicles: upcomingRetirements.slice(0, 3).map(v => v.plateNumber),
            priority: 'high'
          });
        }

        if (upgradeCandidates.length > 0) {
          recommendations.push({
            type: 'upgrade',
            title: 'Consider Early Replacement',
            description: `${upgradeCandidates.length} vehicle(s) showing poor performance metrics.`,
            action: 'Evaluate cost-benefit of early replacement vs continued maintenance.',
            vehicles: upgradeCandidates.slice(0, 3).map(v => v.plateNumber),
            priority: 'medium'
          });
        }

        const oldVehicles = vehicleRetirementData.filter(v => v.vehicleAge > 10);
        if (oldVehicles.length > 0) {
          recommendations.push({
            type: 'aging_fleet',
            title: 'Aging Fleet Detected',
            description: `${oldVehicles.length} vehicle(s) are over 10 years old.`,
            action: 'Monitor closely for increased maintenance costs and plan replacements.',
            vehicles: oldVehicles.slice(0, 3).map(v => v.plateNumber),
            priority: 'medium'
          });
        }

        const totalReplacementCostNext5Years = retirementTimeline
          .filter(item => item.year <= currentYear + 5)
          .reduce((sum, item) => sum + item.totalReplacementCost, 0);

        if (totalReplacementCostNext5Years > 500000) {
          recommendations.push({
            type: 'budget',
            title: 'Significant Capital Investment Required',
            description: `Estimated ${formatCurrency(totalReplacementCostNext5Years)} needed for replacements in next 5 years.`,
            action: 'Develop long-term capital budget and consider financing options.',
            vehicles: [],
            priority: 'high'
          });
        }

        // Cost projections and savings opportunities
        const replacementCosts = retirementTimeline.slice(0, 5).map(item => ({
          year: item.year,
          cost: item.totalReplacementCost,
          vehicleCount: item.count
        }));

        const savingsOpportunities = upgradeCandidates.slice(0, 5).map(vehicle => ({
          plateNumber: vehicle.plateNumber,
          currentAnnualCost: vehicle.recentMaintenanceCost + (vehicle.avgMPG > 0 ? 50000 / vehicle.avgMPG * 3.5 : 25000), // Rough fuel cost estimate
          projectedNewVehicleCost: vehicle.estimatedReplacementCost / 10, // Amortized over 10 years
          potentialAnnualSavings: Math.max(vehicle.recentMaintenanceCost - (vehicle.estimatedReplacementCost / 10), 0)
        }));

        return {
          upcomingRetirements: upcomingRetirements.slice(0, 10),
          upgradeCandidates: upgradeCandidates.slice(0, 10),
          retirementTimeline,
          costProjections: {
            replacementCosts,
            savingsOpportunities: savingsOpportunities.filter(s => s.potentialAnnualSavings > 0)
          },
          ageDistribution,
          maintenanceVsAge,
          recommendations,
          summary: {
            totalVehicles: trucks.length,
            averageAge: vehicleRetirementData.length > 0 ?
              Math.round(vehicleRetirementData.reduce((sum, v) => sum + v.vehicleAge, 0) / vehicleRetirementData.length) : 0,
            vehiclesNeedingAttention: upcomingRetirements.length + upgradeCandidates.length,
            totalProjectedCost5Years: totalReplacementCostNext5Years
          }
        };
      };

      const retirementAnalytics = calculateRetirementAnalytics();

      // Calculate Trip Analytics with dummy data
      const calculateTripAnalytics = () => {
        // Generate dummy trip data since the database schema doesn't support trips yet
        // Using realistic locations around General Santos City, Philippines
        const dummyTrips = [
          {
            id: "trip_001",
            origin: "General Santos City",
            destination: "Koronadal City",
            distance: 45,
            duration: 90, // minutes
            status: "completed",
            driverId: trucks[0]?.users_id || "driver_001",
            vehicleId: trucks[0]?.id || "truck_001",
            plateNumber: trucks[0]?.plate_number || "ABC-123",
            driverName: "Juan dela Cruz",
            startTime: "2025-07-03T08:00:00+08:00",
            endTime: "2025-07-03T09:30:00+08:00",
            scheduledDelivery: "2025-07-03T10:00:00+08:00",
            actualDelivery: "2025-07-03T09:45:00+08:00",
            deliveryStatus: "early"
          },
          {
            id: "trip_002",
            origin: "General Santos City",
            destination: "Davao City",
            distance: 150,
            duration: 180,
            status: "completed",
            driverId: trucks[1]?.users_id || "driver_002",
            vehicleId: trucks[1]?.id || "truck_002",
            plateNumber: trucks[1]?.plate_number || "DEF-456",
            driverName: "Maria Santos",
            startTime: "2025-07-03T06:00:00+08:00",
            endTime: "2025-07-03T09:00:00+08:00",
            scheduledDelivery: "2025-07-03T09:30:00+08:00",
            actualDelivery: "2025-07-03T09:45:00+08:00",
            deliveryStatus: "late"
          },
          {
            id: "trip_003",
            origin: "General Santos City",
            destination: "Tacurong City",
            distance: 65,
            duration: 120,
            status: "ongoing",
            driverId: trucks[2]?.users_id || "driver_003",
            vehicleId: trucks[2]?.id || "truck_003",
            plateNumber: trucks[2]?.plate_number || "GHI-789",
            driverName: "Roberto Mercado",
            startTime: "2025-07-03T07:30:00+08:00",
            endTime: null,
            scheduledDelivery: "2025-07-03T11:00:00+08:00",
            actualDelivery: null,
            deliveryStatus: "pending"
          },
          {
            id: "trip_004",
            origin: "General Santos City",
            destination: "Kidapawan City",
            distance: 95,
            duration: 150,
            status: "completed",
            driverId: trucks[3]?.users_id || "driver_004",
            vehicleId: trucks[3]?.id || "truck_004",
            plateNumber: trucks[3]?.plate_number || "JKL-012",
            driverName: "Ana Reyes",
            startTime: "2025-07-02T06:00:00+08:00",
            endTime: "2025-07-02T08:30:00+08:00",
            scheduledDelivery: "2025-07-02T09:00:00+08:00",
            actualDelivery: "2025-07-02T08:55:00+08:00",
            deliveryStatus: "on_time"
          },
          {
            id: "trip_005",
            origin: "General Santos City",
            destination: "Marbel (Koronadal)",
            distance: 48,
            duration: 95,
            status: "completed",
            driverId: trucks[0]?.users_id || "driver_001",
            vehicleId: trucks[0]?.id || "truck_001",
            plateNumber: trucks[0]?.plate_number || "ABC-123",
            driverName: "Juan dela Cruz",
            startTime: "2025-07-01T14:00:00+08:00",
            endTime: "2025-07-01T15:35:00+08:00",
            scheduledDelivery: "2025-07-01T16:00:00+08:00",
            actualDelivery: "2025-07-01T15:50:00+08:00",
            deliveryStatus: "early"
          },
          {
            id: "trip_006",
            origin: "General Santos City",
            destination: "Cotabato City",
            distance: 120,
            duration: 165,
            status: "completed",
            driverId: trucks[1]?.users_id || "driver_002",
            vehicleId: trucks[1]?.id || "truck_002",
            plateNumber: trucks[1]?.plate_number || "DEF-456",
            driverName: "Maria Santos",
            startTime: "2025-06-30T05:30:00+08:00",
            endTime: "2025-06-30T08:15:00+08:00",
            scheduledDelivery: "2025-06-30T08:30:00+08:00",
            actualDelivery: "2025-06-30T08:25:00+08:00",
            deliveryStatus: "on_time"
          },
          {
            id: "trip_007",
            origin: "General Santos City",
            destination: "Polomolok",
            distance: 25,
            duration: 45,
            status: "completed",
            driverId: trucks[2]?.users_id || "driver_003",
            vehicleId: trucks[2]?.id || "truck_003",
            plateNumber: trucks[2]?.plate_number || "GHI-789",
            driverName: "Roberto Mercado",
            startTime: "2025-06-29T13:00:00+08:00",
            endTime: "2025-06-29T13:45:00+08:00",
            scheduledDelivery: "2025-06-29T14:00:00+08:00",
            actualDelivery: "2025-06-29T13:50:00+08:00",
            deliveryStatus: "early"
          },
          {
            id: "trip_008",
            origin: "General Santos City",
            destination: "Tupi",
            distance: 35,
            duration: 60,
            status: "completed",
            driverId: trucks[3]?.users_id || "driver_004",
            vehicleId: trucks[3]?.id || "truck_004",
            plateNumber: trucks[3]?.plate_number || "JKL-012",
            driverName: "Ana Reyes",
            startTime: "2025-06-28T10:00:00+08:00",
            endTime: "2025-06-28T11:00:00+08:00",
            scheduledDelivery: "2025-06-28T11:15:00+08:00",
            actualDelivery: "2025-06-28T11:30:00+08:00",
            deliveryStatus: "late"
          }
        ];

        const totalTrips = dummyTrips.length;
        const completedTrips = dummyTrips.filter(trip => trip.status === "completed").length;
        const ongoingTrips = dummyTrips.filter(trip => trip.status === "ongoing").length;
        const totalDistance = dummyTrips.reduce((sum, trip) => sum + trip.distance, 0);
        const totalDuration = dummyTrips.filter(trip => trip.duration).reduce((sum, trip) => sum + trip.duration, 0);
        const avgTripDuration = completedTrips > 0 ? Math.round(totalDuration / completedTrips) : 0;
        const avgDistance = totalTrips > 0 ? Math.round(totalDistance / totalTrips) : 0;

        // Calculate delivery performance
        const deliveryPerformance = {
          onTime: dummyTrips.filter(trip => trip.deliveryStatus === "on_time").length,
          early: dummyTrips.filter(trip => trip.deliveryStatus === "early").length,
          late: dummyTrips.filter(trip => trip.deliveryStatus === "late").length
        };

        const onTimeDeliveryRate = completedTrips > 0
          ? Math.round(((deliveryPerformance.onTime + deliveryPerformance.early) / completedTrips) * 100)
          : 0;

        // Trips by driver
        const tripsByDriver = {};
        dummyTrips.forEach(trip => {
          if (!tripsByDriver[trip.driverName]) {
            tripsByDriver[trip.driverName] = {
              driverName: trip.driverName,
              totalTrips: 0,
              completedTrips: 0,
              totalDistance: 0,
              avgDistance: 0,
              onTimeRate: 0
            };
          }
          tripsByDriver[trip.driverName].totalTrips++;
          if (trip.status === "completed") {
            tripsByDriver[trip.driverName].completedTrips++;
          }
          tripsByDriver[trip.driverName].totalDistance += trip.distance;
        });

        // Calculate driver averages and performance
        Object.values(tripsByDriver).forEach(driver => {
          driver.avgDistance = Math.round(driver.totalDistance / driver.totalTrips);
          const driverTrips = dummyTrips.filter(trip => trip.driverName === driver.driverName && trip.status === "completed");
          const onTimeTrips = driverTrips.filter(trip => ["on_time", "early"].includes(trip.deliveryStatus));
          driver.onTimeRate = driverTrips.length > 0 ? Math.round((onTimeTrips.length / driverTrips.length) * 100) : 0;
        });

        // Trips by vehicle
        const tripsByVehicle = {};
        dummyTrips.forEach(trip => {
          if (!tripsByVehicle[trip.plateNumber]) {
            tripsByVehicle[trip.plateNumber] = {
              plateNumber: trip.plateNumber,
              vehicleId: trip.vehicleId,
              totalTrips: 0,
              totalDistance: 0,
              avgDistance: 0,
              utilization: 0
            };
          }
          tripsByVehicle[trip.plateNumber].totalTrips++;
          tripsByVehicle[trip.plateNumber].totalDistance += trip.distance;
        });

        Object.values(tripsByVehicle).forEach(vehicle => {
          vehicle.avgDistance = Math.round(vehicle.totalDistance / vehicle.totalTrips);
          vehicle.utilization = Math.min(Math.round((vehicle.totalTrips / 30) * 100), 100); // Assuming 30-day period
        });

        // Distance by vehicle type
        const distanceByVehicleType = [
          { vehicleType: "Light Truck", totalDistance: 2500, avgDistance: 85, tripCount: 29 },
          { vehicleType: "Medium Truck", totalDistance: 3200, avgDistance: 106, tripCount: 30 },
          { vehicleType: "Heavy Truck", totalDistance: 4100, avgDistance: 136, tripCount: 30 }
        ];

        return {
          totalTrips,
          completedTrips,
          ongoingTrips,
          totalDistance,
          totalDuration,
          avgTripDuration,
          avgDistance,
          onTimeDeliveryRate,
          recentTrips: dummyTrips.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)), // Show all trips sorted by most recent
          tripsByDriver: Object.values(tripsByDriver),
          tripsByVehicle: Object.values(tripsByVehicle),
          distanceByVehicleType,
          deliveryPerformance
        };
      };

      const tripAnalytics = calculateTripAnalytics();

      // Debug analytics
      console.log('Usage Analytics Debug:', usageAnalytics);
      console.log('MPG Analytics Debug:', mpgAnalytics);
      console.log('Trip Analytics Debug:', tripAnalytics);

      setData({
        fleet: {
          total: totalTrucks,
          assigned: assignedTrucks,
          utilization: Math.round(utilizationRate)
        },
        maintenance: {
          totalCost: totalMaintenanceCost,
          laborCost: costAnalytics.breakdown.labor,
          pendingRequests,
          completionRate: Math.round(completionRate),
          avgDays: Math.round(avgCompletionDays)
        },
        fuel: {
          totalCost: totalFuelCost,
          totalLiters: Math.round(totalLiters),
          avgMPG: Math.round(avgMPG * 10) / 10,
          costPerMile: Math.round(avgCostPerMile * 100) / 100
        },
        financial: {
          totalOperating: totalOperatingCost,
          costPerTruck: Math.round(costPerTruck)
        },
        charts: {
          maintenanceTrend: historicalMaintenance,
          fuelTrend: historicalFuel,
          costBreakdown: costAnalytics.charts.costBreakdown
        },
        fuelLogs: {
          recentEntries: recentFuelEntries
        },
        costAnalytics: costAnalytics,
        forecasting: forecastingData,
        maintenanceAnalytics: {
          vehiclesInMaintenance,
          issueProneVehicles,
        },
        usageAnalytics: usageAnalytics,
        mpgAnalytics: mpgAnalytics,
        retirementAnalytics: retirementAnalytics,
        tripAnalytics: tripAnalytics
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [usageThreshold]); // Add dependencies for useCallback

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]); // Now depends on the memoized function
  const chartConfig = {
    maintenance: {
      label: "Maintenance",
      color: "hsl(var(--chart-1))"
    },
    fuel: {
      label: "Fuel",
      color: "hsl(var(--chart-2))"
    },
    labor: {
      label: "Labor",
      color: "hsl(var(--chart-3))"
    },
    parts: {
      label: "Parts",
      color: "hsl(var(--chart-4))"
    },
    other: {
      label: "Other",
      color: "hsl(var(--chart-5))"
    },
    total: {
      label: "Total",
      color: "hsl(var(--primary))"
    },
    mpg: {
      label: "MPG",
      color: "hsl(var(--chart-1))"
    },
    usageScore: {
      label: "Usage Score",
      color: "hsl(var(--chart-2))"
    }
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Icon icon="line-md:loading-twotone-loop" className="w-8 h-8 text-primary" />
          <p className="text-muted-foreground">Loading analytics dashboard...</p>
        </div>
      </div>
    );  }  // Debug final data structure
  console.log('Final Data Structure:', data);
  console.log('Maintenance Trend Data:', data?.charts?.maintenanceTrend);
  console.log('Fuel Trend Data:', data?.charts?.fuelTrend);
  console.log('Recent Fuel Entries:', data?.fuelLogs?.recentEntries);
  console.log('Forecasting Data:', data?.forecasting);
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fleet Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights for {format(currentMonth, 'MMMM yyyy')}
            {lastUpdated && (
              <span className="ml-2 text-sm">
                • Last updated: {format(lastUpdated, 'HH:mm:ss')}
              </span>
            )}
          </p>
        </div>
        <Button onClick={fetchAnalyticsData} disabled={loading} className="ml-auto">
          <Icon icon="material-symbols:refresh" className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-4 md:col-span-1">
            {/* Fleet Utilization */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fleet Utilization</CardTitle>
                    <Icon icon="material-symbols:local-shipping" className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.fleet.utilization}%</div>
                    <p className="text-xs text-muted-foreground">
                    {data.fleet.assigned} of {data.fleet.total} trucks assigned
                    </p>
                    <Progress value={data.fleet.utilization} className="mt-2" />
                </CardContent>
            </Card>

            {/* Fuel Efficiency */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fuel Efficiency</CardTitle>
                    <Icon icon="material-symbols:local-gas-station" className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.fuel.avgMPG} MPG</div>
                    <p className="text-xs text-muted-foreground">
                    {formatCurrency(data.fuel.costPerMile)}/mile
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                    {data.fuel.totalLiters} liters • {formatCurrency(data.fuel.totalCost)}
                    </p>
                </CardContent>
            </Card>
        </div>
        {/* Maintenance Analytics */}
        <Card className="md:col-span-2">
            <CardHeader>
            <CardTitle>Maintenance Hotspots</CardTitle>
            <CardDescription>
                Vehicles with frequent maintenance and issue-prone indicators.
            </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
                <h3 className="text-lg font-medium">Maintenance History</h3>
                <div className="mt-4 space-y-4 max-h-60 overflow-y-auto">
                {data.maintenanceAnalytics.vehiclesInMaintenance.length > 0 ? (
                    data.maintenanceAnalytics.vehiclesInMaintenance.map(truck => (
                    <div key={truck.id} className="flex items-center justify-between p-2 rounded-lg bg-blue-100">
                        <div>
                        <p className="font-medium">{truck.plateNumber}</p>
                        <p className="text-sm text-muted-foreground">
                            {truck.maintenanceCount} maintenance records
                        </p>
                        </div>
                        <div className="text-right">
                        <p className="text-sm text-muted-foreground">Last serviced</p>
                        <p className="font-medium">
                            {truck.lastMaintenanceDate !== 'N/A' ? format(new Date(truck.lastMaintenanceDate), 'MMM dd, yyyy') : 'N/A'}
                        </p>
                        </div>
                    </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No maintenance records found.</p>
                )}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-medium">Issue-Prone Vehicles</h3>
                <div className="mt-4 space-y-2">
                {data.maintenanceAnalytics.issueProneVehicles.length > 0 ? (
                    data.maintenanceAnalytics.issueProneVehicles.map(truck => (
                    <div key={truck.id} className="flex items-center p-2 rounded-lg bg-destructive/10">
                        <Icon icon="ph:warning-fill" className="w-5 h-5 text-destructive mr-3" />
                        <div>
                        <p className="font-medium">{truck.plateNumber}</p>
                        <p className="text-sm text-muted-foreground">
                            {truck.maintenanceCount} maintenance records. High frequency detected.
                        </p>
                        </div>
                    </div>
                    ))
                ) : (
                    <div className="flex items-center p-2 rounded-lg bg-green-100">
                    <Icon icon="ph:check-circle-fill" className="w-5 h-5 text-green-600 mr-3" />
                    <p className="text-sm text-green-700">No issue-prone vehicles detected.</p>
                    </div>
                )}
                </div>
            </div>
            </CardContent>
        </Card>
      </div>{/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Maintenance Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Average completion time</span>
              <span className="font-medium">{data.maintenance.avgDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Completion rate</span>
              <span className="font-medium">{data.maintenance.completionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pending requests</span>
              <span className="font-medium">{data.maintenance.pendingRequests}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fuel Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total gallons consumed</span>
              <span className="font-medium">{data.fuel.totalGallons}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Average MPG</span>
              <span className="font-medium">{data.fuel.avgMPG}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cost per mile</span>
              <span className="font-medium">{formatCurrency(data.fuel.costPerMile)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fleet Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total trucks</span>
              <span className="font-medium">{data.fleet.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Assigned trucks</span>
              <span className="font-medium">{data.fleet.assigned}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Utilization rate</span>
              <span className="font-medium">{data.fleet.utilization}%</span>
            </div>          </CardContent>        </Card>
      </div>

      {/* Enhanced Cost Analytics Section */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Icon icon="material-symbols:analytics" className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Cost Analytics & Budget Insights</h3>
        </div>

        {/* Budget Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
              <Icon icon="material-symbols:account-balance-wallet" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.costAnalytics?.budget?.monthly || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {data.costAnalytics?.budget?.percentUsed || 0}% used this month
              </p>
              <Progress value={data.costAnalytics?.budget?.percentUsed || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Variance</CardTitle>
              <Icon icon={data.costAnalytics?.budget?.variance >= 0 ? "material-symbols:trending-up" : "material-symbols:trending-down"}
                    className={`h-4 w-4 ${data.costAnalytics?.budget?.variance >= 0 ? 'text-red-500' : 'text-green-500'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.costAnalytics?.budget?.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {data.costAnalytics?.budget?.variance >= 0 ? '+' : ''}{formatCurrency(data.costAnalytics?.budget?.variance || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.costAnalytics?.budget?.variance >= 0 ? 'Over budget' : 'Under budget'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost per Km</CardTitle>
              <Icon icon="material-symbols:route" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.costAnalytics?.efficiency?.costPerKm || 0)}</div>
              <p className="text-xs text-muted-foreground">Operating efficiency</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Labor Costs</CardTitle>
              <Icon icon="material-symbols:engineering" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.maintenance?.laborCost || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(data.costAnalytics?.efficiency?.maintenanceCostPerTruck || 0)} per truck
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Cost Breakdown Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Distribution of operating costs by category</CardDescription>
            </CardHeader>
            <CardContent>
              {data.charts?.costBreakdown && data.charts.costBreakdown.some(item => item.cost > 0) ? (
                <ChartContainer config={{
                  fuel: { label: "Fuel", color: "hsl(var(--chart-1))" },
                  labor: { label: "Labor", color: "hsl(var(--chart-2))" },
                  parts: { label: "Parts", color: "hsl(var(--chart-3))" },
                  other: { label: "Other", color: "hsl(var(--chart-4))" }
                }} className="mx-auto aspect-square max-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.charts?.costBreakdown || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) => percentage > 0 ? `${category}: ${percentage}%` : ''}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="cost"
                      >
                        {(data.charts?.costBreakdown || []).map((entry, index) => {
                          const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
                          return (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          );
                        })}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-md">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      {data.category}
                                    </span>
                                    <span className="font-bold text-muted-foreground">
                                      {formatCurrency(data.cost)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <Icon icon="material-symbols:pie-chart" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No cost data available</p>
                    <p className="text-xs">Cost breakdown will appear when data is available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


        </div>

      </div>

      {/* Cost Efficiency Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Icon icon="material-symbols:speed" className="h-5 w-5" />
              <span>Operational Efficiency</span>
            </CardTitle>
            <CardDescription>Key efficiency metrics for fleet operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Cost per Hour</div>
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(data.costAnalytics?.efficiency?.costPerHour || 0)}
                </div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Cost per Km</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(data.costAnalytics?.efficiency?.costPerKm || 0)}
                </div>
              </div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-sm text-muted-foreground">Maintenance Cost per Truck</div>
              <div className="text-lg font-bold text-orange-600">
                {formatCurrency(data.costAnalytics?.efficiency?.maintenanceCostPerTruck || 0)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Icon icon="material-symbols:insights" className="h-5 w-5" />
              <span>Cost Insights</span>
            </CardTitle>
            <CardDescription>Advanced analytics and operational recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Dynamic insights based on data */}
            {data.costAnalytics?.budget?.variance > 0 && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
                <Icon icon="ph:warning-fill" className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">Budget Alert</p>
                  <p className="text-xs text-red-600">
                    You&apos;re {formatCurrency(data.costAnalytics.budget.variance)} over budget this month.
                  </p>
                </div>
              </div>
            )}

            {data.maintenanceAnalytics?.issueProneVehicles?.length > 0 && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg">
                <Icon icon="material-symbols:maintenance" className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-700">Maintenance Alert</p>
                  <p className="text-xs text-yellow-600">
                    {data.maintenanceAnalytics.issueProneVehicles.length} vehicle(s) need attention.
                  </p>
                </div>
              </div>
            )}

            {data.fuel?.avgMPG < 10 && (
              <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                <Icon icon="material-symbols:eco" className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-700">Fuel Efficiency</p>
                  <p className="text-xs text-blue-600">
                    Consider fuel efficiency training for drivers.
                  </p>
                </div>
              </div>
            )}

            {data.costAnalytics?.budget?.variance <= 0 && (
              <div className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg">
                <Icon icon="ph:check-circle-fill" className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700">Great Job!</p>
                  <p className="text-xs text-green-600">
                    You&apos;re within budget and maintaining efficient operations.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fuel Forecasting Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon icon="material-symbols:trending-up" className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Fuel Consumption & Price Forecasting</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Select Truck:</span>
            <Select value={selectedTruck} onValueChange={setSelectedTruck}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trucks (Fleet)</SelectItem>
                {Object.values(data.forecasting?.perTruckData || {}).map((truckData) => (
                  <SelectItem key={truckData.truckInfo.id} value={truckData.truckInfo.id}>
                    {truckData.truckInfo.plateNumber} - {truckData.truckInfo.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Fuel Consumption Forecast */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Icon icon="material-symbols:local-gas-station" className="h-5 w-5" />
                <span>Fuel Consumption Forecast</span>
              </CardTitle>
              <CardDescription>
                {selectedTruck === 'all'
                  ? 'Predicted fuel consumption based on fleet historical trends'
                  : `Predicted fuel consumption for ${data.forecasting?.perTruckData?.[selectedTruck]?.truckInfo?.plateNumber || 'selected truck'}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Daily Average</span>
                <span className="font-medium">
                  {selectedTruck === 'all'
                    ? data.forecasting.fuelConsumption.dailyAverage
                    : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.dailyAverage || 0
                  } L
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Today</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {selectedTruck === 'all'
                        ? data.forecasting.fuelConsumption.predictedToday
                        : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.predictedToday || 0
                      } L
                    </span>
                    <Icon
                      icon={
                        (selectedTruck === 'all'
                          ? data.forecasting.fuelConsumption.trend
                          : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.trend
                        ) === 'increasing' ? 'material-symbols:trending-up' :
                        (selectedTruck === 'all'
                          ? data.forecasting.fuelConsumption.trend
                          : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.trend
                        ) === 'decreasing' ? 'material-symbols:trending-down' :
                        'material-symbols:trending-flat'
                      }
                      className={`h-4 w-4 ${
                        (selectedTruck === 'all'
                          ? data.forecasting.fuelConsumption.trend
                          : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.trend
                        ) === 'increasing' ? 'text-red-500' :
                        (selectedTruck === 'all'
                          ? data.forecasting.fuelConsumption.trend
                          : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.trend
                        ) === 'decreasing' ? 'text-green-500' :
                        'text-gray-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">This Month ({format(new Date(), 'MMMM')})</span>
                  <span className="font-medium">
                    {selectedTruck === 'all'
                      ? data.forecasting.fuelConsumption.predictedThisMonth
                      : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.predictedThisMonth || 0
                    } L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">This Year ({new Date().getFullYear()})</span>
                  <span className="font-medium">
                    {selectedTruck === 'all'
                      ? data.forecasting.fuelConsumption.predictedThisYear
                      : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.predictedThisYear || 0
                    } L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next Year ({new Date().getFullYear() + 1})</span>
                  <span className="font-medium">
                    {selectedTruck === 'all'
                      ? data.forecasting.fuelConsumption.predictedNextYear
                      : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.predictedNextYear || 0
                    } L
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Forecast Confidence</span>
                  <span className="font-medium">
                    {selectedTruck === 'all'
                      ? data.forecasting.fuelConsumption.confidence
                      : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.confidence || 0
                    }%
                  </span>
                </div>
                <Progress
                  value={
                    selectedTruck === 'all'
                      ? data.forecasting.fuelConsumption.confidence
                      : data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.confidence || 0
                  }
                  className="mt-1 h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Fuel Price Forecast */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Icon icon="material-symbols:attach-money" className="h-5 w-5" />
                <span>Fuel Price Forecast</span>
              </CardTitle>
              <CardDescription>
                {selectedTruck === 'all'
                  ? 'Predicted fuel price trends based on historical data'
                  : `Predicted fuel price trends for ${data.forecasting?.perTruckData?.[selectedTruck]?.truckInfo?.plateNumber || 'selected truck'}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Average Price</span>
                <span className="font-medium">
                  ₱{selectedTruck === 'all'
                    ? data.forecasting.fuelPrice.currentAvgPrice
                    : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.currentAvgPrice || 0
                  }/L
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Today</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      ₱{selectedTruck === 'all'
                        ? data.forecasting.fuelPrice.predictedToday
                        : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.predictedToday || 0
                      }/L
                    </span>
                    <Icon
                      icon={
                        (selectedTruck === 'all'
                          ? data.forecasting.fuelPrice.trend
                          : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.trend
                        ) === 'increasing' ? 'material-symbols:trending-up' :
                        (selectedTruck === 'all'
                          ? data.forecasting.fuelPrice.trend
                          : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.trend
                        ) === 'decreasing' ? 'material-symbols:trending-down' :
                        'material-symbols:trending-flat'
                      }
                      className={`h-4 w-4 ${
                        (selectedTruck === 'all'
                          ? data.forecasting.fuelPrice.trend
                          : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.trend
                        ) === 'increasing' ? 'text-red-500' :
                        (selectedTruck === 'all'
                          ? data.forecasting.fuelPrice.trend
                          : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.trend
                        ) === 'decreasing' ? 'text-green-500' :
                        'text-gray-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">This Month ({format(new Date(), 'MMMM')})</span>
                  <span className="font-medium">
                    ₱{selectedTruck === 'all'
                      ? data.forecasting.fuelPrice.predictedThisMonth
                      : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.predictedThisMonth || 0
                    }/L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">This Year ({new Date().getFullYear()})</span>
                  <span className="font-medium">
                    ₱{selectedTruck === 'all'
                      ? data.forecasting.fuelPrice.predictedThisYear
                      : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.predictedThisYear || 0
                    }/L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next Year ({new Date().getFullYear() + 1})</span>
                  <span className="font-medium">
                    ₱{selectedTruck === 'all'
                      ? data.forecasting.fuelPrice.predictedNextYear
                      : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.predictedNextYear || 0
                    }/L
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Forecast Confidence</span>
                  <span className="font-medium">
                    {selectedTruck === 'all'
                      ? data.forecasting.fuelPrice.confidence
                      : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.confidence || 0
                    }%
                  </span>
                </div>
                <Progress
                  value={
                    selectedTruck === 'all'
                      ? data.forecasting.fuelPrice.confidence
                      : data.forecasting?.perTruckData?.[selectedTruck]?.fuelPrice?.confidence || 0
                  }
                  className="mt-1 h-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cost Projection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Icon icon="material-symbols:calculate" className="h-5 w-5" />
              <span>Fuel Cost Projections</span>
            </CardTitle>
            <CardDescription>
              {selectedTruck === 'all'
                ? 'Estimated total fuel costs based on fleet consumption and price forecasts'
                : `Estimated fuel costs for ${data.forecasting?.perTruckData?.[selectedTruck]?.truckInfo?.plateNumber || 'selected truck'}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">Today</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(
                    selectedTruck === 'all'
                      ? data.forecasting.costProjection.today
                      : data.forecasting?.perTruckData?.[selectedTruck]?.costProjection?.today || 0
                  )}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">This Month</div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(
                    selectedTruck === 'all'
                      ? data.forecasting.costProjection.thisMonth
                      : data.forecasting?.perTruckData?.[selectedTruck]?.costProjection?.thisMonth || 0
                  )}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">This Year</div>
                <div className="text-xl font-bold text-orange-600">
                  {formatCurrency(
                    selectedTruck === 'all'
                      ? data.forecasting.costProjection.thisYear
                      : data.forecasting?.perTruckData?.[selectedTruck]?.costProjection?.thisYear || 0
                  )}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">Next Year</div>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(
                    selectedTruck === 'all'
                      ? data.forecasting.costProjection.nextYear
                      : data.forecasting?.perTruckData?.[selectedTruck]?.costProjection?.nextYear || 0
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fuel Consumption Trends Chart */}
        {selectedTruck !== 'all' && data.forecasting?.perTruckData?.[selectedTruck] && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Icon icon="material-symbols:trending-up" className="h-5 w-5" />
                <span>Fuel Consumption Forecast Visualization</span>
              </CardTitle>
              <CardDescription>
                Visual representation of fuel consumption forecast for {data.forecasting?.perTruckData?.[selectedTruck]?.truckInfo?.plateNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="min-h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        period: 'Today',
                        consumption: data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.predictedToday || 0,
                        cost: data.forecasting?.perTruckData?.[selectedTruck]?.costProjection?.today || 0
                      },
                      {
                        period: 'This Month',
                        consumption: data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.predictedThisMonth || 0,
                        cost: data.forecasting?.perTruckData?.[selectedTruck]?.costProjection?.thisMonth || 0
                      },
                      {
                        period: 'This Year',
                        consumption: data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.predictedThisYear || 0,
                        cost: data.forecasting?.perTruckData?.[selectedTruck]?.costProjection?.thisYear || 0
                      },
                      {
                        period: 'Next Year',
                        consumption: data.forecasting?.perTruckData?.[selectedTruck]?.fuelConsumption?.predictedNextYear || 0,
                        cost: data.forecasting?.perTruckData?.[selectedTruck]?.costProjection?.nextYear || 0
                      }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar yAxisId="left" dataKey="consumption" fill="#3b82f6" name="Fuel Consumption (L)" />
                    <Bar yAxisId="right" dataKey="cost" fill="#10b981" name="Projected Cost (₱)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Vehicle Usage Analytics Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon icon="material-symbols:analytics" className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Vehicle Usage Analytics</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Usage Threshold:</span>
            <Select value={usageThreshold} onValueChange={setUsageThreshold}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Usage Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Usage Score</CardTitle>
              <Icon icon="material-symbols:speed" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.usageAnalytics?.averageUsageScore || 0}/100</div>
              <p className="text-xs text-muted-foreground">Fleet wide average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Usage Vehicles</CardTitle>
              <Icon icon="material-symbols:trending-up" className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.usageAnalytics?.highUsageVehicles?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Above {thresholdConfigs[usageThreshold].high} score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Usage Vehicles</CardTitle>
              <Icon icon="material-symbols:trending-down" className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.usageAnalytics?.lowUsageVehicles?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Below {thresholdConfigs[usageThreshold].low} score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
              <Icon icon="material-symbols:person-play" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.usageAnalytics?.driverUsage?.length || 0}</div>
              <p className="text-xs text-muted-foreground">With assigned vehicles</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Tables */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* High Usage Vehicles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icon icon="material-symbols:trending-up" className="h-5 w-5 text-green-500" />
                <span>High Usage Vehicles</span>
              </CardTitle>
              <CardDescription>Vehicles with high activity and utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                {data.usageAnalytics?.highUsageVehicles?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plate</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Mileage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.usageAnalytics.highUsageVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                          <TableCell>{vehicle.truckType}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-green-600">{vehicle.usageScore}</span>
                              <Progress value={vehicle.usageScore} className="w-16 h-2" />
                            </div>
                          </TableCell>
                          <TableCell>{vehicle.totalMileage.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Icon icon="material-symbols:trending-up" className="w-8 h-8 mr-2" />
                    <span>No high usage vehicles</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Low Usage Vehicles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icon icon="material-symbols:trending-down" className="h-5 w-5 text-red-500" />
                <span>Low Usage Vehicles</span>
              </CardTitle>
              <CardDescription>Vehicles with minimal activity requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                {data.usageAnalytics?.lowUsageVehicles?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plate</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Days Idle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.usageAnalytics.lowUsageVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                          <TableCell>{vehicle.truckType}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-red-600">{vehicle.usageScore}</span>
                              <Progress value={vehicle.usageScore} className="w-16 h-2" />
                            </div>
                          </TableCell>
                          <TableCell>{vehicle.daysSinceLastActivity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Icon icon="material-symbols:trending-down" className="w-8 h-8 mr-2" />
                    <span>No low usage vehicles</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Driver Usage Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Icon icon="material-symbols:person-play" className="h-5 w-5" />
              <span>Driver Usage Patterns</span>
            </CardTitle>
            <CardDescription>Activity levels and performance by driver</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto">
              {data.usageAnalytics?.driverUsage?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicles</TableHead>
                      <TableHead>Avg Usage Score</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.usageAnalytics.driverUsage.map((driver, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{driver.driverName}</TableCell>
                        <TableCell>{driver.vehicleCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">{driver.averageUsageScore}</span>
                            <Progress value={driver.averageUsageScore} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver.averageUsageScore >= 70 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              High
                            </span>
                          ) : driver.averageUsageScore >= 40 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                              Medium
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                              Low
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Icon icon="material-symbols:person" className="w-8 h-8 mr-2" />
                  <span>No driver usage data available</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MPG Analytics Section */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Icon icon="material-symbols:eco" className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">MPG Performance Analytics</h3>
        </div>

        {/* MPG by Vehicle Type */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>MPG by Vehicle Type</CardTitle>
              <CardDescription>Average fuel efficiency across different vehicle types</CardDescription>
            </CardHeader>
            <CardContent>
              {data.mpgAnalytics?.byVehicleType?.length > 0 ? (
                <ChartContainer config={{
                  avgMPG: { label: "Average MPG", color: "hsl(var(--chart-1))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.mpgAnalytics.byVehicleType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="type"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        label={{ value: 'MPG', angle: -90, position: 'insideLeft' }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [value + " MPG", "Average MPG"]}
                      />
                      <Bar dataKey="avgMPG" fill="hsl(var(--chart-1))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <Icon icon="material-symbols:bar-chart" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No MPG data available</p>
                    <p className="text-xs">MPG data will appear when fuel records are available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>MPG Trends Over Time</CardTitle>
              <CardDescription>Historical fuel efficiency trends by vehicle type</CardDescription>
            </CardHeader>
            <CardContent>
              {data.mpgAnalytics?.trends?.length > 0 ? (
                <ChartContainer config={{
                  mpg: { label: "MPG", color: "hsl(var(--chart-2))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.mpgAnalytics.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        label={{ value: 'MPG', angle: -90, position: 'insideLeft' }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [value + " MPG", "Average MPG"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgMPG"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--chart-2))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <Icon icon="material-symbols:show-chart" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No trend data available</p>
                    <p className="text-xs">Trends will appear with historical fuel data</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top and Poor Performers */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icon icon="material-symbols:star" className="h-5 w-5 text-yellow-500" />
                <span>Top MPG Performers</span>
              </CardTitle>
              <CardDescription>Vehicles with the best fuel efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto">
                {data.mpgAnalytics?.topPerformers?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plate Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Avg MPG</TableHead>
                        <TableHead>Readings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.mpgAnalytics.topPerformers.map((vehicle) => (
                        <TableRow key={vehicle.truckId}>
                          <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                          <TableCell>{vehicle.truckType}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Icon icon="material-symbols:eco" className="w-4 h-4 text-green-500" />
                              <span className="font-bold text-green-600">{vehicle.avgMPG}</span>
                            </div>
                          </TableCell>
                          <TableCell>{vehicle.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Icon icon="material-symbols:star" className="w-8 h-8 mr-2" />
                    <span>No performance data available</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icon icon="material-symbols:priority-high" className="h-5 w-5 text-red-500" />
                <span>Poor MPG Performers</span>
              </CardTitle>
              <CardDescription>Vehicles requiring efficiency attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto">
                {data.mpgAnalytics?.poorPerformers?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plate Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Avg MPG</TableHead>
                        <TableHead>Readings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.mpgAnalytics.poorPerformers.map((vehicle) => (
                        <TableRow key={vehicle.truckId}>
                          <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                          <TableCell>{vehicle.truckType}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Icon icon="material-symbols:warning" className="w-4 h-4 text-red-500" />
                              <span className="font-bold text-red-600">{vehicle.avgMPG}</span>
                            </div>
                          </TableCell>
                          <TableCell>{vehicle.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Icon icon="material-symbols:priority-high" className="w-8 h-8 mr-2" />
                    <span>No poor performers identified</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vehicle Retirement & Upgrade Analytics Section */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Icon icon="material-symbols:schedule" className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Vehicle Retirement & Upgrade Projections</h3>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fleet Average Age</CardTitle>
              <Icon icon="material-symbols:calendar-today" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.retirementAnalytics?.summary?.averageAge || 0} years</div>
              <p className="text-xs text-muted-foreground">{data.retirementAnalytics?.summary?.totalVehicles || 0} total vehicles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attention Required</CardTitle>
              <Icon icon="material-symbols:warning" className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {data.retirementAnalytics?.summary?.vehiclesNeedingAttention || 0}
              </div>
              <p className="text-xs text-muted-foreground">Vehicles needing review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Retirements</CardTitle>
              <Icon icon="material-symbols:event-upcoming" className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {data.retirementAnalytics?.upcomingRetirements?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Next 3 years</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">5-Year Budget</CardTitle>
              <Icon icon="material-symbols:payments" className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(data.retirementAnalytics?.summary?.totalProjectedCost5Years || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Projected replacements</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Fleet Age Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Fleet Age Distribution</CardTitle>
              <CardDescription>Current age breakdown of the vehicle fleet</CardDescription>
            </CardHeader>
            <CardContent>
              {data.retirementAnalytics?.ageDistribution?.length > 0 ? (
                <ChartContainer config={{
                  count: { label: "Vehicle Count", color: "hsl(var(--chart-1))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.retirementAnalytics.ageDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="ageGroup"
                        tick={{ fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Vehicle Count', angle: -90, position: 'insideLeft' }}
                      />
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-md">
                                <div className="grid gap-1">
                                  <span className="text-sm font-semibold">{data.ageGroup}</span>
                                  <span className="text-sm">{data.count} vehicles ({data.percentage}%)</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <Icon icon="material-symbols:bar-chart" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No age distribution data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Retirement Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Retirement Timeline</CardTitle>
              <CardDescription>Projected vehicle retirements and replacement costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              {data.retirementAnalytics?.retirementTimeline?.length > 0 ? (
                <ChartContainer config={{
                  cost: { label: "Replacement Cost", color: "hsl(var(--chart-2))" },
                  count: { label: "Vehicle Count", color: "hsl(var(--chart-3))" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.retirementAnalytics.retirementTimeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="cost"
                        orientation="left"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`}
                      />
                      <YAxis
                        yAxisId="count"
                        orientation="right"
                        tick={{ fontSize: 10 }}
                      />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-3 shadow-md">
                                <div className="grid gap-1">
                                  <span className="text-sm font-semibold">Year {label}</span>
                                  <span className="text-sm">
                                    {payload.find(p => p.dataKey === 'count')?.value || 0} vehicles to retire
                                  </span>
                                  <span className="text-sm">
                                    Cost: {formatCurrency(payload.find(p => p.dataKey === 'totalReplacementCost')?.value || 0)}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        yAxisId="cost"
                        dataKey="totalReplacementCost"
                        fill="hsl(var(--chart-2))"
                        radius={4}
                        name="Replacement Cost"
                      />
                      <Line
                        yAxisId="count"
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--chart-3))", r: 4 }}
                        name="Vehicle Count"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <Icon icon="material-symbols:timeline" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No retirement timeline data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Maintenance Cost vs Age Scatter Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Cost vs Vehicle Age</CardTitle>
            <CardDescription>Correlation between vehicle age and maintenance expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {data.retirementAnalytics?.maintenanceVsAge?.length > 0 ? (
              <ChartContainer config={{
                maintenanceCost: { label: "Maintenance Cost", color: "hsl(var(--chart-4))" }
              }} className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.retirementAnalytics.maintenanceVsAge}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="vehicleAge"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Vehicle Age (Years)', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
                      label={{ value: 'Maintenance Cost', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-md">
                              <div className="grid gap-1">
                                <span className="text-sm font-semibold">{data.plateNumber}</span>
                                <span className="text-sm">Age: {label} years</span>
                                <span className="text-sm">
                                  Maintenance: {formatCurrency(data.maintenanceCost)}
                                </span>
                                <span className="text-sm">
                                  Retirement Score: {data.retirementScore}/100
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="maintenanceCost"
                      stroke="hsl(var(--chart-4))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-4))", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Icon icon="material-symbols:scatter-plot" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No maintenance vs age data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tables Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Retirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icon icon="material-symbols:event-upcoming" className="h-5 w-5 text-red-500" />
                <span>Upcoming Retirements</span>
              </CardTitle>
              <CardDescription>Vehicles requiring retirement within 3 years</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                {data.retirementAnalytics?.upcomingRetirements?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plate</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Years Left</TableHead>
                        <TableHead>Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.retirementAnalytics.upcomingRetirements.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                          <TableCell>{vehicle.vehicleAge} yrs</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              vehicle.yearsUntilRetirement <= 1
                                ? 'bg-red-100 text-red-800'
                                : vehicle.yearsUntilRetirement <= 2
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {vehicle.yearsUntilRetirement} years
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className={`font-bold ${
                                vehicle.retirementScore < 30 ? 'text-red-600' :
                                vehicle.retirementScore < 60 ? 'text-orange-600' :
                                'text-green-600'
                              }`}>
                                {vehicle.retirementScore}
                              </span>
                              <Progress value={vehicle.retirementScore} className="w-16 h-2" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Icon icon="material-symbols:check-circle" className="w-8 h-8 mr-2 text-green-500" />
                    <span>No immediate retirements needed</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Candidates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icon icon="material-symbols:upgrade" className="h-5 w-5 text-orange-500" />
                <span>Upgrade Candidates</span>
              </CardTitle>
              <CardDescription>Vehicles with poor performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                {data.retirementAnalytics?.upgradeCandidates?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plate</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Maint. Freq.</TableHead>
                        <TableHead>Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.retirementAnalytics.upgradeCandidates.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                          <TableCell>{vehicle.vehicleAge} yrs</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              vehicle.maintenanceFrequency > 5
                                ? 'bg-red-100 text-red-800'
                                : vehicle.maintenanceFrequency > 3
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {vehicle.maintenanceFrequency}x
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className={`font-bold ${
                                vehicle.retirementScore < 30 ? 'text-red-600' :
                                vehicle.retirementScore < 60 ? 'text-orange-600' :
                                'text-green-600'
                              }`}>
                                {vehicle.retirementScore}
                              </span>
                              <Progress value={vehicle.retirementScore} className="w-16 h-2" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Icon icon="material-symbols:check-circle" className="w-8 h-8 mr-2 text-green-500" />
                    <span>No upgrade candidates identified</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Icon icon="material-symbols:lightbulb" className="h-5 w-5 text-yellow-500" />
              <span>Strategic Recommendations</span>
            </CardTitle>
            <CardDescription>Data-driven insights for fleet optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.retirementAnalytics?.recommendations?.length > 0 ? (
                data.retirementAnalytics.recommendations.map((rec, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    rec.priority === 'high'
                      ? 'border-red-500 bg-red-50'
                      : rec.priority === 'medium'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <Icon
                        icon={
                          rec.type === 'urgent' ? 'material-symbols:warning' :
                          rec.type === 'upgrade' ? 'material-symbols:upgrade' :
                          rec.type === 'aging_fleet' ? 'material-symbols:schedule' :
                          'material-symbols:account-balance-wallet'
                        }
                        className={`w-5 h-5 mt-0.5 ${
                          rec.priority === 'high' ? 'text-red-600' :
                          rec.priority === 'medium' ? 'text-orange-600' :
                          'text-blue-600'
                        }`}
                      />
                      <div className="flex-1">
                        <h4 className={`font-semibold text-sm ${
                          rec.priority === 'high' ? 'text-red-800' :
                          rec.priority === 'medium' ? 'text-orange-800' :
                          'text-blue-800'
                        }`}>
                          {rec.title}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          rec.priority === 'high' ? 'text-red-700' :
                          rec.priority === 'medium' ? 'text-orange-700' :
                          'text-blue-700'
                        }`}>
                          {rec.description}
                        </p>
                        <p className={`text-xs mt-2 font-medium ${
                          rec.priority === 'high' ? 'text-red-600' :
                          rec.priority === 'medium' ? 'text-orange-600' :
                          'text-blue-600'
                        }`}>
                          Action: {rec.action}
                        </p>
                        {rec.vehicles.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground">Affected vehicles: </span>
                            <span className="text-xs font-medium">
                              {rec.vehicles.join(', ')}
                              {rec.vehicles.length < 3 && ' ...'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Icon icon="material-symbols:check-circle" className="w-8 h-8 mr-2 text-green-500" />
                  <span>No specific recommendations at this time</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip Analytics Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight mb-1">Trip Analytics</h3>
          <p className="text-muted-foreground">Delivery performance and trip details summary</p>
        </div>

        {/* Trip Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
              <Icon icon="material-symbols:route" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.tripAnalytics.totalTrips}</div>
              <p className="text-xs text-muted-foreground">
                {data.tripAnalytics.completedTrips} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
              <Icon icon="material-symbols:straighten" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.tripAnalytics.totalDistance.toLocaleString()} mi</div>
              <p className="text-xs text-muted-foreground">
                Avg: {data.tripAnalytics.avgDistance} mi/trip
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Icon icon="material-symbols:schedule" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.tripAnalytics.avgTripDuration} min</div>
              <p className="text-xs text-muted-foreground">
                {data.tripAnalytics.ongoingTrips} ongoing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
              <Icon icon="material-symbols:check-circle" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.tripAnalytics.onTimeDeliveryRate}%</div>
              <p className="text-xs text-muted-foreground">
                Delivery performance
              </p>
            </CardContent>
          </Card>
        </div>



        {/* Trip Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Trip Details</CardTitle>
            <CardDescription>
              Latest trips with origin, destination, duration, mileage, vehicle, and driver information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip ID</TableHead>
                    <TableHead>Origin → Destination</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tripAnalytics.recentTrips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">{trip.id}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Icon icon="material-symbols:location-on" className="h-3 w-3 mr-1 text-green-500" />
                            <span className="text-xs">{trip.origin}</span>
                          </div>
                          <div className="flex items-center">
                            <Icon icon="material-symbols:flag" className="h-3 w-3 mr-1 text-red-500" />
                            <span className="text-xs">{trip.destination}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{trip.plateNumber}</TableCell>
                      <TableCell>{trip.driverName}</TableCell>
                      <TableCell>{trip.distance} mi</TableCell>
                      <TableCell>
                        {trip.duration ? `${trip.duration} min` : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          trip.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : trip.status === 'ongoing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {trip.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {trip.deliveryStatus === 'pending' ? (
                          <span className="text-xs text-muted-foreground">Scheduled: {format(new Date(trip.scheduledDelivery), 'HH:mm')}</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-xs">Actual: {format(new Date(trip.actualDelivery), 'HH:mm')}</div>
                            <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${
                              trip.deliveryStatus === 'early'
                                ? 'bg-green-100 text-green-700'
                                : trip.deliveryStatus === 'on_time'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {trip.deliveryStatus === 'on_time' ? 'On Time' : trip.deliveryStatus}
                            </span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Driver and Vehicle Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Driver Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Driver Performance</CardTitle>
              <CardDescription>Trip counts and on-time delivery rates by driver</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.tripAnalytics.tripsByDriver.map((driver) => (
                  <div key={driver.driverName} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{driver.driverName}</div>
                      <div className="text-sm text-muted-foreground">
                        {driver.totalTrips} trips • {driver.totalDistance} mi total
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm font-medium">{driver.onTimeRate}% on-time</div>
                      <div className="text-xs text-muted-foreground">
                        Avg: {driver.avgDistance} mi/trip
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Utilization */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Utilization</CardTitle>
              <CardDescription>Trip utilization and distance by vehicle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.tripAnalytics.tripsByVehicle.map((vehicle) => (
                  <div key={vehicle.plateNumber} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{vehicle.plateNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {vehicle.totalTrips} trips • {vehicle.totalDistance} mi
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Utilization</span>
                        <span>{vehicle.utilization}%</span>
                      </div>
                      <Progress value={vehicle.utilization} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fuel Logs Section - Moved to bottom */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Fuel Logs</CardTitle>
          <CardDescription>
            Latest 20 fuel entries across the fleet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <div className="grid grid-cols-3 gap-4 pb-2 border-b font-medium text-sm text-muted-foreground">
              <div>Truck Plate</div>
              <div>Fuel Amount (ltr)</div>
              <div>Date</div>
            </div>
            <div className="space-y-2 mt-2">
              {data.fuelLogs.recentEntries.length > 0 ? (
                data.fuelLogs.recentEntries.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-3 gap-4 py-2 border-b border-border/50 text-sm">
                    <div className="font-medium">{entry.truckPlate}</div>
                    <div>{entry.fuelAmount.toFixed(1)}</div>
                    <div className="text-muted-foreground">{entry.formattedDate}</div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Icon icon="material-symbols:local-gas-station" className="w-8 h-8 mr-2" />
                  <span>No fuel logs found</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
