import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./ExtractedReq.css";
import "./All.css";

const RepoDetails = () => {
    const { repoId } = useParams();
    const [repoDetails, setRepoDetails] = useState(null);
    const [requirements, setRequirements] = useState([]);
    const [comparisonResults, setComparisonResults] = useState({
        stats: null,
        rawData: null
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState({
        repo: true,
        requirements: true,
        comparison: false
    });
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!repoId) {
            setError("Repository ID is missing.");
            setLoading({repo: false, requirements: false});
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch repo details
                const detailsResponse = await axios.get(
                    `http://localhost:5000/api/repos/${repoId}/details`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setRepoDetails(detailsResponse.data);
            
                // Fetch requirements
                const reqResponse = await axios.get(
                    `http://localhost:5000/api/repos/${repoId}/extracted`,
                    { 
                        params: { useUpdated: true },
                        headers: { Authorization: `Bearer ${token}` } 
                    }
                );
                setRequirements(reqResponse.data);
                
                setLoading({repo: false, requirements: false});
            } catch (err) {
                console.error("Fetch error:", err);
                setError(err.response?.data?.message || err.message);
                setLoading({repo: false, requirements: false});
            }
        };
        fetchData();
    }, [repoId, token]);

    const handleCompare = async () => {
        try {
            setLoading(prev => ({...prev, comparison: true}));
            const response = await axios.post(
                `http://localhost:5000/api/repos/${repoId}/compare`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const formattedResults = {
                stats: {
                    coveragePercentage: response.data?.stats?.coverage_percentage || 0,
                    implementedRequirements: response.data?.stats?.implemented_requirements || 0,
                    missingRequirements: response.data?.stats?.missing_requirements || 0,
                    totalRequirements: response.data?.stats?.total_requirements || 0
                },
                rawData: response.data  // Store the complete JSON response
            };
            
            setComparisonResults(formattedResults);
        } catch (err) {
            console.error("Comparison error:", err);
            setError(err.response?.data?.message || err.message || "Comparison failed");
        } finally {
            setLoading(prev => ({...prev, comparison: false}));
        }
    };

    const downloadComparisonResults = () => {
        if (!comparisonResults.rawData) return;
        
        const dataStr = JSON.stringify(comparisonResults.rawData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `comparison_results_${repoId}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleUploadCodeClick = () => navigate("/upload-code");
    const handleViewHistoryClick = () => navigate(`/repo-history/${repoId}`);

    if (loading.repo) return <div className="loading">Loading repository details...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (!repoDetails) return <div>No repository data found</div>;

    return (
        <div className="container">
            <h2>Repository: {repoDetails.repo?.name}</h2>
            <div className="repo-meta">
                <span>Owner: {repoDetails.repo?.owner?.username}</span>
                <span>Members: {repoDetails.repo?.members?.length}</span>
                <span>Commits: {repoDetails.commits}</span>
            </div>

            <div className="action-buttons">
                <button onClick={handleCompare} disabled={loading.comparison}>
                    {loading.comparison ? "Comparing..." : "Compare SRS vs Code"}
                </button>
                <button onClick={handleViewHistoryClick}>View History</button>
                {comparisonResults.rawData && (
                    <button onClick={downloadComparisonResults} className="download-btn">
                        Download Comparison Results
                    </button>
                )}
                <a 
                    href={repoDetails.latest_extracted_updated} 
                    download
                    className="download-btn"
                >
                    Download Requirements
                </a>
            </div>

            {comparisonResults.stats && (
                <div className="comparison-results">
                    <h3>Comparison Results Summary</h3>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h4>Coverage</h4>
                            <p>{comparisonResults.stats.coveragePercentage.toFixed(2)}%</p>
                        </div>
                        <div className="stat-card">
                            <h4>Implemented</h4>
                            <p>{comparisonResults.stats.implementedRequirements}/{comparisonResults.stats.totalRequirements}</p>
                        </div>
                        <div className="stat-card">
                            <h4>Missing</h4>
                            <p>{comparisonResults.stats.missingRequirements}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="requirements-section">
                <h3>Extracted Requirements</h3>
                {loading.requirements ? (
                    <p>Loading requirements...</p>
                ) : (
                    <table className="requirements-table">
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Requirement Text</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requirements.map((req, i) => (
                                <tr key={i}>
                                    <td>{req['File Name']}</td>
                                    <td>{req['Requirement Text']}</td>
                                    <td>Functional</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default RepoDetails;