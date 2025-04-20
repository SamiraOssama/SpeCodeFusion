import { useState, useEffect, useCallback } from "react";
import { FiFilter, FiBell, FiCheck, FiX } from "react-icons/fi";

export default function RequestsPage() {
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

// In Requestpage.jsx
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

    // Update UI
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

  if (loading) return <p className="text-center text-blue-600">Loading...</p>;
  if (error) return <p className="text-center text-red-600">{error}</p>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🔑 Access Requests</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <FiBell className="text-2xl cursor-pointer" />
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
            className={`px-4 py-2 rounded flex items-center ${
              activeFilter === filter
                ? "bg-blue-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
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
        <p className="text-gray-600">No repositories with requests found.</p>
      ) : (
        <div className="space-y-6">
          {repos.map((repo) => (
            repo.requests.filter(req => activeFilter === "all" || req.status === activeFilter).length > 0 && (
              <div key={repo._id} className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-blue-600">{repo.name}</h2>
                <div className="mt-4 space-y-2">
                  {repo.requests
                    .filter(req => activeFilter === "all" || req.status === activeFilter)
                    .map((request) => (
                      <div key={request._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium">{request.username || "Unknown User"}</p>
                          <p className="text-sm text-gray-600">{request.email || "No email"}</p>
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

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Reject Request</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Optional: Enter reason for rejection..."
              className="w-full p-3 border rounded mb-4"
              rows={3}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
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