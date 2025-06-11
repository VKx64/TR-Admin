"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Icon } from '@iconify/react';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';
import pb from '@/services/pocketbase';

const Dashboard = () => {  const [data, setData] = useState({
    fleet: { total: 0, assigned: 0, utilization: 0 },
    maintenance: { totalCost: 0, pendingRequests: 0, completionRate: 0, avgDays: 0 },
    fuel: { totalCost: 0, totalGallons: 0, avgMPG: 0, costPerMile: 0 },
    financial: { totalOperating: 0, costPerTruck: 0 },
    charts: {
      maintenanceTrend: [],
      fuelTrend: []
    },
    fuelLogs: {
      recentEntries: []
    },
    forecasting: {
      fuelConsumption: {
        predicted30Days: 0,
        predicted60Days: 0,
        predicted90Days: 0,
        trend: 'increasing', // 'increasing', 'decreasing', 'stable'
        confidence: 0,
        monthlyAverage: 0
      },
      fuelPrice: {
        predicted30Days: 0,
        predicted60Days: 0,
        predicted90Days: 0,
        trend: 'increasing',
        confidence: 0,
        currentAvgPrice: 0
      },
      costProjection: {
        next30Days: 0,
        next60Days: 0,
        next90Days: 0
      }
    }
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Get current month date range
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const fetchAnalyticsData = async () => {
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
      const totalGallons = fuelRecords.reduce((sum, record) => sum + (record.fuel_amount || 0), 0);

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
        // Get 6 months of fuel consumption data for trend analysis
        const fuelConsumptionHistory = historicalFuel.map(item => ({
          month: item.month,
          consumption: fuelRecords.filter(record => {
            const recordDate = new Date(record.created);
            const [monthName, year] = item.month.split(' ');
            const itemDate = new Date(`${monthName} 1, ${year}`);
            return recordDate.getMonth() === itemDate.getMonth() &&
                   recordDate.getFullYear() === itemDate.getFullYear();
          }).reduce((sum, record) => sum + (record.fuel_amount || 0), 0)
        }));

        // Calculate average monthly consumption
        const monthlyConsumption = fuelConsumptionHistory.map(item => item.consumption);
        const avgMonthlyConsumption = monthlyConsumption.length > 0 ?
          monthlyConsumption.reduce((sum, val) => sum + val, 0) / monthlyConsumption.length : 0;

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

        // Forecast fuel consumption for 30, 60, 90 days
        const forecastConsumption = (days) => {
          const monthlyFactor = days / 30;
          const trendAdjustment = consumptionSlope * monthlyFactor;
          return Math.max(0, avgMonthlyConsumption * monthlyFactor + trendAdjustment);
        };

        // Calculate fuel price trends
        const fuelPriceHistory = fuelRecords
          .filter(record => record.fuel_price && record.fuel_price > 0)
          .sort((a, b) => new Date(a.created) - new Date(b.created));

        let avgFuelPrice = 0;
        let priceTrend = 'stable';
        let priceSlope = 0;

        if (fuelPriceHistory.length > 0) {
          avgFuelPrice = fuelPriceHistory.reduce((sum, record) => sum + record.fuel_price, 0) / fuelPriceHistory.length;

          // Calculate price trend using recent vs older prices
          if (fuelPriceHistory.length >= 6) {
            const recentPrices = fuelPriceHistory.slice(-Math.floor(fuelPriceHistory.length / 3));
            const olderPrices = fuelPriceHistory.slice(0, Math.floor(fuelPriceHistory.length / 3));

            const recentAvgPrice = recentPrices.reduce((sum, r) => sum + r.fuel_price, 0) / recentPrices.length;
            const olderAvgPrice = olderPrices.reduce((sum, r) => sum + r.fuel_price, 0) / olderPrices.length;

            priceSlope = (recentAvgPrice - olderAvgPrice) / Math.floor(fuelPriceHistory.length / 3);

            if (priceSlope > avgFuelPrice * 0.02) {
              priceTrend = 'increasing';
            } else if (priceSlope < -avgFuelPrice * 0.02) {
              priceTrend = 'decreasing';
            }
          }
        }

        // Forecast fuel prices for 30, 60, 90 days
        const forecastPrice = (days) => {
          const monthlyFactor = days / 30;
          const trendAdjustment = priceSlope * monthlyFactor;
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
        const priceConfidence = fuelPriceHistory.length > 0 ?
          calculateConfidence(fuelPriceHistory.map(r => r.fuel_price)) : 50;

        return {
          fuelConsumption: {
            predicted30Days: Math.round(forecastConsumption(30)),
            predicted60Days: Math.round(forecastConsumption(60)),
            predicted90Days: Math.round(forecastConsumption(90)),
            trend: consumptionTrend,
            confidence: Math.round(consumptionConfidence),
            monthlyAverage: Math.round(avgMonthlyConsumption)
          },
          fuelPrice: {
            predicted30Days: Math.round(forecastPrice(30) * 100) / 100,
            predicted60Days: Math.round(forecastPrice(60) * 100) / 100,
            predicted90Days: Math.round(forecastPrice(90) * 100) / 100,
            trend: priceTrend,
            confidence: Math.round(priceConfidence),
            currentAvgPrice: Math.round(avgFuelPrice * 100) / 100
          },
          costProjection: {
            next30Days: Math.round(forecastConsumption(30) * forecastPrice(30)),
            next60Days: Math.round(forecastConsumption(60) * forecastPrice(60)),
            next90Days: Math.round(forecastConsumption(90) * forecastPrice(90))
          }
        };
      };

      const forecastingData = calculateForecasting();      setData({
        fleet: {
          total: totalTrucks,
          assigned: assignedTrucks,
          utilization: Math.round(utilizationRate)
        },
        maintenance: {
          totalCost: totalMaintenanceCost,
          pendingRequests,
          completionRate: Math.round(completionRate),
          avgDays: Math.round(avgCompletionDays)
        },
        fuel: {
          totalCost: totalFuelCost,
          totalGallons: Math.round(totalGallons),
          avgMPG: Math.round(avgMPG * 10) / 10,
          costPerMile: Math.round(avgCostPerMile * 100) / 100
        },
        financial: {
          totalOperating: totalOperatingCost,
          costPerTruck: Math.round(costPerTruck)
        },
        charts: {
          maintenanceTrend: historicalMaintenance,
          fuelTrend: historicalFuel
        },
        fuelLogs: {
          recentEntries: recentFuelEntries
        },
        forecasting: forecastingData
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);
  const chartConfig = {
    maintenance: {
      label: "Maintenance",
      color: "hsl(var(--chart-1))"
    },
    fuel: {
      label: "Fuel",
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
      <div className="grid gap-4 md:grid-cols-2">
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
              {data.fuel.totalGallons} gallons • {formatCurrency(data.fuel.totalCost)}
            </p>
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

      {/* Fuel Forecasting Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Icon icon="material-symbols:trending-up" className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Fuel Consumption & Price Forecasting</h3>
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
                Predicted fuel consumption based on historical trends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Monthly Average</span>
                <span className="font-medium">{data.forecasting.fuelConsumption.monthlyAverage} L</span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Next 30 days</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{data.forecasting.fuelConsumption.predicted30Days} L</span>
                    <Icon
                      icon={data.forecasting.fuelConsumption.trend === 'increasing' ? 'material-symbols:trending-up' :
                            data.forecasting.fuelConsumption.trend === 'decreasing' ? 'material-symbols:trending-down' :
                            'material-symbols:trending-flat'}
                      className={`h-4 w-4 ${
                        data.forecasting.fuelConsumption.trend === 'increasing' ? 'text-red-500' :
                        data.forecasting.fuelConsumption.trend === 'decreasing' ? 'text-green-500' :
                        'text-gray-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next 60 days</span>
                  <span className="font-medium">{data.forecasting.fuelConsumption.predicted60Days} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next 90 days</span>
                  <span className="font-medium">{data.forecasting.fuelConsumption.predicted90Days} L</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Forecast Confidence</span>
                  <span className="font-medium">{data.forecasting.fuelConsumption.confidence}%</span>
                </div>
                <Progress value={data.forecasting.fuelConsumption.confidence} className="mt-1 h-2" />
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
                Predicted fuel price trends based on historical data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Average Price</span>
                <span className="font-medium">₱{data.forecasting.fuelPrice.currentAvgPrice}/L</span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Next 30 days</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">₱{data.forecasting.fuelPrice.predicted30Days}/L</span>
                    <Icon
                      icon={data.forecasting.fuelPrice.trend === 'increasing' ? 'material-symbols:trending-up' :
                            data.forecasting.fuelPrice.trend === 'decreasing' ? 'material-symbols:trending-down' :
                            'material-symbols:trending-flat'}
                      className={`h-4 w-4 ${
                        data.forecasting.fuelPrice.trend === 'increasing' ? 'text-red-500' :
                        data.forecasting.fuelPrice.trend === 'decreasing' ? 'text-green-500' :
                        'text-gray-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next 60 days</span>
                  <span className="font-medium">₱{data.forecasting.fuelPrice.predicted60Days}/L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next 90 days</span>
                  <span className="font-medium">₱{data.forecasting.fuelPrice.predicted90Days}/L</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Forecast Confidence</span>
                  <span className="font-medium">{data.forecasting.fuelPrice.confidence}%</span>
                </div>
                <Progress value={data.forecasting.fuelPrice.confidence} className="mt-1 h-2" />
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
              Estimated total fuel costs based on consumption and price forecasts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">30 Days</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(data.forecasting.costProjection.next30Days)}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">60 Days</div>
                <div className="text-xl font-bold text-orange-600">
                  {formatCurrency(data.forecasting.costProjection.next60Days)}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">90 Days</div>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(data.forecasting.costProjection.next90Days)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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