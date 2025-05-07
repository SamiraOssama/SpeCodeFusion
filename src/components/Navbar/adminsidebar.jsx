import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHome, FaUsers, FaUserPlus, FaCog, FaSignOutAlt, FaChartBar ,FaArchive} from 'react-icons/fa';

const AdminSidebar = () => {
  const navigate = useNavigate();

 
  const handleLogout = () => {
    
    localStorage.removeItem('authToken'); 
    
    // Redirect to login page or homepage after logout
    navigate('/login');
  };

  return (
    <div className="w-64 h-screen bg-blue-600 text-white flex flex-col">
      {/* Sidebar Header */}
      <div className="p-6 text-2xl font-bold border-b border-blue-400">
        Admin Panel
      </div>

      {/* Sidebar Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-4">
          <li>
            <Link 
              to="/AdminDashboard" 
              className="flex items-center space-x-3 px-4 py-2 hover:bg-blue-500 rounded-md transition"
            >
              <FaHome />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link 
              to="/AdminUsers" 
              className="flex items-center space-x-3 px-4 py-2 hover:bg-blue-500 rounded-md transition"
            >
              <FaUsers />
              <span>User </span>
            </Link>
          </li>
          <li>
            <Link 
              to="/AdminAddUser" 
              className="flex items-center space-x-3 px-4 py-2 hover:bg-blue-500 rounded-md transition"
            >
              <FaUserPlus />
              <span>Add User</span>
            </Link>
          </li>
         
          <li>
            <Link 
              to="/AdminPerformance" 
              className="flex items-center space-x-3 px-4 py-2 hover:bg-blue-500 rounded-md transition"
            >
              <FaChartBar />
              <span>System Performance</span>
            </Link>
          </li>
          <li>
            <Link 
              to="/AdminSettings" 
              className="flex items-center space-x-3 px-4 py-2 hover:bg-blue-500 rounded-md transition"
            >
              <FaCog />
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4">
        <button
          onClick={handleLogout} // Call the logout function when button is clicked
          className="w-full flex items-center space-x-3 px-4 py-2 bg-blue-500 hover:bg-red-600 rounded-md transition"
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
