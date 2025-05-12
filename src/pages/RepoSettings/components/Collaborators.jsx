import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiUserPlus, FiTrash2, FiSearch, FiClock, FiCheck, FiX } from 'react-icons/fi';
import { useNotifications } from '../../../context/NotificationsContext';

const API_BASE_URL = 'http://localhost:5000';

const Collaborators = () => {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [collaborators, setCollaborators] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [repoOwner, setRepoOwner] = useState(null);
  const { refreshNotifications } = useNotifications();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  
  const [debugInfo, setDebugInfo] = useState({
    userLoaded: false,
    ownerLoaded: false,
    collaboratorsLoaded: false,
    lastError: null
  });

  const handleTokenExpiration = () => {
    console.log("Token expiration handler called");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { state: { message: 'Your session has expired. Please log in again.' } });
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    try {
      const token = localStorage.getItem('token');
      console.log("Making authenticated request to:", url);
      console.log("Token exists:", !!token);
      
      if (!token) {
        handleTokenExpiration();
        return null;
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      console.log("Response status:", response.status);
      
      if (response.status === 401) {
        handleTokenExpiration();
        return null;
      }

      return response;
    } catch (error) {
      console.error('Request error:', error);
      setDebugInfo(prev => ({ ...prev, lastError: error.message }));
      throw error;
    }
  };

  const fetchRepoOwner = async () => {
    try {
      console.log("Fetching repo owner for repoId:", repoId);
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/repos/${repoId}/owner`);
      if (!response) return;

      if (!response.ok) {
        throw new Error('Failed to fetch repo owner');
      }

      const data = await response.json();
      console.log("Received repo owner data:", data);
      setRepoOwner(data._id);
      setDebugInfo(prev => ({ ...prev, ownerLoaded: true }));
      console.log("Set repoOwner state to:", data._id);
    } catch (error) {
      console.error('Error fetching repo owner:', error);
      setError(error.message);
      setDebugInfo(prev => ({ ...prev, lastError: error.message }));
    }
  };

  const fetchCollaborators = async () => {
    try {
      console.log("Fetching collaborators...");
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/repos/${repoId}/collaborators`);
      if (!response) {
        throw new Error('Failed to make authenticated request');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch collaborators');
      }

      const data = await response.json();
      console.log("Received collaborators data:", data);
      
      setCollaborators(data.members || []);
      setPendingInvitations(data.pendingInvitations || []);
      setDebugInfo(prev => ({ ...prev, collaboratorsLoaded: true }));
    } catch (error) {
      console.error('Error in fetchCollaborators:', error);
      setError(`Failed to load collaborators: ${error.message}`);
      setDebugInfo(prev => ({ ...prev, lastError: error.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/users/all`);
      if (!response) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Server returned ${response.status}`);
      }

      const users = await response.json();
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(`Failed to fetch users: ${error.message}`);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/repos/${repoId}/requests`);
      if (!response) return;

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setPendingRequests(data.filter(req => req.status === 'pending') || []);
    } catch (error) {
      setError(error.message);
      console.error('Error:', error);
    }
  };

  const handleInviteUser = async (userId) => {
    try {
      setError(null);
      console.log('Sending invitation to user:', userId);
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/repos/${repoId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      if (!response) {
        console.error('No response received from invitation request');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Invitation failed:', errorData);
        throw new Error(errorData.message || 'Failed to invite user');
      }

      const result = await response.json();
      console.log('Invitation sent successfully:', result);
      setSuccessMessage(result.message || 'Invitation sent successfully!');
      setSearchQuery('');
      fetchCollaborators();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error in handleInviteUser:', error);
      setError(error.message);
    }
  };

  const handleRemoveCollaborator = async (userId, username) => {
    try {
      setError(null);
      const removeResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/repos/${repoId}/collaborators/${userId}`, {
        method: 'DELETE'
      });
      
      if (!removeResponse) return;

      if (!removeResponse.ok) {
        throw new Error('Failed to remove collaborator');
      }

      setCollaborators(collaborators.filter(c => c._id !== userId));
      setSuccessMessage('Collaborator removed successfully!');
      
      
      refreshNotifications();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError(error.message);
      console.error('Error:', error);
    }
  };

  const handleInvitationResponse = async (invitationId, status) => {
    try {
      setError(null);
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/repos/${repoId}/invitations/${invitationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (!response) return;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${status} invitation`);
      }

      const result = await response.json();
      setSuccessMessage(result.message || `Invitation ${status} successfully!`);
      fetchCollaborators();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || `Failed to ${status} invitation`);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      setError(null);
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/repos/${repoId}/invitations/${invitationId}`, {
        method: 'DELETE'
      });
      if (!response) return;

      if (!response.ok) {
        throw new Error('Failed to cancel invitation');
      }

      setPendingInvitations(pendingInvitations.filter(inv => inv._id !== invitationId));
      setSuccessMessage('Invitation cancelled successfully!');
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError(error.message);
      console.error('Error:', error);
    }
  };

  const isRepoOwner = () => {
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

      
      const repoOwnerIdString = repoOwner.toString().trim();
      const currentUserIdString = currentUserId.toString().trim();
      
      console.log('🔍 Owner check in Collaborators:', {
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

  const showConfirmationDialog = (action, userId, username) => {
    setConfirmationAction({
      type: action,
      userId,
      username
    });
    setShowConfirmation(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmationAction) return;

    try {
      if (confirmationAction.type === 'remove') {
        await handleRemoveCollaborator(confirmationAction.userId, confirmationAction.username);
      }
    } catch (error) {
      console.error('Error in confirmation action:', error);
      setError(error.message);
    } finally {
      setShowConfirmation(false);
      setConfirmationAction(null);
    }
  };

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        console.log("Initializing component...");
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const parsedUser = JSON.parse(userJson);
          console.log("Current user from localStorage:", parsedUser);
          setCurrentUser(parsedUser);
          setDebugInfo(prev => ({ ...prev, userLoaded: true }));
        } else {
          console.log("No user found in localStorage");
          handleTokenExpiration();
          return;
        }

        // Fetch all data in parallel
        const [collaboratorsRes, usersRes, ownerRes, requestsRes] = await Promise.all([
          makeAuthenticatedRequest(`${API_BASE_URL}/api/repos/${repoId}/collaborators`),
          makeAuthenticatedRequest(`${API_BASE_URL}/api/users/all`),
          makeAuthenticatedRequest(`${API_BASE_URL}/api/repos/${repoId}/owner`),
          makeAuthenticatedRequest(`${API_BASE_URL}/api/repos/${repoId}/requests`)
        ]);

        // Handle collaborators response
        if (collaboratorsRes && collaboratorsRes.ok) {
          const collaboratorsData = await collaboratorsRes.json();
          console.log("Collaborators data:", collaboratorsData);
          setCollaborators(collaboratorsData.members || []);
          setPendingInvitations(collaboratorsData.pendingInvitations || []);
          setDebugInfo(prev => ({ ...prev, collaboratorsLoaded: true }));
        }

        // Handle users response
        if (usersRes && usersRes.ok) {
          const usersData = await usersRes.json();
          setAllUsers(usersData);
        }

        // Handle owner response
        if (ownerRes && ownerRes.ok) {
          const ownerData = await ownerRes.json();
          setRepoOwner(ownerData._id);
          setDebugInfo(prev => ({ ...prev, ownerLoaded: true }));
        }

        // Handle requests response
        if (requestsRes && requestsRes.ok) {
          const requestsData = await requestsRes.json();
          setPendingRequests(requestsData.filter(req => req.status === 'pending') || []);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error during initialization:", error);
        setError(error.message);
        setDebugInfo(prev => ({ ...prev, lastError: error.message }));
        setIsLoading(false);
      }
    };

    initializeComponent();
  }, [repoId]);


  useEffect(() => {
    console.log("Debug Info Updated:", debugInfo);
  }, [debugInfo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading collaborators...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-red-600 text-xl font-semibold mb-4">Error Loading Collaborators</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="bg-gray-100 p-4 rounded mb-4">
            <p className="text-sm font-mono">Debug Info:</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

 
  const filteredUsers = allUsers.filter(user => {
    const isCollaborator = collaborators.some(collab => collab._id === user._id);
    const isInvited = pendingInvitations.some(inv => inv.user._id === user._id);
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return !isCollaborator && !isInvited && matchesSearch;
  });

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const isOwner = currentUser && repoOwner === currentUser._id;

  return (
    <div className={`min-h-screen w-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`container mx-auto px-4 py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-none`}>
           
            <div className={`p-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiUserPlus className="text-blue-500" />
                Collaborators
              </h2>
            </div>

          
            <div className={`p-6 space-y-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {error && (
                <div className={`mb-4 p-3 rounded-md ${
                  darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
                } border-0`}>
                  {error}
                </div>
              )}
              
              {successMessage && (
                <div className={`mb-4 p-3 rounded-md ${
                  darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                } border-0`}>
                  {successMessage}
                </div>
              )}

             
              <div className="relative">
                <FiSearch className={`absolute left-3 top-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search users by username or email..."
                  className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' 
                      : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300'
                  } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>

            
              {isLoading ? (
                <div className="text-center py-4">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading users...</span>
                </div>
              ) : filteredUsers.length > 0 && searchQuery && (
                <div className="space-y-2">
                  <h3 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Search Results
                  </h3>
                  {filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {user.username}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleInviteUser(user._id)}
                        className="flex items-center px-3 py-1 text-white rounded-lg bg-blue-600 hover:bg-blue-700"
                      >
                        <FiUserPlus className="mr-1" />
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {pendingInvitations.length > 0 && (
                <div className="space-y-3">
                  <h3 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Pending Invitations
                  </h3>
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation._id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        darkMode 
                          ? 'bg-blue-900 bg-opacity-20' 
                          : 'bg-blue-50'
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {invitation.user.username || invitation.user.email}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {invitation.user.email}
                        </p>
                        <p className="text-xs flex items-center mt-1 text-blue-400">
                          <FiClock className="mr-1" /> Invited by {invitation.invitedBy.username || invitation.invitedBy.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingRequests.length > 0 && (
                <div className="space-y-3">
                  <h3 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Pending Access Requests
                  </h3>
                  {pendingRequests.map((request) => (
                    <div
                      key={request._id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        darkMode 
                          ? 'bg-yellow-900 bg-opacity-20' 
                          : 'bg-yellow-50'
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {request.username || request.email}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {request.email}
                        </p>
                        <p className="text-xs flex items-center mt-1 text-yellow-400">
                          <FiClock className="mr-1" /> Pending Request
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {isRepoOwner() && (
                          <>
                            <button
                              onClick={() => handleInvitationResponse(request._id, 'accepted')}
                              className={`p-2 rounded-lg ${
                                darkMode 
                                  ? 'text-green-400 hover:bg-green-900 hover:bg-opacity-20'
                                  : 'text-green-600 hover:bg-green-100'
                              }`}
                              title="Accept request"
                            >
                              <FiCheck />
                            </button>
                            <button
                              onClick={() => handleInvitationResponse(request._id, 'rejected')}
                              className={`p-2 rounded-lg ${
                                darkMode 
                                  ? 'text-red-400 hover:bg-red-900 hover:bg-opacity-20'
                                  : 'text-red-600 hover:bg-red-100'
                              }`}
                              title="Reject request"
                            >
                              <FiX />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              
              <div>
                <h3 className={`font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Current Collaborators
                </h3>
                <div className="space-y-3">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator._id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {collaborator.username}
                            </p>
                            {collaborator._id && repoOwner && collaborator._id.toString() === repoOwner.toString() && (
                              <span className={`font-bold px-2 py-0.5 rounded text-sm ${
                                darkMode ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'
                              }`}>
                                Owner
                              </span>
                            )}
                          </div>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {collaborator.email}
                          </p>
                        </div>
                      </div>
                      {collaborator._id !== repoOwner && (
                        <button
                          onClick={() => showConfirmationDialog('remove', collaborator._id, collaborator.username)}
                          className={`p-2 rounded-lg ${
                            darkMode 
                              ? 'text-red-400 hover:bg-red-900 hover:bg-opacity-20'
                              : 'text-red-600 hover:bg-red-100'
                          }`}
                          title="Remove collaborator"
                        >
                          <FiTrash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  {collaborators.length === 0 && (
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      No collaborators yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

     
      {showConfirmation && confirmationAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg max-w-md w-full border-0 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Remove Collaborator
            </h3>
            <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to remove {confirmationAction.username} from the repository?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmationAction(null);
                }}
                className={`px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collaborators; 