import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/Layout/AdminLayout';

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      navigate("/login"); 
    } else {
      setAdmin(user); 
    }
  }, [navigate]);

  if (!admin) return null; 

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Dashboard Header */}
        <header className="text-3xl font-bold mb-6 text-blue-700">
          Admin Dashboard
        </header>

        <div className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center mb-4">
            {admin.username ? admin.username[0].toUpperCase() : "A"}
          </div>
          <h2 className="text-xl font-semibold">{admin.username}</h2>
          <p className="text-gray-600">{admin.email}</p>
          <p className="text-gray-500 text-sm">{admin.role || "No Role"}</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
