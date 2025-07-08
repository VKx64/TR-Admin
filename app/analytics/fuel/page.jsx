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
import pb from '@/services/pocketbase';

const FuelAnalytics = () => {
  const [data, setData] = useState({
    fuel: { totalCost: 0, totalGallons: 0, avgMPG: 0, costPerMile: 0 },
    charts: {
      fuelTrend: [],
      costBreakdown: []
    },
    fuelLogs: {
      recentEntries: []
    },
    forecasting: {
      fuelConsumption: {
        predictedToday: 0,
        predictedThisMonth: 0,
        predictedThisYear: 0,
        predictedNextYear: 0,
        trend: 'increasing',
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
      }
    },
    mpgAnalytics: {
      byVehicleType: [],
      trends: [],
      topPerformers: [],
      poorPerformers: []
    }
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState('all');

  const fetchFuelAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Get current month date range
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Fetch fuel records
      const fuelRecords = await pb.collection('truck_fuel').getFullList({
        expand: 'truck_id',
        sort: '-created',
        filter: selectedTruck !== 'all' ? `truck_id="${selectedTruck}"` : '',
        requestKey: null
      });

      // Fetch truck data
      const trucks = await pb.collection('trucks').getFullList({
        expand: 'users_id',
        requestKey: null
      });

      // Process fuel data
      const processFuelData = () => {
        const totalCost = fuelRecords.reduce((sum, record) =>
          sum + (record.fuel_amount * record.fuel_price), 0);
        const totalGallons = fuelRecords.reduce((sum, record) =>
          sum + record.fuel_amount, 0);

        // Calculate MPG
        let totalMPG = 0;
        let mpgCount = 0;

        fuelRecords.forEach(record => {
          if (record.odometer_reading) {
            // Find previous record for same truck
            const prevRecord = fuelRecords.find(r =>
              r.truck_id === record.truck_id &&
              r.created < record.created &&
              r.odometer_reading
            );

            if (prevRecord) {
              const distance = record.odometer_reading - prevRecord.odometer_reading;
              const mpg = distance / record.fuel_amount;
              if (mpg > 0 && mpg < 50) { // Reasonable MPG range
                totalMPG += mpg;
                mpgCount++;
              }
            }
          }
        });

        const avgMPG = mpgCount > 0 ? totalMPG / mpgCount : 0;
        const costPerMile = totalMPG > 0 ? totalCost / totalMPG : 0;

        return {
          totalCost,
          totalGallons,
          avgMPG,
          costPerMile
        };
      };

      // Process fuel trends
      const processFuelTrends = () => {
        const monthlyData = {};

        fuelRecords.forEach(record => {
          const month = format(new Date(record.created), 'yyyy-MM');
          if (!monthlyData[month]) {
            monthlyData[month] = {
              month,
              cost: 0,
              gallons: 0,
              transactions: 0
            };
          }

          monthlyData[month].cost += record.fuel_amount * record.fuel_price;
          monthlyData[month].gallons += record.fuel_amount;
          monthlyData[month].transactions++;
        });

        return Object.values(monthlyData)
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-12); // Last 12 months
      };

      // Process MPG analytics
      const processMPGAnalytics = () => {
        const vehicleTypes = {};
        const topPerformers = [];
        const poorPerformers = [];

        trucks.forEach(truck => {
          const truckFuelRecords = fuelRecords.filter(r => r.truck_id === truck.id);

          if (truckFuelRecords.length > 1) {
            let totalMPG = 0;
            let mpgCount = 0;

            truckFuelRecords.forEach(record => {
              if (record.odometer_reading) {
                const prevRecord = truckFuelRecords.find(r =>
                  r.created < record.created && r.odometer_reading
                );

                if (prevRecord) {
                  const distance = record.odometer_reading - prevRecord.odometer_reading;
                  const mpg = distance / record.fuel_amount;
                  if (mpg > 0 && mpg < 50) {
                    totalMPG += mpg;
                    mpgCount++;
                  }
                }
              }
            });

            if (mpgCount > 0) {
              const avgMPG = totalMPG / mpgCount;
              const truckData = {
                truckId: truck.id,
                plateNumber: truck.plate_number,
                truckType: truck.truck_type,
                avgMPG: avgMPG
              };

              // Group by vehicle type
              if (!vehicleTypes[truck.truck_type]) {
                vehicleTypes[truck.truck_type] = {
                  type: truck.truck_type,
                  totalMPG: 0,
                  count: 0,
                  avgMPG: 0
                };
              }

              vehicleTypes[truck.truck_type].totalMPG += avgMPG;
              vehicleTypes[truck.truck_type].count++;
              vehicleTypes[truck.truck_type].avgMPG =
                vehicleTypes[truck.truck_type].totalMPG / vehicleTypes[truck.truck_type].count;

              // Add to performers arrays
              if (avgMPG > 15) {
                topPerformers.push(truckData);
              } else if (avgMPG < 8) {
                poorPerformers.push(truckData);
              }
            }
          }
        });

        return {
          byVehicleType: Object.values(vehicleTypes),
          topPerformers: topPerformers.sort((a, b) => b.avgMPG - a.avgMPG).slice(0, 5),
          poorPerformers: poorPerformers.sort((a, b) => a.avgMPG - b.avgMPG).slice(0, 5)
        };
      };

      // Process forecasting
      const processForecasting = () => {
        const recentRecords = fuelRecords.slice(0, 30); // Last 30 records
        const avgDailyConsumption = recentRecords.reduce((sum, r) => sum + r.fuel_amount, 0) / 30;
        const avgFuelPrice = recentRecords.reduce((sum, r) => sum + r.fuel_price, 0) / recentRecords.length;

        return {
          fuelConsumption: {
            predictedToday: avgDailyConsumption,
            predictedThisMonth: avgDailyConsumption * 30,
            predictedThisYear: avgDailyConsumption * 365,
            predictedNextYear: avgDailyConsumption * 365 * 1.05, // 5% growth
            trend: 'increasing',
            confidence: 0.75,
            dailyAverage: avgDailyConsumption
          },
          fuelPrice: {
            predictedToday: avgFuelPrice,
            predictedThisMonth: avgFuelPrice * 1.02,
            predictedThisYear: avgFuelPrice * 1.08,
            predictedNextYear: avgFuelPrice * 1.15,
            trend: 'increasing',
            confidence: 0.65,
            currentAvgPrice: avgFuelPrice
          },
          costProjection: {
            today: avgDailyConsumption * avgFuelPrice,
            thisMonth: avgDailyConsumption * 30 * avgFuelPrice * 1.02,
            thisYear: avgDailyConsumption * 365 * avgFuelPrice * 1.08,
            nextYear: avgDailyConsumption * 365 * avgFuelPrice * 1.15
          }
        };
      };

      const fuelData = processFuelData();
      const fuelTrends = processFuelTrends();
      const mpgAnalytics = processMPGAnalytics();
      const forecasting = processForecasting();

      setData({
        fuel: fuelData,
        charts: {
          fuelTrend: fuelTrends,
          costBreakdown: [
            { name: 'Fuel', value: fuelData.totalCost, fill: '#3b82f6' },
            { name: 'Other', value: fuelData.totalCost * 0.1, fill: '#ef4444' }
          ]
        },
        fuelLogs: {
          recentEntries: fuelRecords.slice(0, 10)
        },
        forecasting,
        mpgAnalytics
      });

      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching fuel analytics:', error);
      setLoading(false);
    }
  }, [selectedTruck]);

  useEffect(() => {
    fetchFuelAnalytics();
  }, [fetchFuelAnalytics]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const chartConfig = {
    fuel: {
      label: "Fuel",
      color: "hsl(var(--chart-2))"
    },
    cost: {
      label: "Cost",
      color: "hsl(var(--chart-1))"
    },
    mpg: {
      label: "MPG",
      color: "hsl(var(--chart-3))"
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading fuel analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fuel Analytics</h1>
          <p className="text-muted-foreground">
            Monitor fuel consumption, costs, and efficiency across your fleet
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedTruck} onValueChange={setSelectedTruck}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select truck" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trucks</SelectItem>
              {/* Add truck options here */}
            </SelectContent>
          </Select>
          <Button onClick={fetchFuelAnalytics} variant="outline">
            <Icon icon="mdi:refresh" className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fuel Cost</CardTitle>
            <Icon icon="mdi:currency-usd" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.fuel.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              {data.fuel.totalGallons.toFixed(1)} gallons consumed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average MPG</CardTitle>
            <Icon icon="mdi:gas-station" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.fuel.avgMPG.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Fleet average efficiency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Per Mile</CardTitle>
            <Icon icon="mdi:road" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.fuel.costPerMile.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average operating cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predicted Monthly Cost</CardTitle>
            <Icon icon="mdi:trending-up" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.forecasting.costProjection.thisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Based on current trends
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fuel Consumption Trend</CardTitle>
            <CardDescription>Monthly fuel usage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.fuelTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="gallons" stroke="var(--color-fuel)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MPG by Vehicle Type</CardTitle>
            <CardDescription>Fuel efficiency comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.mpgAnalytics.byVehicleType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgMPG" fill="var(--color-mpg)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Forecasting */}
      <Card>
        <CardHeader>
          <CardTitle>Fuel Forecasting</CardTitle>
          <CardDescription>Predictions based on historical data and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-semibold">Consumption Forecast</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Today:</span>
                  <span>{data.forecasting.fuelConsumption.predictedToday.toFixed(1)} gal</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>This Month:</span>
                  <span>{data.forecasting.fuelConsumption.predictedThisMonth.toFixed(0)} gal</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>This Year:</span>
                  <span>{data.forecasting.fuelConsumption.predictedThisYear.toFixed(0)} gal</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Price Forecast</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Current Avg:</span>
                  <span>${data.forecasting.fuelPrice.currentAvgPrice.toFixed(2)}/gal</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Next Month:</span>
                  <span>${data.forecasting.fuelPrice.predictedThisMonth.toFixed(2)}/gal</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Next Year:</span>
                  <span>${data.forecasting.fuelPrice.predictedNextYear.toFixed(2)}/gal</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Cost Projection</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Today:</span>
                  <span>{formatCurrency(data.forecasting.costProjection.today)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>This Month:</span>
                  <span>{formatCurrency(data.forecasting.costProjection.thisMonth)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>This Year:</span>
                  <span>{formatCurrency(data.forecasting.costProjection.thisYear)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Fuel Performers</CardTitle>
            <CardDescription>Vehicles with highest fuel efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>MPG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.mpgAnalytics.topPerformers.map((truck, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{truck.plateNumber}</TableCell>
                    <TableCell>{truck.truckType}</TableCell>
                    <TableCell>{truck.avgMPG.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poor Fuel Performers</CardTitle>
            <CardDescription>Vehicles needing efficiency improvements</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>MPG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.mpgAnalytics.poorPerformers.map((truck, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{truck.plateNumber}</TableCell>
                    <TableCell>{truck.truckType}</TableCell>
                    <TableCell className="text-red-600">{truck.avgMPG.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FuelAnalytics;
