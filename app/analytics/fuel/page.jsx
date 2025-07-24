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
    fuel: { totalCost: 0, totalLiters: 0, avgMPG: 0, costPerMile: 0 },
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
        expand: 'truck_id,truck_id.users_id',
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
          sum + ((record.fuel_amount || 0) * (record.fuel_price || 0)), 0);
        const totalLiters = fuelRecords.reduce((sum, record) =>
          sum + (record.fuel_amount || 0), 0);

        // Calculate overall fleet MPG more accurately
        let totalDistance = 0;
        let totalFuelForDistance = 0;

        // Group by truck and calculate distances
        const truckGroups = {};
        fuelRecords.forEach(record => {
          if (!truckGroups[record.truck_id]) {
            truckGroups[record.truck_id] = [];
          }
          truckGroups[record.truck_id].push(record);
        });

        // Calculate distances for each truck
        Object.values(truckGroups).forEach(truckRecords => {
          const sortedRecords = truckRecords
            .filter(r => r.odometer_reading && r.fuel_amount)
            .sort((a, b) => new Date(a.created) - new Date(b.created));

          for (let i = 1; i < sortedRecords.length; i++) {
            const current = sortedRecords[i];
            const previous = sortedRecords[i - 1];

            const distance = current.odometer_reading - previous.odometer_reading;
            if (distance > 1 && distance < 2000) { // Reasonable distance range
              totalDistance += distance;
              totalFuelForDistance += current.fuel_amount;
            }
          }
        });

        // Calculate fleet average MPG (km/L to MPG conversion)
        const avgMPG = totalFuelForDistance > 0 ? (totalDistance / totalFuelForDistance) * 2.35 : 0;
        const costPerMile = totalDistance > 0 ? totalCost / (totalDistance * 0.621371) : 0; // Convert km to miles

        return {
          totalCost,
          totalLiters,
          avgMPG,
          costPerMile
        };
      };

      // Process fuel trends
      const processFuelTrends = () => {
        if (fuelRecords.length === 0) {
          // Generate some sample data for the last 6 months if no records exist
          const months = [];
          for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            months.push({
              month: format(date, 'yyyy-MM'),
              monthLabel: format(date, 'MMM yyyy'),
              cost: 0,
              liters: 0,
              transactions: 0
            });
          }
          return months;
        }

        const monthlyData = {};

        fuelRecords.forEach(record => {
          const recordDate = new Date(record.created);
          const monthKey = format(recordDate, 'yyyy-MM');
          const monthLabel = format(recordDate, 'MMM yyyy');

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: monthKey,
              monthLabel: monthLabel,
              cost: 0,
              liters: 0,
              transactions: 0
            };
          }

          const cost = (record.fuel_amount || 0) * (record.fuel_price || 0);
          monthlyData[monthKey].cost += cost;
          monthlyData[monthKey].liters += (record.fuel_amount || 0);
          monthlyData[monthKey].transactions++;
        });

        // Get the last 12 months of data, fill missing months with 0
        const result = [];
        for (let i = 11; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const monthKey = format(date, 'yyyy-MM');
          const monthLabel = format(date, 'MMM yyyy');

          if (monthlyData[monthKey]) {
            result.push(monthlyData[monthKey]);
          } else {
            result.push({
              month: monthKey,
              monthLabel: monthLabel,
              cost: 0,
              liters: 0,
              transactions: 0
            });
          }
        }

        return result;
      };

      // Process MPG analytics
      const processMPGAnalytics = () => {
        const vehicleTypes = {};
        const allTruckData = [];

        trucks.forEach(truck => {
          const truckFuelRecords = fuelRecords
            .filter(r => r.truck_id === truck.id)
            .sort((a, b) => new Date(a.created) - new Date(b.created));

          if (truckFuelRecords.length > 1) {
            let totalDistance = 0;
            let totalFuel = 0;
            let validCalculations = 0;

            for (let i = 1; i < truckFuelRecords.length; i++) {
              const currentRecord = truckFuelRecords[i];
              const prevRecord = truckFuelRecords[i - 1];

              if (currentRecord.odometer_reading && prevRecord.odometer_reading && currentRecord.fuel_amount) {
                const distance = currentRecord.odometer_reading - prevRecord.odometer_reading;

                // Only consider reasonable distances (between 1km and 2000km)
                if (distance > 1 && distance < 2000) {
                  totalDistance += distance;
                  totalFuel += currentRecord.fuel_amount;
                  validCalculations++;
                }
              }
            }

            if (validCalculations > 0 && totalFuel > 0) {
              // Calculate km per liter
              const kmPerLiter = totalDistance / totalFuel;
              // Convert to MPG (1 km/L ≈ 2.35 MPG)
              const avgMPG = kmPerLiter * 2.35;

              const truckData = {
                truckId: truck.id,
                plateNumber: truck.plate_number || 'Unknown',
                truckType: truck.truck_type || 'Unknown',
                avgMPG: avgMPG
              };

              allTruckData.push(truckData);

              // Group by vehicle type
              const truckType = truck.truck_type || 'Unknown';
              if (!vehicleTypes[truckType]) {
                vehicleTypes[truckType] = {
                  type: truckType,
                  totalMPG: 0,
                  count: 0,
                  avgMPG: 0
                };
              }

              vehicleTypes[truckType].totalMPG += avgMPG;
              vehicleTypes[truckType].count++;
              vehicleTypes[truckType].avgMPG =
                vehicleTypes[truckType].totalMPG / vehicleTypes[truckType].count;
            }
          }
        });

        // Sort all trucks by MPG and categorize
        const sortedTrucks = allTruckData.sort((a, b) => b.avgMPG - a.avgMPG);
        const topPerformers = sortedTrucks.slice(0, 5);
        const poorPerformers = sortedTrucks.slice(-5).reverse();

        return {
          byVehicleType: Object.values(vehicleTypes),
          topPerformers: topPerformers,
          poorPerformers: poorPerformers
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
          costProjection: {
            today: avgDailyConsumption * avgFuelPrice,
            thisMonth: avgDailyConsumption * 30 * avgFuelPrice,
            thisYear: avgDailyConsumption * 365 * avgFuelPrice,
            nextYear: avgDailyConsumption * 365 * avgFuelPrice * 1.05
          }
        };
      };

      const fuelData = processFuelData();
      const fuelTrends = processFuelTrends();
      const mpgAnalytics = processMPGAnalytics();
      const forecasting = processForecasting();

      // Debug logging
      console.log('Fuel Records:', fuelRecords.length);
      console.log('Trucks:', trucks.length);
      console.log('MPG Analytics:', mpgAnalytics);
      console.log('Fuel Trends:', fuelTrends);

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
          recentEntries: fuelRecords.slice(0, 25) // Show more records
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
              {data.fuel.totalLiters.toFixed(1)} liters consumed
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
            <CardTitle className="text-sm font-medium">Daily Consumption</CardTitle>
            <Icon icon="mdi:trending-up" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.forecasting.fuelConsumption.dailyAverage.toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              Fleet average per day
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
              {data.charts.fuelTrend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.fuelTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="liters"
                      stroke="var(--color-fuel)"
                      strokeWidth={2}
                      name="Fuel (L)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p>No fuel trend data available</p>
                    <p className="text-sm">Add fuel records to see consumption trends</p>
                  </div>
                </div>
              )}
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
              {data.mpgAnalytics.byVehicleType?.length > 0 ? (
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
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="avgMPG"
                      fill="var(--color-mpg)"
                      name="Average MPG"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p>No MPG data available</p>
                    <p className="text-sm">Fuel records with odometer readings are needed</p>
                  </div>
                </div>
              )}
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Forecasting */}
      <Card>
        <CardHeader>
          <CardTitle>Fuel Consumption Forecasting</CardTitle>
          <CardDescription>Consumption predictions based on historical data and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold">Consumption Forecast</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Today:</span>
                  <span>{data.forecasting.fuelConsumption.predictedToday.toFixed(1)} L</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>This Month:</span>
                  <span>{data.forecasting.fuelConsumption.predictedThisMonth.toFixed(0)} L</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>This Year:</span>
                  <span>{data.forecasting.fuelConsumption.predictedThisYear.toFixed(0)} L</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Daily Average:</span>
                  <span>{data.forecasting.fuelConsumption.dailyAverage.toFixed(1)} L</span>
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
                <div className="flex justify-between text-sm">
                  <span>Trend:</span>
                  <span className={`capitalize ${data.forecasting.fuelConsumption.trend === 'increasing' ? 'text-red-600' : 'text-green-600'}`}>
                    {data.forecasting.fuelConsumption.trend}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fuel Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fuel Records</CardTitle>
          <CardDescription>Detailed list of all fuel transactions with truck and driver information</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Truck Plate</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Fuel Amount</TableHead>
                    <TableHead className="text-right">Price per Liter</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Odometer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.fuelLogs.recentEntries?.length ? (
                    data.fuelLogs.recentEntries.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {new Date(record.created).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.expand?.truck_id?.plate_number || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {record.expand?.truck_id?.expand?.users_id?.username || 'Unassigned'}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.fuel_amount?.toFixed(2) || '0.00'} L
                        </TableCell>
                        <TableCell className="text-right">
                          ${record.fuel_price?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${((record.fuel_amount || 0) * (record.fuel_price || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.odometer_reading?.toLocaleString() || 'N/A'} km
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No fuel records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
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
                {data.mpgAnalytics.topPerformers?.length > 0 ? (
                  data.mpgAnalytics.topPerformers.map((truck, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{truck.plateNumber}</TableCell>
                      <TableCell>{truck.truckType}</TableCell>
                      <TableCell className="text-green-600">{truck.avgMPG.toFixed(1)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No performance data available. Need more fuel records with odometer readings.
                    </TableCell>
                  </TableRow>
                )}
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
                {data.mpgAnalytics.poorPerformers?.length > 0 ? (
                  data.mpgAnalytics.poorPerformers.map((truck, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{truck.plateNumber}</TableCell>
                      <TableCell>{truck.truckType}</TableCell>
                      <TableCell className="text-red-600">{truck.avgMPG.toFixed(1)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No performance data available. Need more fuel records with odometer readings.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FuelAnalytics;
