import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/Navbar/AdminSidebar";

const AdminSettings = () => {
  // Load dark mode state from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState("Enabled");
  const [systemNotifications, setSystemNotifications] = useState("Enabled");

  // Apply dark mode changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-6 text-blue-700">
          Admin Settings
        </h1>

        {/* Theme Customization */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Theme Customization</h2>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
              className="hidden"
            />
            <div className="w-10 h-5 bg-gray-300 rounded-full relative transition-all">
              <div
                className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 left-1 transform transition-all ${
                  darkMode ? "translate-x-5 bg-blue-500" : ""
                }`}
              ></div>
            </div>
            <span className="ml-3 text-gray-700 dark:text-white">
              {darkMode ? "Dark Mode Enabled" : "Enable Dark Mode"}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
