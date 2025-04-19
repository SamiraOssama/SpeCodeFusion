import { useEffect, useState } from "react";
import axios from "axios";
import Upload from "./Upload"; 
import RepoDetails from "./RepoDetails";
import "./All.css";

const Dashboarddmalak = () => {
  const [repos, setRepos] = useState([]);
  const [repoName, setRepoName] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const token = localStorage.getItem("token");

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

  return (
    <div>
      <h2>Dashboard</h2>

      <input
        type="text"
        placeholder="Enter Repo Name"
        value={repoName}
        onChange={(e) => setRepoName(e.target.value)}
      />
      <button onClick={handleCreateRepo}>Create Repo</button>

      <h3>Your Repositories</h3>
      <ul>
        {repos.length > 0 ? (
          repos.map((repo) => (
            <li key={repo._id} onClick={() => setSelectedRepoId(repo._id)}>
              <strong>{repo.name || "Unnamed Repository"}</strong>
            </li>
          ))
        ) : (
          <p>No repositories available.</p>
        )}
      </ul>

      {selectedRepoId && <RepoDetails repoId={selectedRepoId} />}
      {selectedRepoId && <Upload repoId={selectedRepoId} />}
    </div>
  );
};

export default Dashboarddmalak;
