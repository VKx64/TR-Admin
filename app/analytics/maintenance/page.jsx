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
import { startOfMonth, endOfMonth, subMonths, format, parseISO, differenceInDays } from 'date-fns';
import pb from '@/services/pocketbase';

const MaintenanceAnalytics = () => {
  const [data, setData] = useState({
    maintenance: {
      totalCost: 0,
      pendingRequests: 0,
      completionRate: 0,
      avgDays: 0,
      laborCost: 0
    },
    maintenanceAnalytics: {
      vehiclesInMaintenance: [],
      issueProneVehicles: [],
      typeBreakdown: [],
      latestRecord: null,
      requestStatus: {
        pending: 0,
        approved: 0,
        completed: 0,
        declined: 0,
        latestRequest: null
      }
    },
    charts: {
      maintenanceTrend: [],
      costBreakdown: []
    }
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState('all');
  const [timeRange, setTimeRange] = useState('6months');

  const fetchMaintenanceAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      let startDate;
      switch (timeRange) {
        case '1month':
          startDate = subMonths(endDate, 1);
          break;
        case '3months':
          startDate = subMonths(endDate, 3);
          break;
        case '6months':
          startDate = subMonths(endDate, 6);
          break;
        case '1year':
          startDate = subMonths(endDate, 12);
          break;
        default:
          startDate = subMonths(endDate, 6);
      }

      // Fetch data
      const [maintenanceRecords, maintenanceRequests, maintenanceTypes, trucks] = await Promise.all([
        pb.collection('maintenance_records').getFullList({
          expand: 'truck,maintenance_type,associated_request',
          filter: `completion_date >= "${startDate.toISOString()}"${selectedTruck !== 'all' ? ` && truck="${selectedTruck}"` : ''}`,
          sort: '-completion_date',
          requestKey: null
        }),
        pb.collection('maintenance_request').getFullList({
          expand: 'truck,maintenance_type,requesting_driver',
          filter: `request_date >= "${startDate.toISOString()}"${selectedTruck !== 'all' ? ` && truck="${selectedTruck}"` : ''}`,
          sort: '-request_date',
          requestKey: null
        }),
        pb.collection('maintenance_type').getFullList({
          requestKey: null
        }),
        pb.collection('trucks').getFullList({
          expand: 'users_id',
          requestKey: null
        })
      ]);

      // Process maintenance metrics
      const processMaintenanceMetrics = () => {
        const totalCost = maintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
        const pendingRequests = maintenanceRequests.filter(req => req.status === 'pending').length;
        const completedRequests = maintenanceRequests.filter(req => req.status === 'completed').length;
        const completionRate = maintenanceRequests.length > 0 ?
          (completedRequests / maintenanceRequests.length) * 100 : 0;

        // Calculate average days to completion
        const completedWithDates = maintenanceRequests.filter(req =>
          req.status === 'completed' && req.request_date && req.handled_date
        );
        const avgDays = completedWithDates.length > 0 ?
          completedWithDates.reduce((sum, req) => {
            const days = differenceInDays(new Date(req.handled_date), new Date(req.request_date));
            return sum + days;
          }, 0) / completedWithDates.length : 0;

        // Calculate labor cost (assuming 30% of total cost is labor)
        const laborCost = totalCost * 0.3;

        return {
          totalCost,
          pendingRequests,
          completionRate,
          avgDays,
          laborCost
        };
      };

      // Process latest maintenance record
      const processLatestMaintenanceRecord = () => {
        if (maintenanceRecords.length === 0) return null;

        const latest = maintenanceRecords[0]; // Records are sorted by -completion_date
        return {
          plateNumber: latest.expand?.truck?.plate_number || 'Unknown',
          maintenanceType: latest.expand?.maintenance_type?.name || 'Unknown',
          cost: latest.cost || 0,
          completionDate: latest.completion_date,
          odometerReading: latest.odometer_at_completion
        };
      };

      // Process maintenance request status overview
      const processRequestStatusOverview = () => {
        const statusCounts = {
          pending: 0,
          approved: 0,
          completed: 0,
          declined: 0
        };

        maintenanceRequests.forEach(request => {
          if (statusCounts.hasOwnProperty(request.status)) {
            statusCounts[request.status]++;
          }
        });

        const latestRequest = maintenanceRequests.length > 0 ? {
          plateNumber: maintenanceRequests[0].expand?.truck?.plate_number || 'Unknown',
          maintenanceType: maintenanceRequests[0].expand?.maintenance_type?.name || 'Unknown',
          status: maintenanceRequests[0].status,
          requestDate: maintenanceRequests[0].request_date
        } : null;

        return {
          ...statusCounts,
          latestRequest
        };
      };

      // Process issue-prone vehicles
      const processIssueProneVehicles = () => {
        const truckIssues = {};

        maintenanceRecords.forEach(record => {
          if (record.truck) {
            const truckId = record.truck;
            if (!truckIssues[truckId]) {
              truckIssues[truckId] = {
                truckId,
                plateNumber: record.expand?.truck?.plate_number || 'Unknown',
                truckType: record.expand?.truck?.truck_type || 'Unknown',
                issueCount: 0,
                totalCost: 0,
                avgCost: 0,
                lastMaintenance: null
              };
            }

            truckIssues[truckId].issueCount++;
            truckIssues[truckId].totalCost += record.cost || 0;

            if (!truckIssues[truckId].lastMaintenance ||
                new Date(record.completion_date) > new Date(truckIssues[truckId].lastMaintenance)) {
              truckIssues[truckId].lastMaintenance = record.completion_date;
            }
          }
        });

        // Calculate average cost and sort by issue count
        const issueProneVehicles = Object.values(truckIssues)
          .map(truck => ({
            ...truck,
            avgCost: truck.issueCount > 0 ? truck.totalCost / truck.issueCount : 0
          }))
          .sort((a, b) => b.issueCount - a.issueCount)
          .slice(0, 10); // Top 10 issue-prone vehicles

        return issueProneVehicles;
      };

      // Process maintenance type breakdown
      const processMaintenanceTypeBreakdown = () => {
        const typeBreakdown = {};

        maintenanceRecords.forEach(record => {
          const typeName = record.expand?.maintenance_type?.name || 'Unknown';
          if (!typeBreakdown[typeName]) {
            typeBreakdown[typeName] = {
              type: typeName,
              count: 0,
              cost: 0,
              avgCost: 0
            };
          }

          typeBreakdown[typeName].count++;
          typeBreakdown[typeName].cost += record.cost || 0;
        });

        return Object.values(typeBreakdown)
          .map(type => ({
            ...type,
            avgCost: type.count > 0 ? type.cost / type.count : 0
          }))
          .sort((a, b) => b.cost - a.cost);
      };

      // Process vehicles currently in maintenance
      const processVehiclesInMaintenance = () => {
        const pendingMaintenance = maintenanceRequests.filter(req =>
          req.status === 'approved' || req.status === 'pending'
        );

        return pendingMaintenance.map(req => ({
          truckId: req.truck,
          plateNumber: req.expand?.truck?.plate_number || 'Unknown',
          maintenanceType: req.expand?.maintenance_type?.name || 'Unknown',
          requestDate: req.request_date,
          status: req.status,
          requestingDriver: req.expand?.requesting_driver?.username || 'Unknown',
          priority: req.current_mileage_at_request > 100000 ? 'High' :
                   req.current_mileage_at_request > 50000 ? 'Medium' : 'Low'
        }));
      };



      const maintenanceMetrics = processMaintenanceMetrics();
      const latestRecord = processLatestMaintenanceRecord();
      const requestStatus = processRequestStatusOverview();
      const issueProneVehicles = processIssueProneVehicles();
      const typeBreakdown = processMaintenanceTypeBreakdown();
      const vehiclesInMaintenance = processVehiclesInMaintenance();

      setData({
        maintenance: maintenanceMetrics,
        maintenanceAnalytics: {
          vehiclesInMaintenance,
          issueProneVehicles,
          typeBreakdown,
          latestRecord,
          requestStatus
        },
        charts: {
          // Keep empty for now since we removed the charts
          maintenanceTrend: [],
          costBreakdown: []
        }
      });

      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching maintenance analytics:', error);
      setLoading(false);
    }
  }, [selectedTruck, timeRange]);

  useEffect(() => {
    fetchMaintenanceAnalytics();
  }, [fetchMaintenanceAnalytics]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const chartConfig = {
    cost: {
      label: "Cost",
      color: "hsl(var(--chart-1))"
    },
    count: {
      label: "Count",
      color: "hsl(var(--chart-2))"
    },
    avgCost: {
      label: "Avg Cost",
      color: "hsl(var(--chart-3))"
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading maintenance analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Analytics</h1>
          <p className="text-muted-foreground">
            Track maintenance costs, schedules, and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTruck} onValueChange={setSelectedTruck}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select truck" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trucks</SelectItem>
              {/* Add truck options here */}
            </SelectContent>
          </Select>
          <Button onClick={fetchMaintenanceAnalytics} variant="outline">
            <Icon icon="mdi:refresh" className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <Icon icon="mdi:currency-php" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.maintenance.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Maintenance expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Icon icon="mdi:clock-outline" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.maintenance.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Icon icon="mdi:check-circle" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.maintenance.completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Request completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days</CardTitle>
            <Icon icon="mdi:calendar-clock" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.maintenance.avgDays.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              To completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
            <Icon icon="mdi:worker" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.maintenance.laborCost)}</div>
            <p className="text-xs text-muted-foreground">
              Estimated labor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Maintenance Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Maintenance Record</CardTitle>
            <CardDescription>Latest completed maintenance activity</CardDescription>
          </CardHeader>
          <CardContent>
            {data.maintenanceAnalytics.latestRecord ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Truck</p>
                    <p className="text-lg font-semibold">{data.maintenanceAnalytics.latestRecord.plateNumber}</p>
                  </div>
                  <Badge variant="outline">{data.maintenanceAnalytics.latestRecord.maintenanceType}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cost</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(data.maintenanceAnalytics.latestRecord.cost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-sm text-gray-800">
                      {format(new Date(data.maintenanceAnalytics.latestRecord.completionDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                {data.maintenanceAnalytics.latestRecord.odometerReading && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Odometer Reading</p>
                    <p className="text-sm text-gray-800">
                      {data.maintenanceAnalytics.latestRecord.odometerReading.toLocaleString()} km
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <Icon icon="mdi:wrench" className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No maintenance records found</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Request Status</CardTitle>
            <CardDescription>Current maintenance request overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-800">Pending</span>
                    <Icon icon="mdi:clock-outline" className="h-4 w-4 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-700">
                    {data.maintenanceAnalytics.requestStatus.pending}
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">Approved</span>
                    <Icon icon="mdi:check-circle" className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {data.maintenanceAnalytics.requestStatus.approved}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Completed</span>
                    <Icon icon="mdi:check-all" className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {data.maintenanceAnalytics.requestStatus.completed}
                  </p>
                </div>

                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-800">Declined</span>
                    <Icon icon="mdi:close-circle" className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-700">
                    {data.maintenanceAnalytics.requestStatus.declined}
                  </p>
                </div>
              </div>

              {data.maintenanceAnalytics.latestRequest && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-1">Latest Request</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-800">
                      {data.maintenanceAnalytics.latestRequest.plateNumber} - {data.maintenanceAnalytics.latestRequest.maintenanceType}
                    </span>
                    <Badge variant={
                      data.maintenanceAnalytics.latestRequest.status === 'pending' ? 'secondary' :
                      data.maintenanceAnalytics.latestRequest.status === 'approved' ? 'default' :
                      data.maintenanceAnalytics.latestRequest.status === 'completed' ? 'secondary' : 'destructive'
                    }>
                      {data.maintenanceAnalytics.latestRequest.status}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vehicles in Maintenance</CardTitle>
            <CardDescription>Current maintenance activities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.maintenanceAnalytics.vehiclesInMaintenance.map((vehicle, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                    <TableCell>{vehicle.maintenanceType}</TableCell>
                    <TableCell>
                      <Badge variant={vehicle.status === 'approved' ? 'default' : 'secondary'}>
                        {vehicle.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        vehicle.priority === 'High' ? 'destructive' :
                        vehicle.priority === 'Medium' ? 'default' : 'secondary'
                      }>
                        {vehicle.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issue-Prone Vehicles</CardTitle>
            <CardDescription>Vehicles with frequent maintenance needs</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.maintenanceAnalytics.issueProneVehicles.slice(0, 5).map((vehicle, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                    <TableCell>{vehicle.truckType}</TableCell>
                    <TableCell>{vehicle.issueCount}</TableCell>
                    <TableCell>{formatCurrency(vehicle.totalCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Type Analysis</CardTitle>
          <CardDescription>Breakdown of maintenance activities by type</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Maintenance Type</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Average Cost</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.maintenanceAnalytics.typeBreakdown.map((type, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{type.type}</TableCell>
                  <TableCell>{type.count}</TableCell>
                  <TableCell>{formatCurrency(type.cost)}</TableCell>
                  <TableCell>{formatCurrency(type.avgCost)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Progress
                        value={(type.cost / data.maintenance.totalCost) * 100}
                        className="w-20"
                      />
                      <span className="text-sm">
                        {((type.cost / data.maintenance.totalCost) * 100).toFixed(1)}%
                      </span>
                    </div>
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

export default MaintenanceAnalytics;
