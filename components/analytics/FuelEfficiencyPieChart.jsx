"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import pb from '@/services/pocketbase';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const FuelEfficiencyPieChart = ({ height = 400 }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [efficiencyStats, setEfficiencyStats] = useState(null);
  const chartRef = useRef();

  const fetchFuelEfficiency = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch fuel records with truck information
      const fuelRecords = await pb.collection('truck_fuel').getFullList({
        expand: 'truck_id',
        sort: 'created',
        requestKey: null
      });

      // Fetch all trucks
      const trucks = await pb.collection('trucks').getFullList({
        requestKey: null
      });

      if (!fuelRecords || fuelRecords.length === 0 || !trucks || trucks.length === 0) {
        setChartData({
          labels: ['No Data'],
          datasets: [{
            data: [1],
            backgroundColor: ['rgba(128, 128, 128, 0.6)'],
            borderColor: ['rgba(128, 128, 128, 1)'],
            borderWidth: 1
          }]
        });
        setLoading(false);
        return;
      }

      // Calculate fuel efficiency (km/L) for each truck
      const truckEfficiencies = {};

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
            const kmPerLiter = totalDistance / totalFuel;
            const plateNumber = truck.plate_number || `Truck ${truck.id.slice(-6)}`;

            truckEfficiencies[plateNumber] = {
              efficiency: kmPerLiter,
              totalDistance,
              totalFuel,
              validCalculations
            };
          }
        }
      });

      if (Object.keys(truckEfficiencies).length === 0) {
        setChartData({
          labels: ['No Efficiency Data'],
          datasets: [{
            data: [1],
            backgroundColor: ['rgba(128, 128, 128, 0.6)'],
            borderColor: ['rgba(128, 128, 128, 1)'],
            borderWidth: 1
          }]
        });
        setLoading(false);
        return;
      }

      // Categorize efficiency levels
      const efficiencyCategories = {
        'Excellent (>15 km/L)': [],
        'Good (10-15 km/L)': [],
        'Average (5-10 km/L)': [],
        'Poor (<5 km/L)': []
      };

      Object.entries(truckEfficiencies).forEach(([plate, data]) => {
        const efficiency = data.efficiency;
        if (efficiency > 15) {
          efficiencyCategories['Excellent (>15 km/L)'].push({ plate, ...data });
        } else if (efficiency > 10) {
          efficiencyCategories['Good (10-15 km/L)'].push({ plate, ...data });
        } else if (efficiency > 5) {
          efficiencyCategories['Average (5-10 km/L)'].push({ plate, ...data });
        } else {
          efficiencyCategories['Poor (<5 km/L)'].push({ plate, ...data });
        }
      });

      // Prepare chart data
      const labels = [];
      const data = [];
      const backgroundColor = [];
      const borderColor = [];

      const colors = [
        { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgba(34, 197, 94, 1)' }, // Green for excellent
        { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgba(59, 130, 246, 1)' }, // Blue for good
        { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgba(245, 158, 11, 1)' }, // Orange for average
        { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgba(239, 68, 68, 1)' }    // Red for poor
      ];

      let colorIndex = 0;
      Object.entries(efficiencyCategories).forEach(([category, trucks]) => {
        if (trucks.length > 0) {
          labels.push(category);
          data.push(trucks.length);
          backgroundColor.push(colors[colorIndex].bg);
          borderColor.push(colors[colorIndex].border);
        }
        colorIndex++;
      });

      // Calculate overall stats
      const allEfficiencies = Object.values(truckEfficiencies).map(data => data.efficiency);
      const avgEfficiency = allEfficiencies.reduce((a, b) => a + b, 0) / allEfficiencies.length;
      const maxEfficiency = Math.max(...allEfficiencies);
      const minEfficiency = Math.min(...allEfficiencies);

      setEfficiencyStats({
        average: avgEfficiency,
        maximum: maxEfficiency,
        minimum: minEfficiency,
        totalTrucks: allEfficiencies.length,
        categories: efficiencyCategories
      });

      setChartData({
        labels,
        datasets: [{
          data,
          backgroundColor,
          borderColor,
          borderWidth: 2
        }]
      });

    } catch (error) {
      console.error('Error fetching fuel efficiency:', error);
      setError('Failed to load fuel efficiency data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuelEfficiency();
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      title: {
        display: true,
        text: 'Fleet Fuel Efficiency Distribution'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} trucks (${percentage}%)`;
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fuel Efficiency Distribution</CardTitle>
          <CardDescription>Fleet performance by efficiency categories</CardDescription>
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
          <CardTitle>Fuel Efficiency Distribution</CardTitle>
          <CardDescription>Fleet performance by efficiency categories</CardDescription>
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
        <CardTitle>Fuel Efficiency Distribution</CardTitle>
        <CardDescription>Fleet performance categorized by km/L efficiency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {efficiencyStats && (
            <>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Average Efficiency</p>
                <p className="text-lg font-semibold">{efficiencyStats.average.toFixed(2)} km/L</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Best Performer</p>
                <p className="text-lg font-semibold text-green-600">{efficiencyStats.maximum.toFixed(2)} km/L</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Needs Attention</p>
                <p className="text-lg font-semibold text-red-600">{efficiencyStats.minimum.toFixed(2)} km/L</p>
              </div>
            </>
          )}
        </div>
        <div style={{ height: height - 100 }}>
          {chartData && (
            <Pie
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

export default FuelEfficiencyPieChart;
