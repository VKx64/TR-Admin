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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import pb from '@/services/pocketbase';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MonthlyFuelExpenseChart = ({ height = 400 }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('6'); // Default to 6 months
  const [monthlyStats, setMonthlyStats] = useState(null);
  const chartRef = useRef();

  const fetchMonthlyExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range based on selected period
      const months = parseInt(selectedPeriod);
      const endDate = new Date();
      const startDate = subMonths(startOfMonth(endDate), months - 1);

      // Fetch fuel records within the date range
      const fuelRecords = await pb.collection('truck_fuel').getFullList({
        expand: 'truck_id',
        filter: `created >= "${startDate.toISOString()}" && created <= "${endDate.toISOString()}"`,
        sort: 'created',
        requestKey: null
      });

      if (!fuelRecords || fuelRecords.length === 0) {
        // Generate empty months for the selected period
        const emptyMonths = [];
        const emptyLabels = [];
        for (let i = months - 1; i >= 0; i--) {
          const monthDate = subMonths(endDate, i);
          emptyLabels.push(format(monthDate, 'MMM yyyy'));
          emptyMonths.push(0);
        }

        setChartData({
          labels: emptyLabels,
          datasets: [{
            label: 'No Data Available',
            data: emptyMonths,
            backgroundColor: 'rgba(128, 128, 128, 0.6)',
            borderColor: 'rgba(128, 128, 128, 1)',
            borderWidth: 1
          }]
        });
        setLoading(false);
        return;
      }

      // Group expenses by month
      const monthlyExpenses = {};
      const monthlyVolumes = {};
      const monthlyTransactions = {};

      // Initialize all months in the range
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(endDate, i);
        const monthKey = format(monthDate, 'yyyy-MM');
        const monthLabel = format(monthDate, 'MMM yyyy');

        monthlyExpenses[monthKey] = { label: monthLabel, total: 0 };
        monthlyVolumes[monthKey] = { label: monthLabel, total: 0 };
        monthlyTransactions[monthKey] = { label: monthLabel, count: 0 };
      }

      // Aggregate fuel records by month
      fuelRecords.forEach(record => {
        const recordDate = new Date(record.created);
        const monthKey = format(recordDate, 'yyyy-MM');

        if (monthlyExpenses[monthKey]) {
          const expense = (record.fuel_amount || 0) * (record.fuel_price || 0);
          monthlyExpenses[monthKey].total += expense;
          monthlyVolumes[monthKey].total += (record.fuel_amount || 0);
          monthlyTransactions[monthKey].count += 1;
        }
      });

      // Prepare chart data
      const labels = Object.values(monthlyExpenses).map(month => month.label);
      const expenseData = Object.values(monthlyExpenses).map(month => month.total);
      const volumeData = Object.values(monthlyVolumes).map(month => month.total);

      // Generate gradient colors
      const generateGradientColor = (ctx, chartArea, colorStart, colorEnd) => {
        if (!chartArea) return colorStart;

        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, colorEnd);
        gradient.addColorStop(1, colorStart);
        return gradient;
      };

      setChartData({
        labels,
        datasets: [
          {
            label: 'Monthly Fuel Expense ($)',
            data: expenseData,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            yAxisID: 'y'
          },
          {
            label: 'Fuel Volume (Liters)',
            data: volumeData,
            backgroundColor: 'rgba(16, 185, 129, 0.6)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 2,
            yAxisID: 'y1',
            type: 'line',
            tension: 0.4
          }
        ]
      });

      // Calculate statistics
      const totalExpense = expenseData.reduce((sum, val) => sum + val, 0);
      const totalVolume = volumeData.reduce((sum, val) => sum + val, 0);
      const avgMonthlyExpense = totalExpense / months;
      const avgPricePerLiter = totalVolume > 0 ? totalExpense / totalVolume : 0;
      const totalTransactions = Object.values(monthlyTransactions).reduce((sum, month) => sum + month.count, 0);

      setMonthlyStats({
        totalExpense,
        totalVolume,
        avgMonthlyExpense,
        avgPricePerLiter,
        totalTransactions,
        period: months
      });

    } catch (error) {
      console.error('Error fetching monthly fuel expenses:', error);
      setError('Failed to load monthly expense data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyExpenses();
  }, [selectedPeriod]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Monthly Fuel Expenses - Last ${selectedPeriod} Months`
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            if (context.datasetIndex === 0) {
              return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
            } else {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} L`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Month'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Expense ($)'
        },
        beginAtZero: true
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Volume (Liters)'
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
          <CardTitle>Monthly Fuel Expenses</CardTitle>
          <CardDescription>Track monthly spending and volume trends</CardDescription>
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
          <CardTitle>Monthly Fuel Expenses</CardTitle>
          <CardDescription>Track monthly spending and volume trends</CardDescription>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Monthly Fuel Expenses</CardTitle>
            <CardDescription>Track monthly spending patterns and volume consumption</CardDescription>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="12">Last 12 Months</SelectItem>
              <SelectItem value="24">Last 24 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {monthlyStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Expense</p>
              <p className="text-lg font-semibold text-blue-600">
                ${monthlyStats.totalExpense.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Volume</p>
              <p className="text-lg font-semibold text-green-600">
                {monthlyStats.totalVolume.toFixed(0)} L
              </p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">Monthly Average</p>
              <p className="text-lg font-semibold text-orange-600">
                ${monthlyStats.avgMonthlyExpense.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Avg Price/Liter</p>
              <p className="text-lg font-semibold text-purple-600">
                ${monthlyStats.avgPricePerLiter.toFixed(2)}
              </p>
            </div>
          </div>
        )}
        <div style={{ height: height - 150 }}>
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

export default MonthlyFuelExpenseChart;
