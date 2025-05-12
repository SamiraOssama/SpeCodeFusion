import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUpload, FiFileText, FiArrowRight } from 'react-icons/fi';
import { useTheme } from '../../../context/ThemeContext';
import axios from 'axios';

const Reports = () => {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isReportEmpty = (report) => {
    if (!report) return true;
    
    // Check if statistics exist and have valid structure
    if (!report.statistics || 
        typeof report.statistics.total_requirements === 'undefined' || 
        typeof report.statistics.implemented_requirements === 'undefined' || 
        typeof report.statistics.missing_requirements === 'undefined' || 
        typeof report.statistics.coverage_percentage === 'undefined') {
      return true;
    }

    // Check if requirements array exists
    if (!Array.isArray(report.requirements)) {
      return true;
    }

    return false;
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication token not found");
        }

        const response = await axios.get(
          `http://localhost:5000/api/compatibility/${repoId}/report`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        console.log('Report data received:', response.data); // Debug log

        if (response.data.success && response.data.report) {
          const reportData = {
            ...response.data.report,
            statistics: {
              ...response.data.report.statistics,
              implemented_requirements: response.data.report.statistics.implemented_count || 0,
              missing_requirements: response.data.report.statistics.total_requirements - (response.data.report.statistics.implemented_count || 0)
            }
          };
          
          // Store report in localStorage as backup
          localStorage.setItem(`report_${repoId}`, JSON.stringify(reportData));
          setReport(reportData);
        } else {
          // Try to get report from localStorage if API returns empty
          const savedReport = localStorage.getItem(`report_${repoId}`);
          if (savedReport) {
            const parsedReport = JSON.parse(savedReport);
            if (!isReportEmpty(parsedReport)) {
              setReport(parsedReport);
              return;
            }
          }
          setReport(null);
        }
      } catch (error) {
        console.error('Error fetching report:', error);
        // Try to get report from localStorage if API fails
        const savedReport = localStorage.getItem(`report_${repoId}`);
        if (savedReport) {
          const parsedReport = JSON.parse(savedReport);
          if (!isReportEmpty(parsedReport)) {
            setReport(parsedReport);
            return;
          }
        }
        if (error.response?.status !== 404) {
          setError(error.response?.data?.message || error.message);
        }
        setReport(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [repoId]);

  const handleStartSetup = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/repos/${repoId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.repo) {
        navigate('/step-upload', { 
          state: { selectedRepo: response.data.repo }
        });
      } else {
        throw new Error('Could not fetch repository details');
      }
    } catch (error) {
      console.error('Error fetching repository details:', error);
      navigate('/step-upload');
    }
  };

  const handleReportVersion1Click = () => {
    navigate(`/report/${repoId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`p-4 rounded-lg max-w-md w-full ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>
          {error}
        </div>
      </div>
    );
  }

  if (!report || isReportEmpty(report)) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`max-w-md w-full p-8 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="text-center">
            <FiUpload className={`mx-auto h-12 w-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            <h2 className={`mt-4 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              No Reports Available
            </h2>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Generate your first compatibility report by starting the setup process.
            </p>
            <button
              onClick={handleStartSetup}
              className={`mt-6 w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Start Setup Process
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-lg shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Available Reports
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Report Type
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Coverage
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  <tr className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center">
                        <FiFileText className={`mr-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className="font-medium">Compatibility Report</span>
                        <span className={`ml-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          ({report.statistics.implemented_requirements}/{report.statistics.total_requirements} implemented)
                        </span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap`}>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {report.statistics.coverage_percentage}% Coverage
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={handleReportVersion1Click}
                        className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          darkMode 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        View Report
                        <FiArrowRight className="ml-2" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports; 