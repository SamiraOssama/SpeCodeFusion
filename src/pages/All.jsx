import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

export default function AllRepos() {
  const { darkMode } = useTheme();
  const [repos, setRepos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [owner, setOwner] = useState(null);
  const [ownerError, setOwnerError] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [userId, setUserId] = useState(null);

 
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser._id) {
          console.log("✅ User ID found:", parsedUser._id);
          setUserId(parsedUser._id);
        }
      } catch (error) {
        console.error("❌ Error parsing user:", error);
      }
    }
  }, []);


  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/repos/all");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        setRepos(data);
      } catch (err) {
        console.error("Error fetching repositories:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

 
  useEffect(() => {
    if (!userId) return;

    const checkRequestStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/repos/check-request/${userId}`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.status !== "pending") {
          // Update the UI if request status changed
          setRepos(prevRepos => 
            prevRepos.map(repo => ({
              ...repo,
              requests: repo.requests?.filter(req => req.user !== userId)
            }))
          );
        }
      } catch (error) {
        console.error("Error checking request status:", error);
      }
    };

   
    const interval = setInterval(checkRequestStatus, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  
  const fetchOwnerDetails = async (repoId) => {
    try {
      setOwnerError(null);
      setOwner(null);

      const response = await fetch(`http://localhost:5000/api/repos/owner/${repoId}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();

      setOwner({
        id: data._id || "N/A",
        name: data.name || "N/A",
        email: data.email || "N/A",
        organization: data.organization || "N/A",
      });
    } catch (err) {
      console.error("Error fetching owner details:", err);
      setOwnerError(err.message);
    }
  };


  const handleRepoClick = (repo) => {
    console.log("🖱️ Selected Repository:", repo);
    setSelectedRepo(repo);
    setRequestStatus(null);
    fetchOwnerDetails(repo._id);
  };

 
  const handleRequestAccess = async () => {
    console.log("📡 Initiating access request...");
    
    if (!selectedRepo) {
      setRequestStatus("Please select a repository first");
      return;
    }

    try {
      
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setRequestStatus("Please log in first");
        return;
      }

      let user;
      try {
        user = JSON.parse(storedUser);
      } catch (e) {
        throw new Error("Invalid user data in storage");
      }

    
      if (!user?._id || !user?.email) {
        console.error("User data missing required fields:", user);
        throw new Error("Your account information is incomplete. Please log out and log in again.");
      }

    
      const token = localStorage.getItem("token");
      if (!token) {
        setRequestStatus("Session expired. Please log in again.");
        return;
      }

      console.log("🔄 Sending request with:", {
        userId: user._id,
        userEmail: user.email
      });

      const response = await fetch(
        `http://localhost:5000/api/repos/${selectedRepo._id}/request-access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ 
            userId: user._id,
            userEmail: user.email 
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Request failed");
      }

      const data = await response.json();
      setRequestStatus("Access request sent successfully!");
      
      
      setSelectedRepo(prev => ({
        ...prev,
        requests: [...(prev.requests || []), {
          _id: data.request._id || Date.now().toString(),
          user: user._id,
          email: user.email,
          status: "pending",
          requestedAt: new Date()
        }]
      }));

    } catch (error) {
      console.error("❌ Request failed:", error);
      setRequestStatus(error.message);
    }
  };

  
  const handleApproval = async (requestId, decision) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/repos/${selectedRepo._id}/handle-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ 
            requestId,
            decision,
            ...(decision === "rejected" && { reason: "Access denied by repository owner" }) // Add rejection reason
          })
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setRequestStatus(`Request ${decision} successfully!`);

     
      setSelectedRepo(prev => ({
        ...prev,
        requests: prev.requests.filter(req => req._id !== requestId)
      }));

    } catch (error) {
      console.error("Error handling request:", error);
      setRequestStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className={`min-h-screen w-full ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          🔍 Search Repositories
        </h1>

        <input
          type="text"
          placeholder="Search by repo name..."
          className={`border rounded-lg p-2 w-full mb-4 ${
            darkMode 
              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {loading && <p className={`text-${darkMode ? 'gray-300' : 'gray-600'}`}>Loading repositories...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        <div className="grid md:grid-cols-2 gap-4">
          {repos.length > 0 ? (
            repos
              .filter((repo) => repo.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((repo) => (
                <div
                  key={repo._id}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    darkMode
                      ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
                      : 'bg-white hover:bg-blue-100 shadow-md'
                  }`}
                  onClick={() => handleRepoClick(repo)}
                >
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {repo.name}
                  </h2>
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    👤 Owner: {repo.owner?.username || "Unknown"}
                  </p>
                </div>
              ))
          ) : (
            !loading && <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No repositories found.</p>
          )}
        </div>

        {selectedRepo && (
          <div className={`mt-6 p-4 rounded-lg ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white shadow-md'
          }`}>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              📜 Repository: {selectedRepo.name}
            </h2>
            <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              👤 Owner ID: {owner?.id || "N/A"}
            </p>

            {ownerError && <p className="text-red-500">Error loading owner: {ownerError}</p>}

            {owner && (
              <div className="mt-4">
                <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>👤 Name: {owner.name}</p>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>📧 Email: {owner.email}</p>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>🏢 Organization: {owner.organization}</p>

                {requestStatus && (
                  <p className={`mt-2 ${
                    requestStatus.includes("success") ? "text-green-500" : "text-red-500"
                  }`}>
                    {requestStatus}
                  </p>
                )}

                {!selectedRepo.members?.some(member => member._id === userId) && (
                  <>
                    {selectedRepo.requests?.some(req => req.user === userId && req.status === "pending") ? (
                      <p className="mt-4 text-yellow-500 font-semibold">⏳ Pending Approval</p>
                    ) : selectedRepo.requests?.some(req => req.user === userId && req.status === "rejected") ? (
                      <p className="mt-4 text-red-500 font-semibold">❌ Access Denied</p>
                    ) : (
                      <button
                        className={`mt-4 px-4 py-2 rounded-lg transition ${
                          darkMode
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-800 text-white'
                        }`}
                        onClick={handleRequestAccess}
                      >
                        🚀 Request Access
                      </button>
                    )}
                  </>
                )}

                {owner.id === userId && selectedRepo.requests?.filter(req => req.status === "pending").length > 0 && (
                  <div className={`mt-6 p-4 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      🔑 Pending Requests
                    </h3>
                    {selectedRepo.requests
                      .filter(req => req.status === "pending")
                      .map(req => (
                        <div key={req._id} className={`flex justify-between items-center py-2 border-b ${
                          darkMode ? 'border-gray-600' : 'border-gray-200'
                        }`}>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {req.email}
                          </span>
                          <div className="space-x-2">
                            <button 
                              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                              onClick={() => handleApproval(req._id, "approved")}
                            >
                              Approve
                            </button>
                            <button 
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                              onClick={() => handleApproval(req._id, "rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}