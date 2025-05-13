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

  const handleDeleteSuggestion = async (suggestionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/suggestions/${suggestionId}`, {
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

      setSuggestions(suggestions.filter(sug => sug._id !== suggestionId));
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      setError(error.message);
    }
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
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-none`}>
            <div className={`p-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiCode className="text-blue-500" />
                Code Suggestions
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

              {/* Unimplemented Requirements List */}
              <div className="space-y-4">
                <h3 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Unimplemented Requirements
                </h3>
                {requirements.length === 0 ? (
                  <p className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No unimplemented requirements found
                  </p>
                ) : (
                  requirements.map(requirement => (
                    <div
                      key={requirement._id}
                      className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {requirement.description}
                          </h4>
                          {requirement.context && (
                            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Context: {requirement.context}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => generateAISuggestion(requirement._id)}
                          disabled={generatingSuggestion}
                          className={`flex items-center px-4 py-2 rounded-lg ${
                            generatingSuggestion
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-500 hover:bg-blue-600'
                          } text-white`}
                        >
                          <FiCpu className="mr-2" />
                          {generatingSuggestion ? 'Generating...' : 'Generate Suggestion'}
                        </button>
                      </div>

                      {/* Suggestions for this requirement */}
                      {suggestions
                        .filter(sug => sug.requirementId === requirement._id)
                        .map(suggestion => (
                          <div
                            key={suggestion._id}
                            className={`mt-4 p-4 rounded-lg ${
                              darkMode ? 'bg-gray-600' : 'bg-white'
                            } border ${darkMode ? 'border-gray-500' : 'border-gray-200'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center">
                                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {suggestion.isAIGenerated ? 'AI Generated' : 'User Suggestion'}
                                </span>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleCopySuggestion(suggestion.content)}
                                  className="p-2 text-blue-500 hover:bg-blue-100 rounded"
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
                                      className="p-2 text-blue-500 hover:bg-blue-100 rounded"
                                    >
                                      <FiEdit2 />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSuggestion(suggestion._id)}
                                      className="p-2 text-red-500 hover:bg-red-100 rounded"
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {editingSuggestion === suggestion._id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editedContent}
                                  onChange={(e) => setEditedContent(e.target.value)}
                                  className={`w-full p-2 rounded-lg ${
                                    darkMode 
                                      ? 'bg-gray-700 text-white border-gray-600' 
                                      : 'bg-white text-gray-900 border-gray-300'
                                  } border min-h-[100px]`}
                                />
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => handleEditSuggestion(suggestion._id)}
                                    className="p-2 text-green-500 hover:bg-green-100 rounded"
                                  >
                                    <FiCheck />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingSuggestion(null);
                                      setEditedContent('');
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-100 rounded"
                                  >
                                    <FiX />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <pre className={`mt-2 p-4 rounded-lg overflow-x-auto ${
                                darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'
                              }`}>
                                {suggestion.content}
                              </pre>
                            )}
                          </div>
                        ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeSuggestions; 