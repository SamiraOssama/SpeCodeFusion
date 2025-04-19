import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ExtractedReq.css";

const Extractedreq = () => {
    const { repoId } = useParams(); // ✅ Get repo ID from URL
    const [requirements, setRequirements] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // ✅ Navigation function

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("token"); // Get token from storage
                if (!token) {
                    console.error("❌ No auth token found!");
                    return;
                }

                console.log(`📡 Fetching extracted requirements for repo: ${repoId}`);
                const response = await fetch(`http://localhost:5000/api/repos/${repoId}/extracted`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error! Status: ${response.status}`);
                }

                const data = await response.json();
                console.log("📡 API Response:", data); // ✅ Debugging
                setRequirements(data);
                setLoading(false);
            } catch (error) {
                console.error("❌ Fetch error:", error);
                setError(error.message);
                setLoading(false);
            }
        };

        fetchData();
    }, [repoId]);

    // ✅ Function to navigate to Upload Source Code page
    const handleUploadCodeClick = () => {
        navigate("/upload-code");
    };

    return (
        <div className="container">
            <h2 className="title">Extracted Requirements</h2>
            {loading ? (
                <p className="loading">Loading...</p>
            ) : error ? (
                <p className="error">{error}</p>
            ) : requirements.length === 0 ? (
                <p>No extracted requirements found.</p>
            ) : (
                <div>
                    <table className="requirements-table">
                        <thead>
                            <tr>
                                <th>Filename</th>
                                <th>Requirement</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requirements.map((req, index) => (
                                <tr key={index}>
                                    <td>{req.filename}</td>
                                    <td>{req.requirement}</td>
                                    <td>{req.label}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button className="upload-code-btn" onClick={handleUploadCodeClick}>
                        Upload Source Code
                    </button>
                </div>
            )}
        </div>
    );
};

export default Extractedreq;
