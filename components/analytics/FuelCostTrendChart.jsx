"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import pb from '@/services/pocketbase';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const FuelCostTrendChart = ({ selectedTruck = 'all', height = 400 }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef();

  const fetchFuelCostTrend = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch fuel records with truck information
      const fuelRecords = await pb.collection('truck_fuel').getFullList({
        expand: 'truck_id',
        sort: 'created',
        filter: selectedTruck !== 'all' ? `truck_id="${selectedTruck}"` : '',
        requestKey: null
      });

      if (!fuelRecords || fuelRecords.length === 0) {
        setChartData({
          labels: [],
          datasets: [{
            label: 'No Data Available',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4
          }]
        });
        setLoading(false);
        return;
      }

      // Process data for trend analysis
      const processedData = fuelRecords.map(record => ({
        date: new Date(record.created),
        cost: (record.fuel_amount || 0) * (record.fuel_price || 0),
        truckPlate: record.expand?.truck_id?.plate_number || 'Unknown',
        fuelAmount: record.fuel_amount || 0,
        fuelPrice: record.fuel_price || 0
      }));

      // Group by truck if showing all trucks
      const datasets = [];

      if (selectedTruck === 'all') {
        // Group by truck
        const truckGroups = {};
        processedData.forEach(record => {
          const truckKey = record.truckPlate;
          if (!truckGroups[truckKey]) {
            truckGroups[truckKey] = [];
          }
          truckGroups[truckKey].push(record);
        });

        // Create dataset for each truck
        const colors = [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)'
        ];

        Object.entries(truckGroups).forEach(([truckPlate, records], index) => {
          const color = colors[index % colors.length];
          datasets.push({
            label: `${truckPlate} - Fuel Cost`,
            data: records.map(record => ({
              x: record.date,
              y: record.cost
            })),
            borderColor: color,
            backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
            tension: 0.4,
            fill: false
          });
        });
      } else {
        // Single truck data
        datasets.push({
          label: 'Fuel Cost Trend',
          data: processedData.map(record => ({
            x: record.date,
            y: record.cost
          })),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true
        });
      }

      setChartData({
        datasets
      });

    } catch (error) {
      console.error('Error fetching fuel cost trend:', error);
      setError('Failed to load fuel cost trend data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuelCostTrend();
  }, [selectedTruck]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Fuel Cost Trend Over Time'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ₱${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM dd'
          }
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Cost (₱)'
        },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fuel Cost Trend</CardTitle>
          <CardDescription>Track fuel expenses over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
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
          <CardTitle>Fuel Cost Trend</CardTitle>
          <CardDescription>Track fuel expenses over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-red-500" style={{ height }}>
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fuel Cost Trend</CardTitle>
        <CardDescription>Track fuel expenses over time by truck</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          {chartData && (
            <Line
              ref={chartRef}
              data={chartData}
              options={options}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FuelCostTrendChart;
