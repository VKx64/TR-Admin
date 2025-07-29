"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { subMonths, format } from 'date-fns';
import pb from '@/services/pocketbase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const FuelConsumptionTrend = ({ selectedTruck = 'all' }) => {
  const [fuelTrendData, setFuelTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFuelTrendData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch fuel records
      const fuelRecords = await pb.collection('truck_fuel').getFullList({
        expand: 'truck_id,truck_id.users_id',
        sort: '-created',
        filter: selectedTruck !== 'all' ? `truck_id="${selectedTruck}"` : '',
        requestKey: null
      });

      // Process fuel trends
      const processFuelTrends = () => {
        // Always generate data for the last 12 months to ensure consistent chart display
        const monthlyData = {};

        // Initialize all months with zero values
        for (let i = 11; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const monthKey = format(date, 'yyyy-MM');
          const monthLabel = format(date, 'MMM yyyy');

          monthlyData[monthKey] = {
            month: monthKey,
            monthLabel: monthLabel,
            cost: 0,
            liters: 0,
            transactions: 0
          };
        }

        // Process actual fuel records and aggregate by month
        if (fuelRecords.length > 0) {
          fuelRecords.forEach(record => {
            const recordDate = new Date(record.created);
            const monthKey = format(recordDate, 'yyyy-MM');

            // Only process records within our 12-month window
            if (monthlyData[monthKey]) {
              const fuelAmount = parseFloat(record.fuel_amount) || 0;
              const fuelPrice = parseFloat(record.fuel_price) || 0;
              const cost = fuelAmount * fuelPrice;

              monthlyData[monthKey].cost += cost;
              monthlyData[monthKey].liters += fuelAmount;
              monthlyData[monthKey].transactions++;
            }
          });
        }

        // Convert to array and sort chronologically
        const result = Object.values(monthlyData).sort((a, b) =>
          new Date(a.month + '-01').getTime() - new Date(b.month + '-01').getTime()
        );

        return result;
      };

      const trends = processFuelTrends();
      setFuelTrendData(trends);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching fuel trend data:', error);
      setLoading(false);
    }
  }, [selectedTruck]);

  useEffect(() => {
    fetchFuelTrendData();
  }, [fetchFuelTrendData]);

  // Chart.js options for Fuel Consumption Trend
  const fuelTrendChartOptions = {
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
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `Fuel Consumed: ${context.parsed.y.toFixed(1)} L`;
          },
          title: function(tooltipItems) {
            return `Month: ${tooltipItems[0].label}`;
          }
        }
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Month'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Fuel (Liters)'
        }
      }
    }
  };

  // Prepare data for Chart.js Line chart
  const fuelTrendChartData = {
    labels: fuelTrendData?.map(item => item.monthLabel) || [],
    datasets: [
      {
        label: 'Fuel Consumed (L)',
        data: fuelTrendData?.map(item => item.liters) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
    ],
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fuel Consumption Trend</CardTitle>
          <CardDescription>Monthly fuel usage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground text-sm">Loading fuel trend data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fuel Consumption Trend</CardTitle>
        <CardDescription>Monthly fuel usage over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Line data={fuelTrendChartData} options={fuelTrendChartOptions} />
        </div>
      </CardContent>
    </Card>
  );
};

export default FuelConsumptionTrend;
