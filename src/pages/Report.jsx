import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "axios";

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

      if (activeTab === 'summary' && !response.data.report?.statistics && initialStats) {
        // Use initial statistics if available and API doesn't return them
        setReport({ statistics: initialStats });
      } else {
        setReport(response.data.report || response.data);
      }
    } catch (err) {
      console.error("Error fetching report:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch report");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSummaryStats = () => {
    if (!report || !report.statistics) {
      console.log("No statistics found in report:", report);
      return null;
    }

    const stats = report.statistics;
    return (
      <div className="stats-container">
        <div className="stat-item">
          <h3>Total Requirements</h3>
          <p>{stats.total_requirements}</p>
        </div>
        <div className="stat-item">
          <h3>Fully Implemented</h3>
          <p>{stats.implemented_requirements}</p>
        </div>
        <div className="stat-item">
          <h3>Not Implemented</h3>
          <p>{stats.missing_requirements}</p>
        </div>
        <div className="stat-item">
          <h3>Unknown Status</h3>
          <p>{stats.unknown_requirements || 0}</p>
        </div>
        <div className="stat-item highlight">
          <h3>Coverage</h3>
          <p>{stats.coverage_percentage}%</p>
        </div>
      </div>
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

      <h1>Compatibility Report</h1>
      
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
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 4px;
          border-left: 4px solid #2e7d32;
        }

        .error-message {
          padding: 15px;
          margin-bottom: 20px;
          background: #ffebee;
          color: #c62828;
          border-radius: 4px;
          border-left: 4px solid #c62828;
        }

        .tab-container {
          margin-bottom: 20px;
        }

        .tab {
          padding: 10px 20px;
          margin-right: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: #f0f0f0;
          color: #666;
        }

        .tab.active {
          background: #4CAF50;
          color: white;
        }

        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .stat-item {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }

        .stat-item.highlight {
          background: #e8f5e9;
          border: 1px solid #4CAF50;
        }

        .stat-item h3 {
          margin: 0 0 10px 0;
          color: #666;
        }

        .stat-item p {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
          color: #2e7d32;
        }

        .detailed-report {
          margin-top: 20px;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        th {
          background: #f5f5f5;
          font-weight: 600;
        }

        tr.status-fully_implemented td,
        tr.status-implemented td {
          background: #e8f5e9;
        }

        tr.status-partially_implemented td {
          background: #fff3e0;
        }

        tr.status-not_implemented td {
          background: #ffebee;
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default Report; 