import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiEdit, FiX, FiSave, FiLock, FiTrash2, FiFileText, FiMoon, FiSun, FiSettings, FiUser } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";
import "./UserProfile.css";
import ChangePassword from "../pages/ChangePassword";

const UserProfile = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState({
    username: "",
    email: "",
    isGoogleUser: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

 
  const colors = {
    primary: "#3B82F6",
    secondary: "#10B981",
    accent: "#EF4444",
    background: darkMode ? "#1F2937" : "#F9FAFB",
    card: darkMode ? "#374151" : "#FFFFFF",
    text: darkMode ? "#F9FAFB" : "#1F2937",
    muted: darkMode ? "#9CA3AF" : "#6B7280",
  };

 
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  const slideUp = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
  };

  const cardHover = {
    hover: {
      y: -5,
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    },
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchUserProfile(parsedUser.id);
      fetchReports(parsedUser.id);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const fetchUserProfile = async (userId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await axios.get(`http://localhost:5000/api/users/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({
        username: res.data.username,
        email: res.data.email || "No email provided",
        isGoogleUser: res.data.isGoogleUser || false,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReports = async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/reports/user/${userId}`);
      setReports(res.data.reports || []);
    } catch (err) {
      console.error("Failed to fetch reports", err);
      setReports([]);
    }
  };

  const toggleEdit = () => setEditing(!editing);

  const updateProfile = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await axios.put(
        "http://localhost:5000/api/users/profile",
        { username: user.username, email: user.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(res.data.user);
      showNotification("Profile updated successfully!", "success");
      setEditing(false);
    } catch (err) {
      showNotification(err.response?.data?.message || "Update failed", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  const deleteProfile = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      await axios.delete("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.removeItem("token");
      showNotification("Account deleted successfully", "success");
      navigate("/");
    } catch (err) {
      showNotification(err.response?.data?.message || "Deletion failed", "error");
    }
  };

  const showNotification = (message, type) => {
    const notification = document.createElement("div");
    notification.className = `flash-notification ${type}`;
    notification.innerHTML = `<span>${type === "success" ? "✓" : "⚠️"}</span><p>${message}</p>`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  };

  return (
    <div className={`min-h-screen w-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`container mx-auto px-4 py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className={`max-w-4xl mx-auto rounded-lg overflow-hidden ${
            darkMode ? 'bg-gray-800 shadow-xl' : 'bg-white shadow-lg'
          }`}
        >
         
          <div className={`relative p-6 ${darkMode ? 'border-b border-gray-700' : 'border-b'}`}>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <FiUser className="text-blue-500" />
              User Profile
            </h1>
          </div>

       
          <div className={`p-6 space-y-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          
            <motion.div 
              className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
              variants={slideUp} 
              whileHover={cardHover}
            >
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {user.username || "Anonymous User"}
                    </h2>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                      {user.email || "No email provided"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={toggleEdit}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                        darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      <FiEdit />
                      {editing ? "Cancel" : "Edit Profile"}
                    </motion.button>
                    {!user.isGoogleUser && (
                      <motion.button
                        onClick={() => setShowModal(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                          darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        <FiLock />
                        Change Password
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

           
            <motion.div 
              className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
              variants={slideUp}
            >
              <div className="flex items-center gap-2 mb-4">
                <FiSettings className="text-blue-500" />
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Preferences
                </h3>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Dark Mode
                  </h4>
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    {darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                  </p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  {darkMode ? (
                    <>
                      <FiSun size={20} /> Light Mode
                    </>
                  ) : (
                    <>
                      <FiMoon size={20} /> Dark Mode
                    </>
                  )}
                </button>
              </div>
            </motion.div>

           
            <motion.div 
              className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
              variants={slideUp}
            >
              <div className="flex items-center gap-2 mb-4">
                <FiFileText className="text-blue-500" />
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Reports History
                </h3>
              </div>

              {isLoading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : reports.length > 0 ? (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <motion.div 
                      key={report.id}
                      className={`p-4 rounded-lg ${
                        darkMode ? 'bg-gray-800 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'
                      }`}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {report.title}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(report.date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          report.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : report.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  No reports found
                </p>
              )}
            </motion.div>

           
            <div className="flex justify-center gap-4 pt-4">
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                <FiLock /> Logout
              </motion.button>

              <motion.button
                onClick={deleteProfile}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                  darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                <FiTrash2 /> Delete Account
              </motion.button>
            </div>
          </div>
        </motion.div>

       
        <AnimatePresence>
          {editing && (
            <motion.div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className={`w-full max-w-md rounded-lg p-6 ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Edit Profile
                  </h3>
                  <button 
                    onClick={toggleEdit}
                    className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <form onSubmit={updateProfile} className="space-y-4">
                  <div>
                    <label className={`block mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Username
                    </label>
                    <input 
                      type="text"
                      value={user.username}
                      onChange={(e) => setUser({ ...user, username: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Email
                    </label>
                    <input 
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={toggleEdit}
                      className={`px-4 py-2 rounded-lg ${
                        darkMode
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                        darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      <FiSave /> Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showModal && <ChangePassword onClose={() => setShowModal(false)} />}
      </div>
    </div>
  );
};

export default UserProfile;
