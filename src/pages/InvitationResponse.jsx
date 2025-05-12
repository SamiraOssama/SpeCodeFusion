import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useNotifications } from '../context/NotificationsContext';

const InvitationResponse = () => {
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { repoId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { markAsRead } = useNotifications();
  
  const invitation = location.state?.invitation;
  const notificationId = location.state?.notificationId;

  useEffect(() => {
    const fetchRepoDetails = async () => {
      try {
        if (!repoId) {
          throw new Error('Repository ID is missing');
        }

        if (!invitation?.invitationId) {
          throw new Error('Invitation details are missing');
        }

        const response = await fetch(`http://localhost:5000/api/repos/${repoId}/details`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to fetch repository details');
        }
        
        const data = await response.json();
        setRepo(data.repo);
      } catch (err) {
        console.error('Error in fetchRepoDetails:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoDetails();
  }, [repoId, invitation]);

  const handleResponse = async (status) => {
    try {
      if (!invitation?.invitationId) {
        throw new Error('Invalid invitation data');
      }

      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/invitations/${invitation.invitationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process invitation');
      }

      // Mark notification as read if it exists
      if (notificationId) {
        try {
          await markAsRead(notificationId);
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      }

      // Show success message
      alert(status === 'accepted' 
        ? 'You have successfully joined the repository!' 
        : 'You have declined the invitation.');

      // Navigate based on response
      if (status === 'accepted') {
        navigate(`/repo/${repoId}/settings/general`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Error in handleResponse:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-red-500 text-xl font-semibold mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!repo || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4">Invalid Invitation</h2>
          <p className="text-gray-700 mb-4">
            This invitation is no longer valid or has already been processed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-2xl font-semibold mb-6 text-center">Repository Invitation</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Repository: {repo.name}</h3>
          <p className="text-gray-600 mb-4">
            You have been invited to collaborate on this repository.
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={() => handleResponse('accepted')}
            disabled={loading}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition duration-200 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            onClick={() => handleResponse('rejected')}
            disabled={loading}
            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition duration-200 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationResponse; 