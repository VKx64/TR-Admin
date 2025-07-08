"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area, AreaChart } from 'recharts';
import { Icon } from '@iconify/react';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import pb from '@/services/pocketbase';

const TripAnalytics = () => {
  const [data, setData] = useState({
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
      },
      routeEfficiency: [],
      peakHours: [],
      monthlyTrends: []
    }
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedTruck, setSelectedTruck] = useState('all');
  const [timeRange, setTimeRange] = useState('1month');

  const fetchTripAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      let startDate;
      switch (timeRange) {
        case '1week':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          startDate = subMonths(endDate, 1);
          break;
        case '3months':
          startDate = subMonths(endDate, 3);
          break;
        case '6months':
          startDate = subMonths(endDate, 6);
          break;
        default:
          startDate = subMonths(endDate, 1);
      }

      // Since we don't have a trips table, we'll simulate trip data based on fuel logs and GPS data
      const [fuelLogs, truckStats, trucks, drivers] = await Promise.all([
        pb.collection('truck_fuel').getFullList({
          expand: 'truck_id',
          filter: `created >= "${startDate.toISOString()}"${selectedTruck !== 'all' ? ` && truck_id="${selectedTruck}"` : ''}`,
          sort: '-created',
          requestKey: null
        }),
        pb.collection('truck_statistics').getFullList({
          filter: `created >= "${startDate.toISOString()}"`,
          sort: '-created',
          requestKey: null
        }),
        pb.collection('trucks').getFullList({
          expand: 'users_id',
          requestKey: null
        }),
        pb.collection('users').getFullList({
          filter: 'role="driver"',
          requestKey: null
        })
      ]);

      // Process trip data (simulated based on fuel logs and GPS data)
      const processTripData = () => {
        // Simulate trips based on fuel logs - each fuel log represents end of a trip
        const trips = [];

        fuelLogs.forEach((log, index) => {
          const truck = trucks.find(t => t.id === log.truck_id);
          const driver = truck?.expand?.users_id;

          if (truck && driver) {
            // Find previous fuel log for same truck to calculate trip distance
            const prevLog = fuelLogs.find(fl =>
              fl.truck_id === log.truck_id &&
              fl.created < log.created &&
              fl.odometer_reading
            );

            const distance = prevLog ? log.odometer_reading - prevLog.odometer_reading : 0;
            const duration = prevLog ? differenceInHours(new Date(log.created), new Date(prevLog.created)) : 0;

            // Simulate trip status and delivery performance
            const statuses = ['completed', 'ongoing', 'completed', 'completed', 'completed']; // 80% completion rate
            const deliveryPerf = ['onTime', 'early', 'late', 'onTime', 'onTime']; // 60% on-time

            trips.push({
              id: `trip-${index}`,
              truckId: log.truck_id,
              driverId: driver.id,
              driverName: driver.username,
              plateNumber: truck.plate_number,
              truckType: truck.truck_type,
              distance: distance > 0 ? distance : Math.random() * 200 + 50, // Random if no previous log
              duration: duration > 0 ? duration : Math.random() * 8 + 2, // Random if no previous log
              status: statuses[index % statuses.length],
              deliveryStatus: deliveryPerf[index % deliveryPerf.length],
              startTime: prevLog ? prevLog.created : log.created,
              endTime: log.created,
              fuelUsed: log.fuel_amount,
              cost: log.fuel_amount * log.fuel_price
            });
          }
        });

        return trips;
      };

      const trips = processTripData();

      // Calculate trip metrics
      const totalTrips = trips.length;
      const completedTrips = trips.filter(t => t.status === 'completed').length;
      const ongoingTrips = trips.filter(t => t.status === 'ongoing').length;
      const totalDistance = trips.reduce((sum, t) => sum + t.distance, 0);
      const totalDuration = trips.reduce((sum, t) => sum + t.duration, 0);
      const avgTripDuration = totalTrips > 0 ? totalDuration / totalTrips : 0;
      const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;

      // Calculate delivery performance
      const onTimeDeliveries = trips.filter(t => t.deliveryStatus === 'onTime').length;
      const earlyDeliveries = trips.filter(t => t.deliveryStatus === 'early').length;
      const lateDeliveries = trips.filter(t => t.deliveryStatus === 'late').length;
      const onTimeDeliveryRate = completedTrips > 0 ? (onTimeDeliveries / completedTrips) * 100 : 0;

      // Process trips by driver
      const tripsByDriver = {};
      trips.forEach(trip => {
        if (!tripsByDriver[trip.driverId]) {
          tripsByDriver[trip.driverId] = {
            driverId: trip.driverId,
            driverName: trip.driverName,
            totalTrips: 0,
            completedTrips: 0,
            totalDistance: 0,
            avgDistance: 0,
            onTimeRate: 0,
            onTimeCount: 0
          };
        }

        tripsByDriver[trip.driverId].totalTrips++;
        if (trip.status === 'completed') {
          tripsByDriver[trip.driverId].completedTrips++;
        }
        tripsByDriver[trip.driverId].totalDistance += trip.distance;
        if (trip.deliveryStatus === 'onTime') {
          tripsByDriver[trip.driverId].onTimeCount++;
        }
      });

      // Calculate averages for drivers
      Object.values(tripsByDriver).forEach(driver => {
        driver.avgDistance = driver.totalTrips > 0 ? driver.totalDistance / driver.totalTrips : 0;
        driver.onTimeRate = driver.completedTrips > 0 ? (driver.onTimeCount / driver.completedTrips) * 100 : 0;
      });

      // Process trips by vehicle
      const tripsByVehicle = {};
      trips.forEach(trip => {
        if (!tripsByVehicle[trip.truckId]) {
          tripsByVehicle[trip.truckId] = {
            truckId: trip.truckId,
            plateNumber: trip.plateNumber,
            truckType: trip.truckType,
            totalTrips: 0,
            totalDistance: 0,
            avgDistance: 0,
            utilization: 0
          };
        }

        tripsByVehicle[trip.truckId].totalTrips++;
        tripsByVehicle[trip.truckId].totalDistance += trip.distance;
      });

      // Calculate averages for vehicles
      Object.values(tripsByVehicle).forEach(vehicle => {
        vehicle.avgDistance = vehicle.totalTrips > 0 ? vehicle.totalDistance / vehicle.totalTrips : 0;
        vehicle.utilization = vehicle.totalTrips; // Simplified utilization metric
      });

      // Process distance by vehicle type
      const distanceByVehicleType = {};
      trips.forEach(trip => {
        if (!distanceByVehicleType[trip.truckType]) {
          distanceByVehicleType[trip.truckType] = {
            type: trip.truckType,
            totalDistance: 0,
            avgDistance: 0,
            tripCount: 0
          };
        }

        distanceByVehicleType[trip.truckType].totalDistance += trip.distance;
        distanceByVehicleType[trip.truckType].tripCount++;
      });

      Object.values(distanceByVehicleType).forEach(type => {
        type.avgDistance = type.tripCount > 0 ? type.totalDistance / type.tripCount : 0;
      });

      // Process monthly trends
      const monthlyTrends = {};
      trips.forEach(trip => {
        const month = format(new Date(trip.endTime), 'yyyy-MM');
        if (!monthlyTrends[month]) {
          monthlyTrends[month] = {
            month: format(new Date(trip.endTime), 'MMM yyyy'),
            trips: 0,
            distance: 0,
            avgDistance: 0,
            onTimeRate: 0,
            onTimeCount: 0
          };
        }

        monthlyTrends[month].trips++;
        monthlyTrends[month].distance += trip.distance;
        if (trip.deliveryStatus === 'onTime') {
          monthlyTrends[month].onTimeCount++;
        }
      });

      Object.values(monthlyTrends).forEach(month => {
        month.avgDistance = month.trips > 0 ? month.distance / month.trips : 0;
        month.onTimeRate = month.trips > 0 ? (month.onTimeCount / month.trips) * 100 : 0;
      });

      // Process peak hours
      const peakHours = {};
      trips.forEach(trip => {
        const hour = new Date(trip.startTime).getHours();
        if (!peakHours[hour]) {
          peakHours[hour] = {
            hour: `${hour}:00`,
            trips: 0
          };
        }
        peakHours[hour].trips++;
      });

      setData({
        tripAnalytics: {
          totalTrips,
          completedTrips,
          ongoingTrips,
          totalDistance,
          totalDuration,
          avgTripDuration,
          avgDistance,
          onTimeDeliveryRate,
          recentTrips: trips.slice(0, 10),
          tripsByDriver: Object.values(tripsByDriver).sort((a, b) => b.totalTrips - a.totalTrips),
          tripsByVehicle: Object.values(tripsByVehicle).sort((a, b) => b.totalTrips - a.totalTrips),
          distanceByVehicleType: Object.values(distanceByVehicleType),
          deliveryPerformance: {
            onTime: onTimeDeliveries,
            early: earlyDeliveries,
            late: lateDeliveries
          },
          monthlyTrends: Object.values(monthlyTrends).sort((a, b) => a.month.localeCompare(b.month)),
          peakHours: Object.values(peakHours).sort((a, b) => a.hour.localeCompare(b.hour))
        }
      });

      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trip analytics:', error);
      setLoading(false);
    }
  }, [selectedDriver, selectedTruck, timeRange]);

  useEffect(() => {
    fetchTripAnalytics();
  }, [fetchTripAnalytics]);

  const formatDistance = (distance) => {
    return `${distance.toFixed(1)} km`;
  };

  const formatDuration = (duration) => {
    return `${duration.toFixed(1)} hrs`;
  };

  const chartConfig = {
    trips: {
      label: "Trips",
      color: "hsl(var(--chart-1))"
    },
    distance: {
      label: "Distance",
      color: "hsl(var(--chart-2))"
    },
    onTimeRate: {
      label: "On-Time Rate",
      color: "hsl(var(--chart-3))"
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading trip analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trip Analytics</h1>
          <p className="text-muted-foreground">
            Analyze trip performance, delivery metrics, and route optimization
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1week">1 Week</SelectItem>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select driver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              {/* Add driver options here */}
            </SelectContent>
          </Select>
          <Button onClick={fetchTripAnalytics} variant="outline">
            <Icon icon="mdi:refresh" className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Icon icon="mdi:truck" className="h-4 w-4 text-muted-foreground" />
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
            <Icon icon="mdi:map-marker-distance" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDistance(data.tripAnalytics.totalDistance)}</div>
            <p className="text-xs text-muted-foreground">
              {formatDistance(data.tripAnalytics.avgDistance)} avg per trip
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Trip Duration</CardTitle>
            <Icon icon="mdi:clock-outline" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(data.tripAnalytics.avgTripDuration)}</div>
            <p className="text-xs text-muted-foreground">
              {formatDuration(data.tripAnalytics.totalDuration)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Icon icon="mdi:check-circle" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tripAnalytics.onTimeDeliveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Delivery performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trip Trends</CardTitle>
            <CardDescription>Trip volume and performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.tripAnalytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar yAxisId="left" dataKey="trips" fill="var(--color-trips)" />
                  <Line yAxisId="right" type="monotone" dataKey="onTimeRate" stroke="var(--color-onTimeRate)" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distance by Vehicle Type</CardTitle>
            <CardDescription>Average distance covered by vehicle type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.tripAnalytics.distanceByVehicleType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgDistance" fill="var(--color-distance)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Performance</CardTitle>
          <CardDescription>Breakdown of delivery timing performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Icon icon="mdi:check-circle" className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{data.tripAnalytics.deliveryPerformance.onTime}</p>
                <p className="text-sm text-muted-foreground">On-Time Deliveries</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Icon icon="mdi:clock-fast" className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{data.tripAnalytics.deliveryPerformance.early}</p>
                <p className="text-sm text-muted-foreground">Early Deliveries</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Icon icon="mdi:clock-alert" className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{data.tripAnalytics.deliveryPerformance.late}</p>
                <p className="text-sm text-muted-foreground">Late Deliveries</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Driver Performance</CardTitle>
            <CardDescription>Trip metrics by driver</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Avg Distance</TableHead>
                  <TableHead>On-Time Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tripAnalytics.tripsByDriver.slice(0, 5).map((driver, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{driver.driverName}</TableCell>
                    <TableCell>{driver.totalTrips}</TableCell>
                    <TableCell>{formatDistance(driver.avgDistance)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress value={driver.onTimeRate} className="w-16" />
                        <span className="text-sm">{driver.onTimeRate.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Performance</CardTitle>
            <CardDescription>Trip metrics by vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Avg Distance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tripAnalytics.tripsByVehicle.slice(0, 5).map((vehicle, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                    <TableCell>{vehicle.truckType}</TableCell>
                    <TableCell>{vehicle.totalTrips}</TableCell>
                    <TableCell>{formatDistance(vehicle.avgDistance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trips */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trips</CardTitle>
          <CardDescription>Latest trip activities</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.tripAnalytics.recentTrips.map((trip, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{trip.driverName}</TableCell>
                  <TableCell>{trip.plateNumber}</TableCell>
                  <TableCell>{formatDistance(trip.distance)}</TableCell>
                  <TableCell>{formatDuration(trip.duration)}</TableCell>
                  <TableCell>
                    <Badge variant={trip.status === 'completed' ? 'default' : 'secondary'}>
                      {trip.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      trip.deliveryStatus === 'onTime' ? 'default' :
                      trip.deliveryStatus === 'early' ? 'secondary' : 'destructive'
                    }>
                      {trip.deliveryStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TripAnalytics;
