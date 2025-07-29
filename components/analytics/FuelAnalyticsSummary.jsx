"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@iconify/react';
import pb from '@/services/pocketbase';
import { startOfMonth, endOfMonth, subMonths, differenceInDays, format } from 'date-fns';

const FuelAnalyticsSummary = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get date ranges
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      // Fetch current month fuel records
      const currentMonthRecords = await pb.collection('truck_fuel').getFullList({
        expand: 'truck_id',
        filter: `created >= "${currentMonthStart.toISOString()}" && created <= "${currentMonthEnd.toISOString()}"`,
        requestKey: null
      });

      // Fetch last month fuel records for comparison
      const lastMonthRecords = await pb.collection('truck_fuel').getFullList({
        expand: 'truck_id',
        filter: `created >= "${lastMonthStart.toISOString()}" && created <= "${lastMonthEnd.toISOString()}"`,
        requestKey: null
      });

      // Fetch all fuel records for fleet analytics
      const allRecords = await pb.collection('truck_fuel').getFullList({
        expand: 'truck_id',
        sort: '-created',
        requestKey: null
      });

      // Fetch trucks
      const trucks = await pb.collection('trucks').getFullList({
        requestKey: null
      });

      // Calculate current month metrics
      const currentMonthCost = currentMonthRecords.reduce((sum, record) =>
        sum + ((record.fuel_amount || 0) * (record.fuel_price || 0)), 0);
      const currentMonthVolume = currentMonthRecords.reduce((sum, record) =>
        sum + (record.fuel_amount || 0), 0);

      // Calculate last month metrics for comparison
      const lastMonthCost = lastMonthRecords.reduce((sum, record) =>
        sum + ((record.fuel_amount || 0) * (record.fuel_price || 0)), 0);
      const lastMonthVolume = lastMonthRecords.reduce((sum, record) =>
        sum + (record.fuel_amount || 0), 0);

      // Calculate percentage changes
      const costChange = lastMonthCost > 0 ? ((currentMonthCost - lastMonthCost) / lastMonthCost) * 100 : 0;
      const volumeChange = lastMonthVolume > 0 ? ((currentMonthVolume - lastMonthVolume) / lastMonthVolume) * 100 : 0;

      // Calculate fleet efficiency
      const fleetEfficiency = calculateFleetEfficiency(allRecords, trucks);

      // Find most/least efficient trucks
      const truckEfficiencies = calculateTruckEfficiencies(allRecords, trucks);
      const sortedEfficiencies = Object.entries(truckEfficiencies)
        .sort(([,a], [,b]) => b.efficiency - a.efficiency);

      const mostEfficient = sortedEfficiencies[0];
      const leastEfficient = sortedEfficiencies[sortedEfficiencies.length - 1];

      // Calculate monthly progress (days passed vs total days)
      const daysInMonth = differenceInDays(currentMonthEnd, currentMonthStart) + 1;
      const daysPassed = differenceInDays(now, currentMonthStart) + 1;
      const monthProgress = (daysPassed / daysInMonth) * 100;

      // Projected monthly cost
      const projectedMonthlyCost = currentMonthCost > 0 ? (currentMonthCost / daysPassed) * daysInMonth : 0;

      // Calculate recent trends (last 7 days vs previous 7 days)
      const last7Days = allRecords.filter(record =>
        differenceInDays(now, new Date(record.created)) <= 7);
      const previous7Days = allRecords.filter(record => {
        const daysDiff = differenceInDays(now, new Date(record.created));
        return daysDiff > 7 && daysDiff <= 14;
      });

      const recent7DaysCost = last7Days.reduce((sum, record) =>
        sum + ((record.fuel_amount || 0) * (record.fuel_price || 0)), 0);
      const previous7DaysCost = previous7Days.reduce((sum, record) =>
        sum + ((record.fuel_amount || 0) * (record.fuel_price || 0)), 0);

      const weeklyTrend = previous7DaysCost > 0 ? ((recent7DaysCost - previous7DaysCost) / previous7DaysCost) * 100 : 0;

      setSummaryData({
        currentMonth: {
          cost: currentMonthCost,
          volume: currentMonthVolume,
          transactions: currentMonthRecords.length,
          avgPricePerLiter: currentMonthVolume > 0 ? currentMonthCost / currentMonthVolume : 0
        },
        comparisons: {
          costChange,
          volumeChange
        },
        fleet: {
          totalTrucks: trucks.length,
          activeTrucks: Object.keys(truckEfficiencies).length,
          avgEfficiency: fleetEfficiency,
          mostEfficient: mostEfficient ? {
            plate: mostEfficient[0],
            efficiency: mostEfficient[1].efficiency
          } : null,
          leastEfficient: leastEfficient ? {
            plate: leastEfficient[0],
            efficiency: leastEfficient[1].efficiency
          } : null
        },
        projections: {
          monthProgress,
          projectedMonthlyCost,
          weeklyTrend
        }
      });

    } catch (error) {
      console.error('Error fetching summary data:', error);
      setError('Failed to load summary data');
    } finally {
      setLoading(false);
    }
  };

  const calculateFleetEfficiency = (records, trucks) => {
    const truckEfficiencies = calculateTruckEfficiencies(records, trucks);
    const efficiencyValues = Object.values(truckEfficiencies).map(data => data.efficiency);
    return efficiencyValues.length > 0 ?
      efficiencyValues.reduce((sum, eff) => sum + eff, 0) / efficiencyValues.length : 0;
  };

  const calculateTruckEfficiencies = (records, trucks) => {
    const truckEfficiencies = {};

    trucks.forEach(truck => {
      const truckRecords = records
        .filter(r => r.truck_id === truck.id)
        .sort((a, b) => new Date(a.created) - new Date(b.created));

      if (truckRecords.length > 1) {
        let totalDistance = 0;
        let totalFuel = 0;
        let validCalculations = 0;

        for (let i = 1; i < truckRecords.length; i++) {
          const current = truckRecords[i];
          const previous = truckRecords[i - 1];

          if (current.odometer_reading && previous.odometer_reading && current.fuel_amount) {
            const distance = current.odometer_reading - previous.odometer_reading;
            if (distance > 1 && distance < 2000) {
              totalDistance += distance;
              totalFuel += current.fuel_amount;
              validCalculations++;
            }
          }
        }

        if (validCalculations > 0 && totalFuel > 0) {
          const efficiency = totalDistance / totalFuel;
          const plateNumber = truck.plate_number || `Truck ${truck.id.slice(-6)}`;
          truckEfficiencies[plateNumber] = { efficiency, validCalculations };
        }
      }
    });

    return truckEfficiencies;
  };

  useEffect(() => {
    fetchSummaryData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getChangeIndicator = (value) => {
    if (value > 0) {
      return { icon: 'mdi:trending-up', color: 'text-red-500', sign: '+' };
    } else if (value < 0) {
      return { icon: 'mdi:trending-down', color: 'text-green-500', sign: '' };
    } else {
      return { icon: 'mdi:minus', color: 'text-gray-500', sign: '' };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fleet Summary</CardTitle>
          <CardDescription>Key insights and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fleet Summary</CardTitle>
          <CardDescription>Key insights and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-red-500 h-32">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const costIndicator = getChangeIndicator(summaryData?.comparisons.costChange || 0);
  const volumeIndicator = getChangeIndicator(summaryData?.comparisons.volumeChange || 0);
  const trendIndicator = getChangeIndicator(summaryData?.projections.weeklyTrend || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="mdi:chart-timeline-variant" className="h-5 w-5" />
          Fleet Analytics Summary
        </CardTitle>
        <CardDescription>
          Current month performance and key insights for {format(new Date(), 'MMMM yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {summaryData && (
          <div className="space-y-6">
            {/* Current Month Overview */}
            <div>
              <h4 className="font-semibold mb-3">Current Month Progress</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Monthly Spend</span>
                    <Icon icon={costIndicator.icon} className={`h-4 w-4 ${costIndicator.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summaryData.currentMonth.cost)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {costIndicator.sign}{Math.abs(summaryData.comparisons.costChange).toFixed(1)}% vs last month
                  </div>
                  <Progress
                    value={summaryData.projections.monthProgress}
                    className="mt-2 h-2"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {summaryData.projections.monthProgress.toFixed(0)}% of month elapsed
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Fuel Volume</span>
                    <Icon icon={volumeIndicator.icon} className={`h-4 w-4 ${volumeIndicator.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {summaryData.currentMonth.volume.toFixed(0)}L
                  </div>
                  <div className="text-xs text-gray-500">
                    {volumeIndicator.sign}{Math.abs(summaryData.comparisons.volumeChange).toFixed(1)}% vs last month
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {summaryData.currentMonth.transactions} transactions
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Projected Total</span>
                    <Icon icon={trendIndicator.icon} className={`h-4 w-4 ${trendIndicator.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(summaryData.projections.projectedMonthlyCost)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {trendIndicator.sign}{Math.abs(summaryData.projections.weeklyTrend).toFixed(1)}% weekly trend
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    ₱{summaryData.currentMonth.avgPricePerLiter.toFixed(2)}/L avg price
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FuelAnalyticsSummary;
