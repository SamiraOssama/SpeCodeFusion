import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CircularProgress = ({ percentage }) => {
  const radius = 40;
  const circumference = radius * 2 * Math.PI;
  const progress = ((100 - percentage) / 100) * circumference;

  return (
    <div className="circular-progress-container">
      <svg className="circular-progress" viewBox="0 0 100 100" width="200" height="200">
        {/* Solid white background circle */}
        <circle
          cx="50"
          cy="50"
          r="35"
          fill="white"
          className="progress-background"
        />
        {/* Gray track circle */}
        <circle
          className="circular-progress-background"
          cx="50"
          cy="50"
          r={radius}
          strokeWidth="8"
          fill="transparent"
          stroke="#e6e6e6"
        />
        {/* Blue progress circle */}
        <circle
          className="circular-progress-bar"
          cx="50"
          cy="50"
          r={radius}
          strokeWidth="8"
          fill="transparent"
          stroke="#2563eb"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        {/* Percentage text */}
        <text
          x="50"
          y="50"
          dominantBaseline="middle"
          textAnchor="middle"
          className="percentage-text"
          fill="#2563eb"
        >
          {Math.round(percentage)}%
        </text>
      </svg>
    </div>
  );
};

const Report = () => {
  const { repoId } = useParams();
  const location = useLocation();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [message, setMessage] = useState(location.state?.message || null);
  const [initialStats, setInitialStats] = useState(location.state?.statistics || null);

  useEffect(() => {
    if (message) {
      // Clear message after 5 seconds
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    fetchReport();
    // Cleanup function to remove stored report when unmounting
    return () => {
      localStorage.removeItem(`report_${repoId}`);
    };
  }, [repoId, activeTab]);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await axios.get(
        `http://localhost:5000/api/compatibility/${repoId}/report?type=${activeTab}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log("API response:", response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch report");
      }

      // Always use the report from the API response if it exists
      if (response.data.report) {
        setReport(response.data.report);
        // Store the report in localStorage for persistence
        localStorage.setItem(`report_${repoId}`, JSON.stringify(response.data.report));
      } else if (initialStats) {
        // Use initial statistics only if no report exists
        const savedReport = localStorage.getItem(`report_${repoId}`);
        if (savedReport) {
          setReport(JSON.parse(savedReport));
        } else {
        setReport({ statistics: initialStats });
        }
      } else {
        throw new Error("No report data available");
      }
    } catch (err) {
      console.error("Error fetching report:", err);
      // Try to load from localStorage if API fails
      const savedReport = localStorage.getItem(`report_${repoId}`);
      if (savedReport) {
        setReport(JSON.parse(savedReport));
      } else {
      setError(err.response?.data?.message || err.message || "Failed to fetch report");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderCharts = () => {
    if (!report || !report.statistics) {
      return null;
    }

    const stats = {
      ...report.statistics,
      implemented_requirements: report.statistics.implemented_count || report.statistics.implemented_requirements || 0,
      missing_requirements: report.statistics.missing_requirements || 
        (report.statistics.total_requirements - (report.statistics.implemented_count || report.statistics.implemented_requirements || 0))
    };

    const barChartData = [
      {
        name: 'Fully Implemented',
        value: stats.implemented_requirements,
        fill: '#2563eb'
      },
      {
        name: 'Not Implemented',
        value: stats.missing_requirements,
        fill: '#dc2626'
      },
      {
        name: 'Unknown',
        value: stats.unknown_requirements || 0,
        fill: '#f59e0b'
      }
    ];

    return (
      <div className="charts-container">
        <div className="chart-item">
          <h3>Overall Coverage</h3>
          <CircularProgress 
            percentage={stats.coverage_percentage} 
          />
        </div>
        <div className="chart-item">
          <h3>Implementation Status</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={barChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150}
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryStats = () => {
    if (!report || !report.statistics) {
      console.log("No statistics found in report:", report);
      return null;
    }

    const stats = {
      ...report.statistics,
      implemented_requirements: report.statistics.implemented_count || report.statistics.implemented_requirements || 0,
      missing_requirements: report.statistics.missing_requirements || 
        (report.statistics.total_requirements - (report.statistics.implemented_count || report.statistics.implemented_requirements || 0))
    };

    return (
      <>
        {renderCharts()}
      <div className="stats-container">
        <div className="stat-item">
          <h3>Total Requirements</h3>
          <p>{stats.total_requirements}</p>
        </div>
        <div className="stat-item">
          <h3>Fully Implemented</h3>
            <p className="text-blue-600">{stats.implemented_requirements}</p>
        </div>
        <div className="stat-item">
          <h3>Not Implemented</h3>
            <p className="text-red-600">{stats.missing_requirements}</p>
        </div>
        <div className="stat-item">
          <h3>Unknown Status</h3>
            <p className="text-amber-500">{stats.unknown_requirements || 0}</p>
        </div>
        <div className="stat-item highlight">
          <h3>Coverage</h3>
          <p>{stats.coverage_percentage}%</p>
        </div>
      </div>
      </>
    );
  };

  const renderDetailedReport = () => {
    if (!report || !report.requirements) {
      console.log("No requirements found in report:", report);
      return null;
    }

    return (
      <div className="detailed-report">
        <table>
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Status</th>
              <th>Implementation Details</th>
            </tr>
          </thead>
          <tbody>
            {report.requirements.map((item, index) => (
              <tr key={index} className={`status-${item.status}`}>
                <td>{item.requirement}</td>
                <td>{item.status.replace('_', ' ')}</td>
                <td>{item.implementation_details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (isLoading) {
    return <div className="loading">Loading report...</div>;
  }

  return (
    <div className="report-container">
      {message && (
        <div className="success-message">
          {message}
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6 text-gray-900">Compatibility Report</h1>
      
      <div className="tab-container">
        <button 
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button 
          className={`tab ${activeTab === 'detailed' ? 'active' : ''}`}
          onClick={() => setActiveTab('detailed')}
        >
          Detailed Report
        </button>
      </div>

      {activeTab === 'summary' ? renderSummaryStats() : renderDetailedReport()}

      <style jsx>{`
        .report-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .success-message {
          padding: 15px;
          margin-bottom: 20px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 4px;
          border-left: 4px solid #2563eb;
        }

        .error-message {
          padding: 15px;
          margin-bottom: 20px;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 4px;
          border-left: 4px solid #dc2626;
        }

        .tab-container {
          margin-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 1px;
        }

        .tab {
          padding: 10px 20px;
          margin-right: 10px;
          border: none;
          border-radius: 4px 4px 0 0;
          cursor: pointer;
          background: #f3f4f6;
          color: #6b7280;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .tab:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .tab.active {
          background: #2563eb;
          color: white;
        }

        .charts-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin: 24px 0;
        }

        .chart-item {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .chart-item h3 {
          margin: 0 0 24px 0;
          color: #374151;
          text-align: center;
          font-size: 18px;
          font-weight: 600;
        }

        .circular-progress-container {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        .circular-progress {
          width: 200px;
          height: 200px;
        }

        .progress-background {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .percentage-text {
          font-size: 28px;
          font-weight: 600;
          font-family: system-ui, -apple-system, sans-serif;
          transform: rotate(0deg);
        }

        .circular-progress-bar {
          transition: stroke-dashoffset 0.5s ease;
        }

        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .stat-item {
          padding: 24px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .stat-item h3 {
          margin: 0 0 12px 0;
          color: #374151;
          font-size: 16px;
          font-weight: 500;
        }

        .stat-item p {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #2563eb;
        }

        .stat-item.highlight {
          background: #dbeafe;
          border: 1px solid #2563eb;
        }

        .stat-item.highlight p {
          color: #1e40af;
        }

        .detailed-report {
          margin-top: 24px;
          overflow-x: auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        th {
          background: #f8fafc;
          font-weight: 600;
          color: #374151;
        }

        tr.status-fully_implemented td,
        tr.status-implemented td {
          background: #dbeafe;
        }

        tr.status-partially_implemented td {
          background: #fef3c7;
        }

        tr.status-not_implemented td {
          background: #fee2e2;
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default Report; 