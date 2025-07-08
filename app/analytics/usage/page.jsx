"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area, AreaChart, ScatterChart, Scatter } from 'recharts';
import { Icon } from '@iconify/react';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, differenceInYears, differenceInMonths } from 'date-fns';
import pb from '@/services/pocketbase';

const VehicleUsageAnalytics = () => {
  const [data, setData] = useState({
    usageAnalytics: {
      highUsageVehicles: [],
      lowUsageVehicles: [],
      driverUsage: [],
      averageUsageScore: 0,
      utilizationRate: 0,
      idleVehicles: []
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
    }
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [usageThreshold, setUsageThreshold] = useState('medium');
  const [selectedTruck, setSelectedTruck] = useState('all');

  // Usage threshold configurations
  const thresholdConfigs = {
    low: { high: 50, low: 20 },
    medium: { high: 70, low: 30 },
    high: { high: 90, low: 50 }
  };

  const fetchUsageAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Get current month date range
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Fetch data
      const [trucks, fuelLogs, maintenanceRecords, truckStats] = await Promise.all([
        pb.collection('trucks').getFullList({
          expand: 'users_id',
          filter: selectedTruck !== 'all' ? `id="${selectedTruck}"` : '',
          requestKey: null
        }),
        pb.collection('truck_fuel').getFullList({
          expand: 'truck_id',
          filter: selectedTruck !== 'all' ? `truck_id="${selectedTruck}"` : '',
          sort: '-created',
          requestKey: null
        }),
        pb.collection('maintenance_records').getFullList({
          expand: 'truck',
          filter: selectedTruck !== 'all' ? `truck="${selectedTruck}"` : '',
          sort: '-completion_date',
          requestKey: null
        }),
        pb.collection('truck_statistics').getFullList({
          sort: '-created',
          requestKey: null
        })
      ]);

      // Process usage analytics
      const processUsageAnalytics = () => {
        const vehicleUsage = {};
        const currentThreshold = thresholdConfigs[usageThreshold];

        trucks.forEach(truck => {
          const truckFuelLogs = fuelLogs.filter(log => log.truck_id === truck.id);
          const truckMaintenanceRecords = maintenanceRecords.filter(record => record.truck === truck.id);
          const truckAge = truck.truck_date ? differenceInYears(new Date(), new Date(truck.truck_date)) : 0;

          // Calculate usage metrics
          const monthlyFuelLogs = truckFuelLogs.filter(log =>
            new Date(log.created) >= monthStart && new Date(log.created) <= monthEnd
          );

          const totalMileage = truckFuelLogs.length > 0 ?
            Math.max(...truckFuelLogs.map(log => log.odometer_reading || 0)) : 0;

          const monthlyMileage = monthlyFuelLogs.reduce((sum, log, index) => {
            if (index === 0) return sum;
            const prevLog = monthlyFuelLogs[index - 1];
            return sum + (log.odometer_reading - (prevLog?.odometer_reading || 0));
          }, 0);

          const avgMonthlyMileage = monthlyMileage || (totalMileage / Math.max(truckAge * 12, 1));
          const fuelEfficiency = truckFuelLogs.length > 0 ?
            totalMileage / truckFuelLogs.reduce((sum, log) => sum + log.fuel_amount, 0) : 0;

          // Calculate usage score (0-100)
          const mileageScore = Math.min((avgMonthlyMileage / 2000) * 100, 100); // Assuming 2000 km/month is ideal
          const efficiencyScore = Math.min(fuelEfficiency * 5, 100); // Assuming 20 km/l is ideal
          const maintenanceScore = Math.max(100 - (truckMaintenanceRecords.length * 5), 0);
          const ageScore = Math.max(100 - (truckAge * 10), 0);

          const usageScore = (mileageScore + efficiencyScore + maintenanceScore + ageScore) / 4;

          vehicleUsage[truck.id] = {
            truckId: truck.id,
            plateNumber: truck.plate_number,
            truckType: truck.truck_type,
            truckAge,
            totalMileage,
            monthlyMileage,
            avgMonthlyMileage,
            fuelEfficiency,
            maintenanceCount: truckMaintenanceRecords.length,
            usageScore,
            utilizationRate: Math.min((avgMonthlyMileage / 2000) * 100, 100),
            driverName: truck.expand?.users_id?.username || 'Unassigned',
            isAssigned: !!truck.users_id,
            lastActivity: truckFuelLogs[0]?.created || truck.updated
          };
        });

        const allVehicles = Object.values(vehicleUsage);
        const averageUsageScore = allVehicles.reduce((sum, v) => sum + v.usageScore, 0) / allVehicles.length;
        const averageUtilizationRate = allVehicles.reduce((sum, v) => sum + v.utilizationRate, 0) / allVehicles.length;

        const highUsageVehicles = allVehicles
          .filter(v => v.usageScore >= currentThreshold.high)
          .sort((a, b) => b.usageScore - a.usageScore);

        const lowUsageVehicles = allVehicles
          .filter(v => v.usageScore <= currentThreshold.low)
          .sort((a, b) => a.usageScore - b.usageScore);

        const idleVehicles = allVehicles
          .filter(v => v.avgMonthlyMileage < 500) // Less than 500 km per month
          .sort((a, b) => a.avgMonthlyMileage - b.avgMonthlyMileage);

        // Driver usage analysis
        const driverUsage = {};
        allVehicles.forEach(vehicle => {
          if (vehicle.isAssigned) {
            if (!driverUsage[vehicle.driverName]) {
              driverUsage[vehicle.driverName] = {
                driverName: vehicle.driverName,
                vehicleCount: 0,
                totalUsageScore: 0,
                avgUsageScore: 0,
                totalMileage: 0,
                avgMileage: 0
              };
            }

            driverUsage[vehicle.driverName].vehicleCount++;
            driverUsage[vehicle.driverName].totalUsageScore += vehicle.usageScore;
            driverUsage[vehicle.driverName].totalMileage += vehicle.avgMonthlyMileage;
          }
        });

        Object.values(driverUsage).forEach(driver => {
          driver.avgUsageScore = driver.totalUsageScore / driver.vehicleCount;
          driver.avgMileage = driver.totalMileage / driver.vehicleCount;
        });

        return {
          highUsageVehicles,
          lowUsageVehicles,
          driverUsage: Object.values(driverUsage).sort((a, b) => b.avgUsageScore - a.avgUsageScore),
          averageUsageScore,
          utilizationRate: averageUtilizationRate,
          idleVehicles,
          allVehicles
        };
      };

      // Process retirement analytics
      const processRetirementAnalytics = () => {
        const currentYear = new Date().getFullYear();
        const retirementAge = 15; // Assume 15 years is retirement age

        const vehicleAnalysis = trucks.map(truck => {
          const truckAge = truck.truck_date ? differenceInYears(new Date(), new Date(truck.truck_date)) : 0;
          const yearsToRetirement = Math.max(retirementAge - truckAge, 0);
          const truckMaintenanceRecords = maintenanceRecords.filter(record => record.truck === truck.id);
          const totalMaintenanceCost = truckMaintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
          const avgAnnualMaintenanceCost = truckAge > 0 ? totalMaintenanceCost / truckAge : 0;

          // Estimate replacement cost based on truck type
          const replacementCosts = {
            'Light Truck': 30000,
            'Medium Truck': 60000,
            'Heavy Truck': 120000,
            'Van': 25000,
            'Pickup': 35000
          };

          const estimatedReplacementCost = replacementCosts[truck.truck_type] || 50000;

          return {
            truckId: truck.id,
            plateNumber: truck.plate_number,
            truckType: truck.truck_type,
            truckAge,
            yearsToRetirement,
            retirementYear: currentYear + yearsToRetirement,
            totalMaintenanceCost,
            avgAnnualMaintenanceCost,
            estimatedReplacementCost,
            isUpgradeCandidate: truckAge >= 10 && avgAnnualMaintenanceCost > 5000,
            priority: truckAge >= 12 ? 'High' : truckAge >= 8 ? 'Medium' : 'Low'
          };
        });

        const upcomingRetirements = vehicleAnalysis
          .filter(v => v.yearsToRetirement <= 3)
          .sort((a, b) => a.yearsToRetirement - b.yearsToRetirement);

        const upgradeCandidates = vehicleAnalysis
          .filter(v => v.isUpgradeCandidate)
          .sort((a, b) => b.avgAnnualMaintenanceCost - a.avgAnnualMaintenanceCost);

        // Create retirement timeline
        const retirementTimeline = {};
        vehicleAnalysis.forEach(vehicle => {
          const year = vehicle.retirementYear;
          if (!retirementTimeline[year]) {
            retirementTimeline[year] = {
              year,
              count: 0,
              estimatedCost: 0,
              vehicles: []
            };
          }
          retirementTimeline[year].count++;
          retirementTimeline[year].estimatedCost += vehicle.estimatedReplacementCost;
          retirementTimeline[year].vehicles.push(vehicle);
        });

        // Age distribution
        const ageDistribution = {};
        vehicleAnalysis.forEach(vehicle => {
          const ageGroup = `${Math.floor(vehicle.truckAge / 3) * 3}-${Math.floor(vehicle.truckAge / 3) * 3 + 2}`;
          if (!ageDistribution[ageGroup]) {
            ageDistribution[ageGroup] = {
              ageGroup,
              count: 0,
              avgMaintenanceCost: 0,
              totalMaintenanceCost: 0
            };
          }
          ageDistribution[ageGroup].count++;
          ageDistribution[ageGroup].totalMaintenanceCost += vehicle.avgAnnualMaintenanceCost;
        });

        Object.values(ageDistribution).forEach(group => {
          group.avgMaintenanceCost = group.totalMaintenanceCost / group.count;
        });

        // Maintenance vs Age correlation
        const maintenanceVsAge = vehicleAnalysis.map(vehicle => ({
          age: vehicle.truckAge,
          maintenanceCost: vehicle.avgAnnualMaintenanceCost,
          plateNumber: vehicle.plateNumber
        }));

        // Generate recommendations
        const recommendations = [];

        if (upcomingRetirements.length > 0) {
          recommendations.push({
            type: 'retirement',
            priority: 'high',
            title: 'Upcoming Retirements',
            description: `${upcomingRetirements.length} vehicles need retirement planning within 3 years`,
            action: 'Plan budget for vehicle replacement'
          });
        }

        if (upgradeCandidates.length > 0) {
          recommendations.push({
            type: 'upgrade',
            priority: 'medium',
            title: 'Upgrade Candidates',
            description: `${upgradeCandidates.length} vehicles may benefit from early replacement`,
            action: 'Evaluate cost-benefit of early replacement'
          });
        }

        return {
          upcomingRetirements,
          upgradeCandidates,
          retirementTimeline: Object.values(retirementTimeline).sort((a, b) => a.year - b.year),
          ageDistribution: Object.values(ageDistribution).sort((a, b) => a.ageGroup.localeCompare(b.ageGroup)),
          maintenanceVsAge,
          recommendations
        };
      };

      const usageAnalytics = processUsageAnalytics();
      const retirementAnalytics = processRetirementAnalytics();

      setData({
        usageAnalytics,
        retirementAnalytics
      });

      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      setLoading(false);
    }
  }, [usageThreshold, selectedTruck]);

  useEffect(() => {
    fetchUsageAnalytics();
  }, [fetchUsageAnalytics]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const chartConfig = {
    usageScore: {
      label: "Usage Score",
      color: "hsl(var(--chart-1))"
    },
    utilizationRate: {
      label: "Utilization Rate",
      color: "hsl(var(--chart-2))"
    },
    maintenanceCost: {
      label: "Maintenance Cost",
      color: "hsl(var(--chart-3))"
    },
    age: {
      label: "Age",
      color: "hsl(var(--chart-4))"
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading usage analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicle Usage Analytics</h1>
          <p className="text-muted-foreground">
            Monitor vehicle utilization, performance, and retirement planning
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={usageThreshold} onValueChange={setUsageThreshold}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Threshold</SelectItem>
              <SelectItem value="medium">Medium Threshold</SelectItem>
              <SelectItem value="high">High Threshold</SelectItem>
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
          <Button onClick={fetchUsageAnalytics} variant="outline">
            <Icon icon="mdi:refresh" className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Usage Score</CardTitle>
            <Icon icon="mdi:speedometer" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.usageAnalytics.averageUsageScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Fleet average performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <Icon icon="mdi:chart-line" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.usageAnalytics.utilizationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Fleet utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Usage Vehicles</CardTitle>
            <Icon icon="mdi:trending-up" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.usageAnalytics.highUsageVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              Performing well
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Retirements</CardTitle>
            <Icon icon="mdi:calendar-clock" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.retirementAnalytics.upcomingRetirements.length}</div>
            <p className="text-xs text-muted-foreground">
              Next 3 years
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Age Distribution</CardTitle>
            <CardDescription>Fleet age breakdown with maintenance costs</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.retirementAnalytics.ageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageGroup" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar yAxisId="left" dataKey="count" fill="var(--color-usageScore)" />
                  <Line yAxisId="right" type="monotone" dataKey="avgMaintenanceCost" stroke="var(--color-maintenanceCost)" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance vs Age Correlation</CardTitle>
            <CardDescription>Relationship between vehicle age and maintenance costs</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={data.retirementAnalytics.maintenanceVsAge}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" name="Age" />
                  <YAxis dataKey="maintenanceCost" name="Maintenance Cost" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Scatter dataKey="maintenanceCost" fill="var(--color-maintenanceCost)" />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Retirement Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Retirement Timeline</CardTitle>
          <CardDescription>Projected vehicle retirements and replacement costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.retirementAnalytics.retirementTimeline.slice(0, 5).map((timeline, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">{timeline.year}</h4>
                  <p className="text-sm text-muted-foreground">
                    {timeline.count} vehicles retiring
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(timeline.estimatedCost)}</p>
                  <p className="text-sm text-muted-foreground">Est. replacement cost</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>High Usage Vehicles</CardTitle>
            <CardDescription>Top performing vehicles by usage score</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Usage Score</TableHead>
                  <TableHead>Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.usageAnalytics.highUsageVehicles.slice(0, 5).map((vehicle, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                    <TableCell>{vehicle.truckType}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress value={vehicle.usageScore} className="w-16" />
                        <span className="text-sm">{vehicle.usageScore.toFixed(1)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.utilizationRate.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Usage Vehicles</CardTitle>
            <CardDescription>Vehicles needing attention or optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Usage Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.usageAnalytics.lowUsageVehicles.slice(0, 5).map((vehicle, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                    <TableCell>{vehicle.truckType}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress value={vehicle.usageScore} className="w-16" />
                        <span className="text-sm text-red-600">{vehicle.usageScore.toFixed(1)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {vehicle.isAssigned ? 'Assigned' : 'Unassigned'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>AI-generated insights and action items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.retirementAnalytics.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className={`p-2 rounded-lg ${
                  rec.priority === 'high' ? 'bg-red-100' :
                  rec.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  <Icon icon={
                    rec.type === 'retirement' ? 'mdi:calendar-clock' :
                    rec.type === 'upgrade' ? 'mdi:arrow-up-circle' :
                    'mdi:lightbulb'
                  } className={`h-5 w-5 ${
                    rec.priority === 'high' ? 'text-red-600' :
                    rec.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                  <p className="text-sm font-medium mt-2">Action: {rec.action}</p>
                </div>
                <Badge variant={
                  rec.priority === 'high' ? 'destructive' :
                  rec.priority === 'medium' ? 'default' : 'secondary'
                }>
                  {rec.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Driver Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Performance</CardTitle>
          <CardDescription>Usage efficiency by driver</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Avg Usage Score</TableHead>
                <TableHead>Avg Monthly Mileage</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.usageAnalytics.driverUsage.map((driver, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{driver.driverName}</TableCell>
                  <TableCell>{driver.vehicleCount}</TableCell>
                  <TableCell>{driver.avgUsageScore.toFixed(1)}</TableCell>
                  <TableCell>{driver.avgMileage.toFixed(0)} km</TableCell>
                  <TableCell>
                    <Badge variant={
                      driver.avgUsageScore >= 70 ? 'default' :
                      driver.avgUsageScore >= 50 ? 'secondary' : 'destructive'
                    }>
                      {driver.avgUsageScore >= 70 ? 'Good' :
                       driver.avgUsageScore >= 50 ? 'Average' : 'Needs Improvement'}
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

export default VehicleUsageAnalytics;
