import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiEdit2, FiCheck, FiX, FiSettings, FiTrash2 } from 'react-icons/fi';
import axios from 'axios';
import { useRepo } from '../../../context/RepoContext';
import { useTheme } from '../../../context/ThemeContext';

const GeneralSettings = () => {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const { repoName, updateRepo } = useRepo();
  const { darkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRepoDetails();
  }, [repoId]);

  const fetchRepoDetails = async () => {
    if (!token) {
      setFeedback({
        type: 'error',
        message: 'Authentication token not found. Please log in again.'
      });
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/api/repos/${repoId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.repo) {
        const fetchedName = response.data.repo.name;
        updateRepo(repoId, fetchedName);
        setNewName(fetchedName);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching repository details:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load repository details';
      setFeedback({
        type: 'error',
        message: errorMessage
      });
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    if (!token) {
      setFeedback({
        type: 'error',
        message: 'Authentication token not found. Please log in again.'
      });
      return;
    }

    const trimmedName = newName.trim();
    if (trimmedName === '') {
      setFeedback({
        type: 'error',
        message: 'Repository name cannot be empty'
      });
      return;
    }

    if (trimmedName === repoName) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await axios({
        method: 'PATCH',
        url: `http://localhost:5000/api/repos/${repoId}/rename`,
        data: { name: trimmedName },
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.repo) {
        updateRepo(repoId, response.data.repo.name);
        setIsEditing(false);
        setFeedback({
          type: 'success',
          message: 'Repository renamed successfully'
        });

        setTimeout(() => {
          setFeedback({ type: '', message: '' });
        }, 3000);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error renaming repository:', error);
      let errorMessage = 'Failed to rename repository';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      setFeedback({
        type: 'error',
        message: errorMessage
      });
      setNewName(repoName);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setNewName(repoName);
    setFeedback({ type: '', message: '' });
  };

  const handleDeleteRepo = async () => {
    if (!token) {
      setFeedback({
        type: 'error',
        message: 'Authentication token not found. Please log in again.'
      });
      return;
    }

    try {
      const response = await axios({
        method: 'DELETE',
        url: `http://localhost:5000/api/repos/${repoId}`,
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        navigate('/Allrepos');
      }
    } catch (error) {
      console.error('Error deleting repository:', error);
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete repository'
      });
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`min-h-screen w-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`container mx-auto px-4 py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-none`}>
            {/* Header */}
            <div className={`p-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiSettings className="text-blue-500" />
                General Settings
              </h2>
            </div>

            {/* Content */}
            <div className={`p-6 space-y-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {feedback.message && (
                <div className={`p-4 rounded-lg border-0 ${
                  feedback.type === 'success'
                    ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                    : darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
                }`}>
                  {feedback.message}
                </div>
              )}

              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <form onSubmit={handleRename} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Repository Name
                    </label>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className={`flex-1 px-3 py-2 rounded-lg ${
                            darkMode 
                              ? 'bg-gray-600 text-white placeholder-gray-400 border-gray-600' 
                              : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300'
                          } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          placeholder="Enter new repository name"
                          disabled={isLoading}
                        />
                      ) : (
                        <div className={`flex-1 px-3 py-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {repoName}
                        </div>
                      )}
                      
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isLoading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                              isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            <FiCheck />
                            {isLoading ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={isLoading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                              darkMode
                                ? 'bg-gray-600 hover:bg-gray-500 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                          >
                            <FiX />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <FiEdit2 />
                          Rename
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Delete Repository
                </h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Once you delete a repository, there is no going back. Please be certain.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700"
                  >
                    <FiTrash2 />
                    Delete Repository
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                      Are you sure you want to delete this repository?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteRepo}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700"
                      >
                        <FiTrash2 />
                        Yes, delete repository
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className={`px-4 py-2 rounded-lg ${
                          darkMode
                            ? 'bg-gray-600 hover:bg-gray-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings; 
