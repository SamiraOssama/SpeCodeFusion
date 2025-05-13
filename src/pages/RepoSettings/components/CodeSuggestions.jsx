import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiCode, FiTrash2, FiEdit2, FiCheck, FiX, FiCpu, FiCopy } from 'react-icons/fi';
import { useTheme } from '../../../context/ThemeContext';

const CodeSuggestions = () => {
  const { repoId } = useParams();
  const { darkMode } = useTheme();
  const [suggestions, setSuggestions] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [generatingSuggestion, setGeneratingSuggestion] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, suggestionId: null });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRequirementsAndSuggestions();
  }, [repoId]);

  const fetchRequirementsAndSuggestions = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch requirements from compatibility report
      const reqResponse = await fetch(`http://localhost:5000/api/compatibility/${repoId}/report`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!reqResponse.ok) {
        const contentType = reqResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await reqResponse.json();
          throw new Error(errorData.message || 'Failed to fetch requirements');
        } else {
          throw new Error('Failed to fetch requirements. Server returned an invalid response.');
        }
      }

      const reportData = await reqResponse.json();
      
      if (!reportData.success || !reportData.report || !reportData.report.requirements) {
        throw new Error('No compatibility report found. Please generate a report first.');
      }

      // Filter out unimplemented requirements
      const unimplementedReqs = reportData.report.requirements.filter(req => 
        req.status === 'not_implemented' || req.status === 'unknown'
      ).map(req => ({
        _id: req._id || `req_${Math.random().toString(36).substr(2, 9)}`,
        description: req.requirement,
        context: req.details || req.implementation_details,
        status: req.status
      }));

      setRequirements(unimplementedReqs);

      // Fetch suggestions
      const sugResponse = await fetch(`http://localhost:5000/api/repos/${repoId}/suggestions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!sugResponse.ok) {
        const contentType = sugResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await sugResponse.json();
          throw new Error(errorData.message || 'Failed to fetch suggestions');
        } else {
          throw new Error('Failed to fetch suggestions. Server returned an invalid response.');
        }
      }

      const sugData = await sugResponse.json();
      setSuggestions(sugData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestion = async (requirementId) => {
    try {
      setGeneratingSuggestion(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const requirement = requirements.find(req => req._id === requirementId);
      
      if (!requirement) {
        throw new Error('Requirement not found');
      }

      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/suggestions/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requirementId,
          requirementDescription: requirement.description || requirement.requirement,
          context: requirement.context || requirement.implementation_details || ''
        })
      });

      const contentType = response.headers.get("content-type");
      const data = contentType && contentType.includes("application/json") ? 
        await response.json() : 
        { message: 'Server returned an invalid response' };

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to generate suggestion');
      }

      setSuggestions([...suggestions, data]);
      setSuccessMessage('AI suggestion generated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error generating suggestion:', error);
      setError(error.message || 'Failed to generate suggestion. Please try again.');
    } finally {
      setGeneratingSuggestion(false);
    }
  };

  const handleCopySuggestion = (content) => {
    navigator.clipboard.writeText(content);
    setSuccessMessage('Code copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleEditSuggestion = async (suggestionId) => {
    if (!editedContent.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/suggestions/${suggestionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: editedContent
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update suggestion');
        } else {
          throw new Error('Failed to update suggestion. Server returned an invalid response.');
        }
      }

      setSuggestions(suggestions.map(sug => 
        sug._id === suggestionId ? { ...sug, content: editedContent } : sug
      ));
      setEditingSuggestion(null);
      setEditedContent('');
    } catch (error) {
      console.error('Error updating suggestion:', error);
      setError(error.message);
    }
  };

  const handleDeleteClick = (suggestionId) => {
    setDeleteConfirmation({ open: true, suggestionId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.suggestionId) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/suggestions/${deleteConfirmation.suggestionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete suggestion');
        } else {
          throw new Error('Failed to delete suggestion. Server returned an invalid response.');
        }
      }

      // Immediately update the UI by filtering out the deleted suggestion
      const updatedSuggestions = suggestions.filter(sug => sug._id !== deleteConfirmation.suggestionId);
      setSuggestions(updatedSuggestions);
      
      setSuccessMessage('Suggestion deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Trigger a re-fetch to ensure data consistency
      await fetchRequirementsAndSuggestions();
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      setError(error.message);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation({ open: false, suggestionId: null });
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation({ open: false, suggestionId: null });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`container mx-auto px-4 py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-t-lg shadow-sm border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="p-6">
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiCode className="text-blue-500" />
                Code Suggestions
              </h2>
            </div>
          </div>

          {/* Messages */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm px-6 py-4`}>
            {error && (
              <div className={`mb-4 p-3 rounded-md ${
                darkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-800'
              } border-l-4 border-red-500`}>
                {error}
              </div>
            )}

            {successMessage && (
              <div className={`mb-4 p-3 rounded-md ${
                darkMode ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-800'
              } border-l-4 border-green-500 animate-fade-in`}>
                {successMessage}
              </div>
            )}
          </div>

          {/* Requirements and Suggestions */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-b-lg shadow-sm`}>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Unimplemented Requirements
                </h3>
                {requirements.length === 0 ? (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'} bg-opacity-50 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p>No unimplemented requirements found</p>
                  </div>
                ) : (
                  requirements.map(requirement => (
                    <div
                      key={requirement._id}
                      className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 mr-4">
                          <h4 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {requirement.description}
                          </h4>
                          {requirement.context && (
                            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {requirement.context}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => generateAISuggestion(requirement._id)}
                          disabled={generatingSuggestion}
                          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                            generatingSuggestion
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
                          } text-white shadow-sm`}
                        >
                          <FiCpu className="mr-2" />
                          {generatingSuggestion ? 'Generating...' : 'Generate Suggestion'}
                        </button>
                      </div>

                      {/* Suggestions List */}
                      <div className="space-y-4 mt-6">
                        {suggestions
                          .filter(sug => sug.requirementId === requirement._id)
                          .map(suggestion => (
                            <div
                              key={suggestion._id}
                              className={`p-4 rounded-lg ${
                                darkMode ? 'bg-gray-800' : 'bg-white'
                              } border ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}
                            >
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center">
                                  <span className={`text-sm px-2 py-1 rounded ${
                                    suggestion.isAIGenerated 
                                      ? darkMode ? 'bg-blue-900/30 text-blue-200' : 'bg-blue-100 text-blue-800'
                                      : darkMode ? 'bg-purple-900/30 text-purple-200' : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {suggestion.isAIGenerated ? 'AI Generated' : 'User Suggestion'}
                                  </span>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleCopySuggestion(suggestion.content)}
                                    className={`p-2 rounded transition-colors ${
                                      darkMode 
                                        ? 'text-blue-400 hover:bg-blue-900/30' 
                                        : 'text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="Copy code"
                                  >
                                    <FiCopy />
                                  </button>
                                  {!suggestion.isAIGenerated && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingSuggestion(suggestion._id);
                                          setEditedContent(suggestion.content);
                                        }}
                                        className={`p-2 rounded transition-colors ${
                                          darkMode 
                                            ? 'text-green-400 hover:bg-green-900/30' 
                                            : 'text-green-600 hover:bg-green-50'
                                        }`}
                                      >
                                        <FiEdit2 />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClick(suggestion._id)}
                                        className={`p-2 rounded transition-colors ${
                                          darkMode 
                                            ? 'text-red-400 hover:bg-red-900/30' 
                                            : 'text-red-600 hover:bg-red-50'
                                        }`}
                                      >
                                        <FiTrash2 />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {editingSuggestion === suggestion._id ? (
                                <div className="space-y-3">
                                  <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className={`w-full p-3 rounded-lg font-mono text-sm ${
                                      darkMode 
                                        ? 'bg-gray-900 text-gray-100 border-gray-700' 
                                        : 'bg-gray-50 text-gray-900 border-gray-200'
                                    } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    rows={10}
                                  />
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => handleEditSuggestion(suggestion._id)}
                                      className={`p-2 rounded transition-colors ${
                                        darkMode 
                                          ? 'bg-green-900/30 text-green-200 hover:bg-green-900/50' 
                                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                                      }`}
                                    >
                                      <FiCheck />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingSuggestion(null);
                                        setEditedContent('');
                                      }}
                                      className={`p-2 rounded transition-colors ${
                                        darkMode 
                                          ? 'bg-red-900/30 text-red-200 hover:bg-red-900/50' 
                                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                                      }`}
                                    >
                                      <FiX />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <pre className={`mt-3 p-4 rounded-lg overflow-x-auto font-mono text-sm ${
                                  darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-800'
                                }`}>
                                  <code>{suggestion.content}</code>
                                </pre>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
            <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              Delete Suggestion
            </h3>
            <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to delete this suggestion? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className={`px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeSuggestions; 