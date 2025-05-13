import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUpload, FiFileText, FiArrowRight, FiDownload } from 'react-icons/fi';
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
    return !report || !report.requirements || report.requirements.length === 0;
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

        // If no report exists, the backend should return a 404
        if (!response.data.success || !response.data.report) {
          setReport(null);
          return;
        }

        const formattedRequirements = response.data.report.requirements.map(req => ({
          requirement: req.requirement || req.text || '',
          implemented: req.status === 'implemented',
          implementation: req.implementation_details || req.implementation || req.details || '',
          status: req.status || 'missing'
        }));

        const totalReqs = formattedRequirements.length;
        const implementedReqs = formattedRequirements.filter(req => req.implemented).length;
        
        const reportData = {
          requirements: formattedRequirements,
          statistics: {
            total_requirements: totalReqs,
            implemented_requirements: implementedReqs,
            missing_requirements: totalReqs - implementedReqs,
            coverage_percentage: totalReqs > 0 ? Math.round((implementedReqs / totalReqs) * 100) : 0
          }
        };

        setReport(reportData);
      } catch (error) {
        console.error('Error fetching report:', error);
        // If it's a 404 error or any other error, we show the start process screen
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

  const exportAsCSV = () => {
    if (!report || !report.requirements) return;

 
    const headers = ['Requirement', 'Status', 'Implementation Details'];
    
   
    const csvData = report.requirements.map(req => [
      req.requirement,
      req.status.charAt(0).toUpperCase() + req.status.slice(1),
      req.implementation || '-'
    ]);

   
    const statsData = [
      ['', '', ''],
      ['Report Statistics', '', ''],
      ['Total Requirements', report.statistics.total_requirements, ''],
      ['Implemented Requirements', report.statistics.implemented_requirements, ''],
      ['Missing Requirements', report.statistics.missing_requirements, ''],
      ['Coverage Percentage', `${report.statistics.coverage_percentage}%`, '']
    ];

   
    const allData = [
      headers,
      ...csvData,
      ...statsData
    ];
    
   
    const csvString = allData.map(row => row.join(',')).join('\n');
    
   
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'compatibility_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAsPDF = () => {
    if (!report || !report.requirements) return;

    const radius = 40;
    const circumference = radius * 2 * Math.PI;
    const progress = ((100 - report.statistics.coverage_percentage) / 100) * circumference;

    
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <style>
        @page {
          margin: 20px;
        }
        .charts-container {
          display: flex;
          justify-content: space-around;
          align-items: center;
          margin: 20px 0;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .chart-item {
          text-align: center;
          flex: 1;
        }
        .chart-item h3 {
          color: #1f2937;
          font-size: 1.2em;
          margin-bottom: 15px;
        }
        .requirements-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }
        .requirements-table th {
          background: #2563eb;
          color: white;
          padding: 12px;
          text-align: left;
        }
        .requirements-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .requirements-table tr:last-child td {
          border-bottom: none;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .status-implemented {
          background: #dcfce7;
          color: #166534;
        }
        .status-missing {
          background: #fee2e2;
          color: #991b1b;
        }
      </style>
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; font-size: 1.875rem; margin-bottom: 1rem;">Compatibility Report</h1>
        
        <div class="charts-container">
          <div class="chart-item">
            <h3>Overall Coverage</h3>
            <svg class="circular-progress" viewBox="0 0 100 100" width="200" height="200">
              <circle
                cx="50"
                cy="50"
                r="35"
                fill="white"
              />
              <circle
                cx="50"
                cy="50"
                r="${radius}"
                stroke-width="8"
                fill="transparent"
                stroke="#e6e6e6"
              />
              <circle
                cx="50"
                cy="50"
                r="${radius}"
                stroke-width="8"
                fill="transparent"
                stroke="#2563eb"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${progress}"
                stroke-linecap="round"
                transform="rotate(-90 50 50)"
              />
              <text
                x="50"
                y="50"
                dominant-baseline="middle"
                text-anchor="middle"
                fill="#2563eb"
                style="font-size: 16px; font-weight: bold;"
              >
                ${Math.round(report.statistics.coverage_percentage)}%
              </text>
            </svg>
          </div>
          
          <div class="chart-item">
            <h3>Implementation Status</h3>
            <div style="margin-top: 20px;">
              <div style="margin-bottom: 10px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #2563eb; margin-right: 8px;"></span>
                Implemented: ${report.statistics.implemented_requirements}
              </div>
              <div style="margin-bottom: 10px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #dc2626; margin-right: 8px;"></span>
                Missing: ${report.statistics.missing_requirements}
              </div>
              <div>
                <span style="display: inline-block; width: 12px; height: 12px; background: #e5e7eb; margin-right: 8px;"></span>
                Total: ${report.statistics.total_requirements}
              </div>
            </div>
          </div>
        </div>

        <h2 style="color: #1f2937; font-size: 1.5rem; margin: 2rem 0 1rem;">Requirements Details</h2>
        <table class="requirements-table">
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Status</th>
              <th>Implementation Details</th>
            </tr>
          </thead>
          <tbody>
            ${report.requirements.map(req => `
              <tr>
                <td>${req.requirement}</td>
                <td>
                  <span class="status-badge ${req.implemented ? 'status-implemented' : 'status-missing'}">
                    ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </td>
                <td>${req.implementation || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

   
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Compatibility Report</title>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Report Type
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Coverage
                    </th>
                    <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  <tr className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className={`px-4 py-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center">
                        <FiFileText className={`mr-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className="font-medium">Compatibility Report</span>
                        <span className={`ml-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          ({report.statistics.implemented_requirements}/{report.statistics.total_requirements} implemented)
                        </span>
                      </div>
                    </td>
                    <td className={`px-4 py-4`}>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {report.statistics.coverage_percentage}% Coverage
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end items-center space-x-2">
                        <button
                          onClick={handleReportVersion1Click}
                          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                            darkMode 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          View <FiArrowRight className="ml-1" />
                        </button>
                        <button
                          onClick={exportAsCSV}
                          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                            darkMode
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          CSV <FiDownload className="ml-1" />
                        </button>
                        <button
                          onClick={exportAsPDF}
                          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                            darkMode
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-red-500 hover:bg-red-600 text-white'
                          }`}
                        >
                          PDF <FiDownload className="ml-1" />
                        </button>
                      </div>
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