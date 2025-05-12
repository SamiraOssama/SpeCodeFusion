import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../Navbar/AdminSidebar';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex">
      <AdminSidebar />
      <div className="flex-1 bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout; 