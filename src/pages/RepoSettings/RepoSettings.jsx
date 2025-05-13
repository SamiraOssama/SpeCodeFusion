import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import RepoSidebar from '../../components/RepoSidebar/RepoSidebar';
import GeneralSettings from './components/GeneralSettings';
import Collaborators from './components/Collaborators';
import Reports from './components/Reports';
import CodeSuggestions from './components/CodeSuggestions';
import './RepoSettings.css';

const ProtectedCollaborators = () => {
  const { repoId } = useParams();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('No token found in localStorage');
          setIsOwner(false);
          setLoading(false);
          return;
        }

       
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const userId = tokenPayload.id;
        console.log('User ID from JWT:', userId);
        
        const response = await fetch(`http://localhost:5000/api/repos/${repoId}/details`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch repo details: ${response.status}`);
        }

        const repoData = await response.json();
        console.log('Repo Data:', repoData);
        console.log('Comparing IDs:', {
          userId: userId,
          ownerId: repoData.repo.owner
        });

        setIsOwner(userId === repoData.repo.owner);
      } catch (error) {
        console.error('Error checking owner status:', error);
        setError(error.message);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    if (repoId) {
      checkOwnership();
    }
  }, [repoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Checking permissions...</span>
      </div>
    );
  }

  if (error) {
    console.error('ProtectedCollaborators error:', error);
    return <Navigate to="../general" replace />;
  }

  return isOwner ? <Collaborators /> : <Navigate to="../general" replace />;
};

const RepoSettings = () => {
  const { repoId } = useParams();

  return (
    <div className="repo-settings-container">
      <RepoSidebar />
      <div className="repo-settings-content">
        <Routes>
          <Route path="/" element={<Navigate to="general" replace />} />
          <Route path="general" element={<GeneralSettings />} />
          <Route path="collaborators" element={<ProtectedCollaborators />} />
          <Route path="reports" element={<Reports />} />
          <Route path="suggestions" element={<CodeSuggestions />} />
        </Routes>
      </div>
    </div>
  );
};

export default RepoSettings; 