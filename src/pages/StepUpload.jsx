import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

const StepUpload = () => {
  const location = useLocation();
  const selectedRepoFromNav = location.state?.selectedRepo;
  
  const [step, setStep] = useState(selectedRepoFromNav ? 2 : 1);
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(selectedRepoFromNav || null);
  const [file, setFile] = useState(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({
    srs: false,
    code: false,
    report: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedRepoFromNav) {
      fetchUserRepos();
    }
  }, [selectedRepoFromNav]);

  const fetchUserRepos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/repos/my-repos", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRepos(response.data);
    } catch (err) {
      setError("Failed to fetch repositories");
      console.error("Error fetching repos:", err);
    }
  };

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo);
    setStep(2);
  };

  const handleFileUpload = async (type) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const formData = new FormData();

      if (type === "srs") {
        if (!file) {
          throw new Error("Please select an SRS file");
        }
        formData.append("file", file);
        formData.append("fileType", "srs");
      } else {
        if (!githubUrl) {
          throw new Error("Please enter a GitHub URL");
        }
        formData.append("githubUrl", githubUrl);
        formData.append("fileType", "sourceCode");
      }

      await axios.post(
        `http://localhost:5000/api/repos/${selectedRepo._id}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setUploadStatus(prev => ({
        ...prev,
        [type]: true
      }));

      if (type === "srs") {
        setStep(3);
      } else {
        setStep(4);
      }
    } catch (err) {
      setError(err.message || "Upload failed");
      console.error("Upload error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      // First verify that both SRS and code files exist
      if (!uploadStatus.srs || !uploadStatus.code) {
        throw new Error("Please ensure both SRS and source code have been uploaded first.");
      }

      console.log("Starting compatibility report generation...");
      
      // Generate compatibility report using direct analysis
      const matchingResponse = await axios.post(
        `http://localhost:5000/api/compatibility/${selectedRepo._id}/match`,
        {},
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          timeout: 600000 // 10 minute timeout
        }
      );

      console.log("Report generation response:", matchingResponse.data);

      if (matchingResponse.data.success) {
        setUploadStatus(prev => ({
          ...prev,
          report: true
        }));

        // Navigate to report view with results
        navigate(`/report/${selectedRepo._id}`, {
          state: { 
            message: "Report generated successfully!",
            statistics: matchingResponse.data.statistics,
            requirements: matchingResponse.data.requirements
          }
        });
      } else {
        throw new Error("Report generation failed: " + matchingResponse.data.message);
      }
    } catch (err) {
      console.error("Report generation error:", err);
      let errorMessage = "Failed to generate report: ";
      
      if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage += err.response.data.error;
      } else if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += "Unknown error occurred";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="step-container">
            <h2>Step 1: Select Repository</h2>
            <div className="repo-list">
              {repos.map(repo => (
                <div 
                  key={repo._id} 
                  className={`repo-item ${selectedRepo?._id === repo._id ? 'selected' : ''}`}
                  onClick={() => handleRepoSelect(repo)}
                >
                  <h3>{repo.name}</h3>
                  <p>Owner: {repo.owner}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-container">
            <h2>Step 2: Upload SRS File</h2>
            <input 
              type="file" 
              onChange={(e) => setFile(e.target.files[0])} 
              accept=".pdf,.doc,.docx,.txt"
            />
            <button 
              onClick={() => handleFileUpload("srs")}
              disabled={isLoading || !file}
            >
              {isLoading ? "Uploading..." : "Upload SRS"}
            </button>
          </div>
        );

      case 3:
        return (
          <div className="step-container">
            <h2>Step 3: Add GitHub Repository</h2>
            <input 
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="Enter GitHub repository URL"
            />
            <button 
              onClick={() => handleFileUpload("code")}
              disabled={isLoading || !githubUrl}
            >
              {isLoading ? "Processing..." : "Process Repository"}
            </button>
          </div>
        );

      case 4:
        return (
          <div className="step-container">
            <h2>Step 4: Generate Compatibility Report</h2>
            <div className="status-list">
              <div className="status-item">
                <span>✅ SRS Upload</span>
              </div>
              <div className="status-item">
                <span>✅ Code Processing</span>
              </div>
            </div>
            <button 
              onClick={generateReport}
              disabled={isLoading}
            >
              {isLoading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="step-upload-container">
      <div className="progress-bar">
        {!selectedRepoFromNav && (
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1. Select Repo</div>
        )}
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
          {selectedRepoFromNav ? '1.' : '2.'} Upload SRS
        </div>
        <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
          {selectedRepoFromNav ? '2.' : '3.'} Add Code
        </div>
        <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>
          {selectedRepoFromNav ? '3.' : '4.'} Generate Report
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {selectedRepo && (
        <div className="selected-repo-info">
          <h3>Selected Repository: {selectedRepo.name}</h3>
        </div>
      )}

      {renderStep()}

      <style jsx>{`
        .step-upload-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .progress-bar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          padding: 20px 0;
        }

        .progress-step {
          position: relative;
          padding: 10px 20px;
          background: #f0f0f0;
          border-radius: 20px;
          color: #666;
        }

        .progress-step.active {
          background: #4CAF50;
          color: white;
        }

        .step-container {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .repo-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .repo-item {
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .repo-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .repo-item.selected {
          border-color: #4CAF50;
          background: #f1f8e9;
        }

        .status-list {
          margin: 20px 0;
        }

        .status-item {
          padding: 10px;
          margin: 5px 0;
          background: #f1f8e9;
          border-radius: 4px;
        }

        .error-message {
          padding: 10px;
          margin: 10px 0;
          background: #ffebee;
          color: #c62828;
          border-radius: 4px;
        }

        button {
          padding: 10px 20px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 20px;
        }

        button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }

        input[type="text"] {
          width: 100%;
          padding: 10px;
          margin: 10px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }

        input[type="file"] {
          margin: 10px 0;
        }

        .selected-repo-info {
          background: #f1f8e9;
          padding: 10px 20px;
          border-radius: 4px;
          margin-bottom: 20px;
          border-left: 4px solid #4CAF50;
        }

        .selected-repo-info h3 {
          margin: 0;
          color: #2e7d32;
        }
      `}</style>
    </div>
  );
};

export default StepUpload; 