import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Upload from "./Upload"; 
import RepoDetails from "./RepoDetails";
import "./All.css";

const Dashboarddmalak = () => {
  const [repos, setRepos] = useState([]);
  const [repoName, setRepoName] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserRepos = async () => {
      if (!token) {
        console.error("❌ No token found. Please log in.");
        return;
      }
  
      console.log("🔑 Sending Token:", token);
  
      try {
        const response = await axios.get("http://localhost:5000/api/repos/my-repos", {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        console.log("✅ Response:", response.data);
        setRepos(response.data);
      } catch (error) {
        console.error("❌ Error fetching repositories:", error.response?.data || error);
      }
    };
  
    fetchUserRepos();
  }, [token]);
  

  const handleCreateRepo = async () => {
    if (!token) {
      alert("You must be logged in to create a repository!");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/repos/create",
        { name: repoName },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      console.log("✅ Repository Created Successfully:", response.data);
      setRepos((prevRepos) => [...prevRepos, response.data.repo]);
      setRepoName("");
      alert("Repository created successfully!");
    } catch (error) {
      console.error("❌ Error Creating Repository:", error.response?.data || error);
      alert("Failed to create repository: " + (error.response?.data?.message || "Unknown error"));
    }
  };

  const handleRepoSelect = (repo) => {
    setSelectedRepoId(repo._id);
    console.log("Navigating to step-upload with repo:", repo);
    navigate('/step-upload', { 
      state: { selectedRepo: repo }
    });
  };

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>

      <div className="create-repo-section">
      <input
        type="text"
        placeholder="Enter Repo Name"
        value={repoName}
        onChange={(e) => setRepoName(e.target.value)}
      />
      <button onClick={handleCreateRepo}>Create Repo</button>
      </div>

      <h3>Your Repositories</h3>
      <div className="repo-list">
        {repos.length > 0 ? (
          repos.map((repo) => (
            <div key={repo._id} className="repo-card" onClick={() => handleRepoSelect(repo)}>
              <h4>{repo.name || "Unnamed Repository"}</h4>
              <button className="analyze-btn">Analyze Requirements</button>
            </div>
          ))
        ) : (
          <p>No repositories available.</p>
        )}
      </div>

      {selectedRepoId && <RepoDetails repoId={selectedRepoId} />}
      {selectedRepoId && <Upload repoId={selectedRepoId} />}

      <style jsx>{`
        .dashboard-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .create-repo-section {
          margin-bottom: 30px;
          display: flex;
          gap: 10px;
        }

        .repo-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .repo-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: transform 0.2s;
        }

        .repo-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .repo-card h4 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .analyze-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
        }

        .analyze-btn:hover {
          background: #45a049;
        }

        input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          flex: 1;
        }

        button {
          padding: 8px 16px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }

        button:hover {
          background: #45a049;
        }
      `}</style>
    </div>
  );
};

export default Dashboarddmalak;
