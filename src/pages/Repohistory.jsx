import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function RepoHistory() {
  const { repoId } = useParams(); // Get repoId from URL
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(repoId || "");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/repos/my-repos", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, // Ensure Auth
    })
      .then((res) => res.json())
      .then((data) => setRepos(data))
      .catch((error) => console.error("Error fetching repos:", error));
  }, []);

  useEffect(() => {
    if (selectedRepo) fetchHistory(selectedRepo);
  }, [selectedRepo]);

  const fetchHistory = (repoId) => {
    setSelectedRepo(repoId);
    fetch(`http://localhost:5000/api/repos/${repoId}/history`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("📜 Fetched history data:", data); // ✅ Debugging log
  
        if (data.srsHistory || data.sourceCodeHistory) {
          const combinedHistory = [...data.srsHistory, ...data.sourceCodeHistory].map((commit) => ({
            ...commit,
            timestamp: new Date(commit.timestamp).toLocaleString(),
          }));
          setHistory(combinedHistory);
        } else {
          setHistory([]);
        }
      })
      .catch((error) => console.error("❌ Error fetching history:", error));
  };
  


  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Repository History</h1>

      {!repoId && (
        <select className="border p-2 my-2" onChange={(e) => fetchHistory(e.target.value)}>
          <option value="">Select a Repository</option>
          {repos.map((repo) => (
            <option key={repo._id} value={repo._id}>
              {repo.name}
            </option>
          ))}
        </select>
      )}

      {selectedRepo && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">History for {selectedRepo}</h2>
          <ul className="border p-2">
          {history.length > 0 ? (
  history.map((commit, index) => (
    <li key={index} className="border-b p-2">
      <p><strong>User:</strong> {commit.user?.username || "Unknown"} ({commit.user?.email || "No Email"})</p>
      <p><strong>Action:</strong> {commit.action}</p>
      <p><strong>File:</strong> {commit.file || "N/A"}</p>
      <p><strong>Timestamp:</strong> {commit.timestamp}</p>
    </li>
  ))
) : (
  <p>No history found</p>
)}

          </ul>
        </div>
      )}
    </div>
  );
}
