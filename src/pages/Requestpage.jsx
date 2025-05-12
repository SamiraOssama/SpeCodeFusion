import { useState, useEffect, useCallback } from "react";
import { FiFilter, FiBell, FiCheck, FiX } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

export default function RequestsPage() {
  const { darkMode } = useTheme();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("pending");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentRequest, setCurrentRequest] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const token = localStorage.getItem("token");

  const fetchReposWithRequests = useCallback(async () => {
    if (!token) {
      setError("⚠️ No authentication token found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/repos/with-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }

      const data = await response.json();
      setRepos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchReposWithRequests();
    fetchNotifications();
  }, [fetchReposWithRequests]);

  const handleRequest = async (repoId, requestId, action, reason = "") => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/repos/${repoId}/handle-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            requestId: requestId,
            decision: action === "approve" ? "approved" : "rejected",
            reason: reason
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to ${action} request`);
      }

      
      setRepos(prevRepos => 
        prevRepos.map(repo => {
          if (repo._id === repoId) {
            const updatedRequests = repo.requests.filter(req => req._id !== requestId);
            return { ...repo, requests: updatedRequests };
          }
          return repo;
        })
      );

      fetchNotifications();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const confirmReject = async (repoId, requestId) => {
    setCurrentRequest({ repoId, requestId });
    setShowRejectModal(true);
  };

  const executeRejection = async () => {
    const success = await handleRequest(
      currentRequest.repoId, 
      currentRequest.requestId, 
      "reject", 
      rejectionReason
    );
    if (success) {
      setShowRejectModal(false);
      setRejectionReason("");
    }
  };

  const handleDeleteRequest = async (repoId, requestId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/repos/${repoId}/requests/${requestId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete request");
      }

      
      setRepos(prevRepos => 
        prevRepos.map(repo => {
          if (repo._id === repoId) {
            const updatedRequests = repo.requests.filter(req => req._id !== requestId);
            return { ...repo, requests: updatedRequests };
          }
          return repo;
        })
      );

      fetchNotifications();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="text-center text-blue-600">Loading...</p>;
  if (error) return <p className="text-center text-red-600">{error}</p>;

  return (
    <div className={`p-6 min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          🔑 Access Requests
        </h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <FiBell className={`text-2xl cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
            {notifications.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex space-x-2 mb-6">
        {["pending", "approved", "rejected"].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded flex items-center transition-colors ${
              activeFilter === filter
                ? darkMode 
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {filter === "pending" && <FiFilter className="mr-1" />}
            {filter === "approved" && <FiCheck className="mr-1" />}
            {filter === "rejected" && <FiX className="mr-1" />}
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {repos.length === 0 ? (
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          No repositories with requests found.
        </p>
      ) : (
        <div className="space-y-6">
          {repos.map((repo) => (
            repo.requests.filter(req => activeFilter === "all" || req.status === activeFilter).length > 0 && (
              <div key={repo._id} className={`p-4 rounded-lg ${
                darkMode ? 'bg-gray-800 shadow-dark' : 'bg-white shadow-md'
              }`}>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {repo.name}
                </h2>
                <div className="mt-4 space-y-2">
                  {repo.requests
                    .filter(req => activeFilter === "all" || req.status === activeFilter)
                    .map((request) => (
                      <div key={request._id} className={`flex justify-between items-center p-3 rounded-lg ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {request.username || "Unknown User"}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {request.email || "No email"}
                          </p>
                          {request.status === "rejected" && request.rejectionReason && (
                            <p className="text-sm text-red-500 mt-1">
                              Reason: {request.rejectionReason}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {request.status === "pending" && (
                            <>
                              <button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to approve this request?")) {
                                    handleRequest(repo._id, request._id, "approve");
                                  }
                                }}
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => confirmReject(repo._id, request._id)}
                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this request? This action cannot be undone.")) {
                                    handleDeleteRequest(repo._id, request._id);
                                  }
                                }}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {request.status === "rejected" && (
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to approve this previously rejected request?")) {
                                  handleRequest(repo._id, request._id, "approve");
                                }
                              }}
                              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )
          ))}
        </div>
      )}

     
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg max-w-md w-full ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Reject Request
            </h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Optional: Enter reason for rejection..."
              className={`w-full p-3 border rounded mb-4 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              rows={3}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className={`px-4 py-2 border rounded transition-colors ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={executeRejection}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}