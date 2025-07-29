"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import pb from '@/services/pocketbase';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const FuelConsumptionByTruckChart = ({ height = 400 }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef();

  const fetchFuelConsumptionByTruck = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch fuel records with truck information
      const fuelRecords = await pb.collection('truck_fuel').getFullList({
        expand: 'truck_id',
        requestKey: null
      });

      // Fetch all trucks to include those with no fuel records
      const trucks = await pb.collection('trucks').getFullList({
        requestKey: null
      });

      if (!trucks || trucks.length === 0) {
        setChartData({
          labels: ['No Trucks'],
          datasets: [{
            label: 'No Data Available',
            data: [0],
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        });
        setLoading(false);
        return;
      }

      // Group fuel records by truck
      const truckConsumption = {};
      const truckCosts = {};
      const truckRecordCounts = {};

      // Initialize all trucks with zero consumption
      trucks.forEach(truck => {
        const truckId = truck.id;
        const plateNumber = truck.plate_number || `Truck ${truckId.slice(-6)}`;
        truckConsumption[plateNumber] = 0;
        truckCosts[plateNumber] = 0;
        truckRecordCounts[plateNumber] = 0;
      });

      // Aggregate fuel consumption by truck
      fuelRecords.forEach(record => {
        const truckPlate = record.expand?.truck_id?.plate_number || `Truck ${record.truck_id?.slice(-6) || 'Unknown'}`;
        const fuelAmount = record.fuel_amount || 0;
        const fuelCost = (record.fuel_amount || 0) * (record.fuel_price || 0);

        if (truckConsumption.hasOwnProperty(truckPlate)) {
          truckConsumption[truckPlate] += fuelAmount;
          truckCosts[truckPlate] += fuelCost;
          truckRecordCounts[truckPlate] += 1;
        }
      });

      // Sort trucks by consumption (descending)
      const sortedTrucks = Object.entries(truckConsumption)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // Show top 10 trucks

      // Generate colors for bars
      const generateColors = (count) => {
        const colors = [];
        for (let i = 0; i < count; i++) {
          const hue = (i * 137.508) % 360; // Golden angle approximation
          colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
        }
        return colors;
      };

      const labels = sortedTrucks.map(([plate]) => plate);
      const consumptionData = sortedTrucks.map(([plate]) => truckConsumption[plate]);
      const costData = sortedTrucks.map(([plate]) => truckCosts[plate]);
      const colors = generateColors(labels.length);

      setChartData({
        labels,
        datasets: [
          {
            label: 'Fuel Consumption (Liters)',
            data: consumptionData,
            backgroundColor: colors,
            borderColor: colors.map(color => color.replace('0.8)', '1)')),
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Total Cost ($)',
            data: costData,
            backgroundColor: colors.map(color => color.replace('60%, 0.8', '40%, 0.6')),
            borderColor: colors.map(color => color.replace('0.8)', '1)')),
            borderWidth: 1,
            yAxisID: 'y1',
            type: 'line',
            tension: 0.4
          }
        ]
      });

    } catch (error) {
      console.error('Error fetching fuel consumption by truck:', error);
      setError('Failed to load fuel consumption data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuelConsumptionByTruck();
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Fuel Consumption & Cost by Truck'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            if (context.datasetIndex === 0) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} L`;
            } else {
              return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Truck Plate Number'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Fuel Consumption (Liters)'
        },
        beginAtZero: true
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Total Cost ($)'
        },
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
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
          <CardTitle>Fuel Consumption by Truck</CardTitle>
          <CardDescription>Compare fuel usage across fleet vehicles</CardDescription>
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
          <CardTitle>Fuel Consumption by Truck</CardTitle>
          <CardDescription>Compare fuel usage across fleet vehicles</CardDescription>
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
        <CardTitle>Fuel Consumption by Truck</CardTitle>
        <CardDescription>Compare fuel usage and costs across fleet vehicles</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          {chartData && (
            <Bar
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

export default FuelConsumptionByTruckChart;
