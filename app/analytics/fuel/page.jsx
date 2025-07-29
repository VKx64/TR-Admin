"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icon } from '@iconify/react';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';
import pb from '@/services/pocketbase';
import FuelConsumptionTrend from './FuelConsumptionTrend';
import FuelCostTrendChart from '@/components/analytics/FuelCostTrendChart';
import FuelConsumptionByTruckChart from '@/components/analytics/FuelConsumptionByTruckChart';
import MonthlyFuelExpenseChart from '@/components/analytics/MonthlyFuelExpenseChart';
import FuelAnalyticsSummary from '@/components/analytics/FuelAnalyticsSummary';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const FuelAnalytics = () => {
  const [data, setData] = useState({
    fuel: { totalCost: 0, totalLiters: 0, avgMPG: 0, costPerMile: 0 },
    charts: {
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
      poorPerformers: []
    }
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState('all');
  const [trucks, setTrucks] = useState([]);

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

      // Store trucks in state for the dropdown
      setTrucks(trucks);

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
        const poorPerformers = sortedTrucks.slice(-5).reverse();

        return {
          byVehicleType: Object.values(vehicleTypes),
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
      const mpgAnalytics = processMPGAnalytics();
      const forecasting = processForecasting();

      // Debug logging
      console.log('Fuel Records:', fuelRecords.length);
      console.log('Trucks:', trucks.length);
      console.log('MPG Analytics:', mpgAnalytics);

      setData({
        fuel: fuelData,
        charts: {
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
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Chart.js options for MPG by Vehicle Type
  const mpgChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Average MPG: ${context.parsed.y.toFixed(1)}`;
          }
        }
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Vehicle Type'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'MPG'
        }
      }
    }
  };

  // Prepare data for Chart.js Bar chart
  const mpgChartData = {
    labels: data.mpgAnalytics.byVehicleType?.map(item => item.type) || [],
    datasets: [
      {
        label: 'Average MPG',
        data: data.mpgAnalytics.byVehicleType?.map(item => item.avgMPG) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
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
              {trucks?.map((truck) => (
                <SelectItem key={truck.id} value={truck.id}>
                  {truck.plate_number || `Truck ${truck.id.slice(-6)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchFuelAnalytics} variant="outline">
            <Icon icon="mdi:refresh" className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
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

      {/* Summary Section */}
      <FuelAnalyticsSummary />

      {/* Charts */}
      <div className="grid gap-6">
        {/* Primary trend chart */}
        <FuelConsumptionTrend selectedTruck={selectedTruck} />

        {/* Cost trend chart */}
        <FuelCostTrendChart selectedTruck={selectedTruck} height={350} />

        {/* Secondary charts grid */}
        <div className="grid gap-6 md:grid-cols-1">
          <FuelConsumptionByTruckChart height={400} />
        </div>

        {/* Monthly expense chart */}
        <MonthlyFuelExpenseChart height={400} />
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
                          ₱{record.fuel_price?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{((record.fuel_amount || 0) * (record.fuel_price || 0)).toFixed(2)}
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
    </div>
  );
};

export default FuelAnalytics;
