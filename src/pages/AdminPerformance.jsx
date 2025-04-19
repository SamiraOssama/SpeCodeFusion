import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import Navbar from "../components/Navbar/Navbar";
import AdminSidebar from "../components/Navbar/adminsidebar";

const AdminPerformance = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data from the backend
  useEffect(() => {
    fetch("http://localhost:3000/api/admin/performance")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch performance data");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched Performance Data:", data);
        setPerformanceData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching performance data:", error);
        setLoading(false);
      });
  }, []);

  // KPI Data for Pie Chart (Updated dynamically)
  const kpiData = performanceData
    ? [
        { name: "Active Users", value: performanceData.activeUsers, color: "#0088FE" },
        { name: "Reports Completed", value: performanceData.reportsCompleted, color: "#00C49F" },
        { name: "System Health", value: performanceData.systemHealth, color: "#FFBB28" },
      ]
    : [];

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <div className="flex-1 p-6 bg-gray-100">
          {/* Dashboard Header */}
          <header className="text-2xl font-semibold text-blue-500 mb-6">
            Admin Performance Dashboard
          </header>

          {/* Show Loading State */}
          {loading ? (
            <p className="text-center text-lg text-gray-700">Loading performance data...</p>
          ) : (
            <>
              {/* Overview Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-4 shadow-md rounded-lg text-center">
                  <h3 className="font-semibold text-lg">System Uptime</h3>
                  <p className="text-xl font-bold text-green-600">{performanceData.uptime}</p>
                </div>
                <div className="bg-white p-4 shadow-md rounded-lg text-center">
                  <h3 className="font-semibold text-lg">Response Time</h3>
                  <p className="text-xl font-bold text-blue-500">{performanceData.responseTime}</p>
                </div>
                <div className="bg-white p-4 shadow-md rounded-lg text-center">
                  <h3 className="font-semibold text-lg">Active Users</h3>
                  <p className="text-xl font-bold text-purple-600">{performanceData.activeUsers}</p>
                </div>
              </div>

              {/* KPI Section with Pie Chart */}
              <div className="bg-white p-6 shadow-md rounded-lg">
                <h3 className="font-semibold text-lg mb-4">KPI Overview</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={kpiData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {kpiData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminPerformance;
