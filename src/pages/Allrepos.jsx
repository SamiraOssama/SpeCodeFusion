import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FiGithub, FiPlusCircle, FiSearch, FiClock, FiUsers, FiCheck, FiX, FiTrash2 } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";
import "./All.css";

const Allrepos = () => {
  const { darkMode } = useTheme();
  const [repos, setRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [users, setUsers] = useState({});
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user"));

  // Color scheme based on theme
  const colors = {
    primary: "#2563EB",
    secondary: "#10B981",
    accent: "#F59E0B",
    background: darkMode ? "#1F2937" : "#F9FAFB",
    card: darkMode ? "#374151" : "#FFFFFF",
    text: darkMode ? "#F9FAFB" : "#1F2937",
    muted: darkMode ? "#9CA3AF" : "#6B7280"
  };

 
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren"
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const cardHover = {
    hover: {
      y: -5,
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
      transition: { duration: 0.2 }
    }
  };

  const isRepoOwner = (repo) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return false;

      const base64Url = tokenParts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      const currentUserId = payload.userId || payload.user_id || payload.id || payload._id || payload.sub;
      if (!currentUserId) return false;

      const repoOwnerIdString = repo.owner._id.toString().trim();
      const currentUserIdString = currentUserId.toString().trim();
      
      console.log('🔍 Owner check:', {
        repoOwnerIdString,
        currentUserIdString,
        isMatch: repoOwnerIdString === currentUserIdString
      });

      return repoOwnerIdString === currentUserIdString;
    } catch (error) {
      console.error('Error checking owner status:', error);
      return false;
    }
  };

  useEffect(() => {
    const fetchRepos = async () => {
      if (!token) {
        console.error("🔒 No token found! User not logged in.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        console.log("📡 Fetching all repositories...");
        const response = await axios.get("http://localhost:5000/api/repos/my-repos", {
          headers: { 
            Authorization: `Bearer ${token}`
          }
        });

        console.log("Fetched repos:", response.data);
        console.log("Current user:", currentUser);
        setRepos(response.data || []);
      } catch (error) {
        console.error("❌ Error fetching repositories:", error.response?.data || error.message);
        setError("Failed to load repositories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepos();
  }, [token]);

  useEffect(() => {
    const fetchUsers = async (userIds) => {
      try {
        const uniqueIds = [...new Set(userIds)];
        const userPromises = uniqueIds.map(id =>
          axios.get(`http://localhost:5000/api/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
        const responses = await Promise.all(userPromises);
        const newUsers = {};
        responses.forEach(response => {
          if (response.data) {
            newUsers[response.data._id] = response.data.username;
          }
        });
        setUsers(newUsers);
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };

    if (repos.length > 0) {
      const userIds = repos.map(repo => repo.owner).filter(Boolean);
      fetchUsers(userIds);
    }
  }, [repos, token]);

  const getOwnershipDisplay = (repo) => {
    if (!repo.owner || !currentUser) {
      console.log('❌ Missing owner or currentUser:', { 
        hasOwner: !!repo.owner, 
        hasCurrentUser: !!currentUser,
        repo: repo,
        currentUser: currentUser 
      });
      return 'Loading...';
    }

    
    const token = localStorage.getItem('token');
    let currentUserId;
    
    if (!token) {
      console.log('❌ No token found in localStorage');
      return 'Error: No authentication token';
    }

    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('❌ Invalid token format - expected 3 parts, got:', tokenParts.length);
        return 'Error: Invalid token format';
      }

      const base64Url = tokenParts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      
     
      const decodedPayload = window.atob(base64);
      const payload = JSON.parse(decodedPayload);
      
     
      console.log('📦 Full JWT payload:', payload);
      
     
      currentUserId = payload.userId || payload.user_id || payload.id || payload._id || payload.sub;
      
      console.log('🔍 Extracted user ID:', {
        currentUserId,
        availableFields: Object.keys(payload),
        payloadExample: payload
      });

      if (!currentUserId) {
        console.error('❌ Could not find user ID in payload. Available fields:', Object.keys(payload));
        return 'Error: Could not find user ID in token';
      }

      
      const repoOwnerIdString = repo.owner._id.toString().trim();
      const currentUserIdString = currentUserId.toString().trim();
      
     
      console.log('🔄 ID Comparison:', {
        repoOwnerIdString,
        currentUserIdString,
        repoOwnerLength: repoOwnerIdString.length,
        currentUserLength: currentUserIdString.length,
        isExactMatch: repoOwnerIdString === currentUserIdString
      });

      
      const isOwner = repoOwnerIdString === currentUserIdString;
      
      if (isOwner) {
        return (
          <span style={{ color: colors.muted }}>
            <FiUsers /> Owner: You
          </span>
        );
      }
    } catch (error) {
      console.error('❌ Error in ownership check:', {
        errorMessage: error.message,
        errorStack: error.stack,
        repoOwner: repo.owner,
        tokenExists: !!token
      });
      return `Error checking ownership: ${error.message}`;
    }

    return (
      <span style={{ color: colors.muted }}>
        <FiUsers /> Shared with you by {repo.owner.username}
      </span>
    );
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-red-500 text-xl font-semibold mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`container mx-auto px-4 py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={container}
          className="space-y-6"
        >
         
          <div className={`flex items-center justify-between ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <h1 className="text-2xl font-bold">My Repositories</h1>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500'
                    : 'bg-white border-gray-300 focus:ring-blue-400'
                }`}
              />
            </div>
          </div>

          {/* Repository Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repos
              .filter(repo => repo.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(repo => (
                <motion.div
                  key={repo._id}
                  variants={item}
                  whileHover="hover"
                  className={`rounded-lg p-6 transition-all ${
                    darkMode
                      ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
                      : 'bg-white hover:bg-gray-50 shadow-md'
                  }`}
                >
                  <Link to={`/repo/${repo._id}`} className="repo-link">
                    <motion.div 
                      className="repo-card-inner"
                      variants={cardHover}
                    >
                      <div className="repo-icon">
                        <FiGithub />
                      </div>
                      <div className="repo-info">
                        <h3 style={{ color: colors.primary }}>{repo.name}</h3>
                        <div className="repo-meta">
                          <span style={{ color: colors.muted }}>
                            <FiClock /> Created: {new Date(repo.createdAt).toLocaleDateString()}
                          </span>
                          <span style={{ color: colors.muted, marginLeft: '10px' }}>
                            {getOwnershipDisplay(repo)}
                          </span>
                        </div>
                      </div>
                      <div className="repo-actions">
                        <Link 
                          to={`/repo/${repo._id}/settings`} 
                          className="view-btn"
                          style={{ 
                            background: colors.primary,
                            width: '100%',
                            maxWidth: '200px',
                            padding: '8px 24px',
                            borderRadius: '6px',
                            color: 'white',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            View Details
                          </motion.div>
                        </Link>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
          </div>

          {/* Empty State */}
          {repos.length === 0 && !isLoading && (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <p className="text-xl">No repositories found</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <p className="text-xl">Loading repositories...</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Allrepos;