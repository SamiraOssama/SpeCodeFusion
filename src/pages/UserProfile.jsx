import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiEdit, FiX, FiSave, FiLock, FiTrash2, FiFileText } from "react-icons/fi";
import avatar from "../assets/images/profileavatar.png";
import Navbar from "../components/Navbar/Navbar";
import "./UserProfile.css";

const UserProfile = () => {
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState({
    name: "",
    email: "",
    profilePicture: avatar,
  });
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Color scheme
  const colors = {
    primary: "#3B82F6", // Blue
    secondary: "#10B981", // Green
    accent: "#EF4444", // Red
    background: "#F9FAFB",
    card: "#FFFFFF",
    text: "#1F2937",
    muted: "#6B7280"
  };

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  };

  const slideUp = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } }
  };

  const cardHover = {
    hover: { 
      y: -5,
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [profileRes, reportsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/users/profile", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:5000/api/users/reports", {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);
        
        setUser(profileRes.data);
        setReports(reportsRes.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

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
        { username: user.name, email: user.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUser(res.data.user);
      showNotification("Profile updated successfully!", "success");
      setEditing(false);
    } catch (err) {
      showNotification(err.response?.data?.message || "Update failed", "error");
    }
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
    notification.innerHTML = `
      <span>${type === "success" ? "✓" : "⚠️"}</span>
      <p>${message}</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  };

  return (
    <>
      <Navbar />
      <motion.div 
        className="user-profile-container"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        style={{ background: colors.background }}
      >
        {/* Header */}
        <motion.header 
          className="profile-header"
          variants={slideUp}
          style={{ background: colors.primary }}
        >
          <h1>👤 User Profile</h1>
        </motion.header>

        {/* Main Content */}
        <div className="profile-content">
          {/* Profile Card */}
          <motion.div 
            className="profile-card"
            variants={slideUp}
            whileHover={cardHover}
            style={{ background: colors.card }}
          >
            <div className="profile-info">
              <motion.div 
                className="avatar-container"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img 
                  src={user.profilePicture} 
                  alt="Profile" 
                  className="profile-avatar"
                />
                <div className="avatar-overlay">📷 Change</div>
              </motion.div>
              
              <div className="profile-details">
                <h2 style={{ color: colors.text }}>{user.name || "Anonymous User"}</h2>
                <p style={{ color: colors.muted }}>{user.email || "No email provided"}</p>
              </div>
            </div>

            <div className="profile-actions">
              <motion.button
                onClick={toggleEdit}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ background: colors.primary }}
              >
                <FiEdit /> {editing ? "Cancel" : "Edit Profile"}
              </motion.button>
              
              <Link 
                to="/change-password" 
                className="change-password-btn"
                style={{ background: colors.secondary }}
              >
                <FiLock /> Change Password
              </Link>
            </div>
          </motion.div>

          {/* Reports Section */}
          <motion.div 
            className="reports-section"
            variants={slideUp}
            style={{ background: colors.card }}
          >
            <div className="section-header">
              <FiFileText className="section-icon" />
              <h3>Reports History</h3>
            </div>
            
            {isLoading ? (
              <div className="loading-spinner" />
            ) : reports.length > 0 ? (
              <div className="reports-table">
                <div className="table-header">
                  <span>Date</span>
                  <span>Title</span>
                  <span>Status</span>
                </div>
                {reports.map((report) => (
                  <motion.div 
                    key={report.id}
                    className="report-row"
                    whileHover={{ background: "#F3F4F6" }}
                    transition={{ duration: 0.2 }}
                  >
                    <span>{new Date(report.date).toLocaleDateString()}</span>
                    <span>{report.title}</span>
                    <span className={`status-badge ${report.status.toLowerCase()}`}>
                      {report.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-reports">
                <p>📭 No reports found</p>
              </div>
            )}
          </motion.div>

          {/* Delete Account Section */}
          <motion.div 
            className="delete-section"
            variants={slideUp}
          >
            <motion.button
              onClick={deleteProfile}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ background: colors.accent }}
            >
              <FiTrash2 /> Delete Account
            </motion.button>
          </motion.div>
        </div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {editing && (
            <motion.div 
              className="edit-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="edit-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{ background: colors.card }}
              >
                <div className="modal-header">
                  <h3>✏️ Edit Profile</h3>
                  <button onClick={toggleEdit} className="close-btn">
                    <FiX />
                  </button>
                </div>
                
                <form onSubmit={updateProfile}>
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => setUser({ ...user, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ background: colors.primary }}
                  >
                    <FiSave /> Save Changes
                  </motion.button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default UserProfile;