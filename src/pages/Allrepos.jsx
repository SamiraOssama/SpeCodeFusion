import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FiGithub, FiPlusCircle, FiSearch, FiClock } from "react-icons/fi";
import "./All.css";

const Allrepos = () => {
  const [repos, setRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("token");

  // Color scheme
  const colors = {
    primary: "#2563EB", // Vibrant blue
    secondary: "#10B981", // Emerald green
    accent: "#F59E0B", // Amber
    background: "#F9FAFB",
    card: "#FFFFFF",
    text: "#1F2937",
    muted: "#6B7280"
  };

  // Animation variants
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

  useEffect(() => {
    const fetchRepos = async () => {
      if (!token) {
        console.error("🔒 No token found! User not logged in.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        console.log("📡 Fetching all repositories...");
        const response = await axios.get("http://localhost:5000/api/repos/my-repos", {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("✅ Fetched Repositories:", response.data);
        setRepos(response.data);
      } catch (error) {
        console.error("❌ Error fetching repositories:", error.response?.data || error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepos();
  }, [token]);

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      className="all-repos-container"
      initial="hidden"
      animate="visible"
      variants={container}
      style={{ background: colors.background }}
    >
      {/* Header Section */}
      <motion.header 
        className="repos-header"
        variants={item}
        style={{ background: colors.primary }}
      >
        <div className="header-content">
          <FiGithub className="header-icon" />
          <h1>My Repositories</h1>
          <Link to="/Dashboarddmalak" className="create-repo-btn">
            <FiPlusCircle /> New Repository
          </Link>
        </div>
      </motion.header>

      {/* Search Bar */}
      <motion.div 
        className="search-container"
        variants={item}
      >
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ color: colors.text }}
          />
        </div>
        <div className="repo-count">
          {filteredRepos.length} {filteredRepos.length === 1 ? "repository" : "repositories"}
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoading ? (
        <motion.div 
          className="loading-container"
          variants={item}
        >
          <div className="loading-spinner" style={{ borderTopColor: colors.primary }} />
          <p>Loading your repositories...</p>
        </motion.div>
      ) : (
        <motion.ul 
          className="repos-grid"
          variants={container}
        >
          <AnimatePresence>
            {filteredRepos.length > 0 ? (
              filteredRepos.map((repo) => (
                <motion.li
                  key={repo._id}
                  variants={item}
                  whileHover="hover"
                  className="repo-card"
                  style={{ background: colors.card }}
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
                        </div>
                      </div>
                      <div className="repo-actions">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="view-btn"
                          style={{ background: colors.secondary }}
                        >
                          View Details
                        </motion.div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.li>
              ))
            ) : (
              <motion.div 
                className="empty-state"
                variants={item}
              >
                {searchTerm ? (
                  <>
                    <p>🔍 No repositories found matching "{searchTerm}"</p>
                    <button 
                      onClick={() => setSearchTerm("")}
                      style={{ background: colors.accent }}
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <p>📭 You don't have any repositories yet</p>
                    <Link 
                      to="/create-repo" 
                      className="create-btn"
                      style={{ background: colors.primary }}
                    >
                      <FiPlusCircle /> Create your first repository
                    </Link>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.ul>
      )}
    </motion.div>
  );
};

export default Allrepos;