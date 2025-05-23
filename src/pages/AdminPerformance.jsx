import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminSidebar from "../components/Navbar/adminsidebar"; 

const AdminPerformance = () => {

  const [stats, setStats] = useState({
    userCount: 0,
    repoCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/admin/performance-stats');
        setStats(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div>Loading statistics...</div>;
  }

  return (
    <div className="min-h-screen flex">
      <AdminSidebar /> 
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-blue-700">System Statistics</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-blue-600 text-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold">Total Users</h2>
            <p className="text-3xl">{stats.userCount}</p>
          </div>

          <div className="bg-blue-600 text-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold">Total Repositories</h2>
            <p className="text-3xl">{stats.repoCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPerformance;
