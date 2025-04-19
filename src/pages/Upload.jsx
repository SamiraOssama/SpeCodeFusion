import { useState, useEffect } from "react";
import axios from "axios";

const Upload = ({ repoId }) => {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("srs");
  const [githubUrl, setGithubUrl] = useState("");
  const [uploadMethod, setUploadMethod] = useState("file");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("🏷️ Upload Component Mounted - Repo ID:", repoId);
  }, [repoId]);

  const handleUpload = async () => {
    try {
      setIsLoading(true);
      if (!repoId) {
        alert("Error: Repository ID is missing!");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to upload!");
        return;
      }

      if (uploadMethod === "github") {
        if (!githubUrl) {
          alert("Please enter a GitHub URL");
          return;
        }
        if (!githubUrl.includes("github.com")) {
          alert("Please enter a valid GitHub URL");
          return;
        }
      } else {
        if (!file) {
          alert("Please select a file");
          return;
        }
      }

      const formData = new FormData();
      if (uploadMethod === "file") {
        formData.append("file", file);
      }
      formData.append("fileType", uploadMethod === "github" ? "sourceCode" : fileType);
      if (uploadMethod === "github") {
        formData.append("githubUrl", githubUrl);
      }

      const response = await axios.post(
        `http://localhost:5000/api/repos/${repoId}/upload`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`, 
            "Content-Type": "multipart/form-data" 
          } 
        }
      );

      console.log("✅ Upload Success:", response.data);
      alert(response.data.message || "File uploaded successfully!");
    } catch (err) {
      console.error("❌ Upload Error:", err.response?.data || err.message);
      alert("Upload failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload File</h2>
      <p>Repo ID: {repoId ? repoId : "❌ No Repo Selected"}</p>
      
      <div className="upload-method-selector">
        <label>
          <input 
            type="radio" 
            name="uploadMethod" 
            value="file" 
            checked={uploadMethod === "file"} 
            onChange={() => setUploadMethod("file")} 
          />
          File Upload
        </label>
        <label>
          <input 
            type="radio" 
            name="uploadMethod" 
            value="github" 
            checked={uploadMethod === "github"} 
            onChange={() => setUploadMethod("github")} 
          />
          GitHub URL
        </label>
      </div>

      {uploadMethod === "file" ? (
        <>
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files[0])} 
            className="file-input"
          />
          <select 
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="file-type-selector"
          >
            <option value="srs">SRS File</option>
            <option value="sourceCode">Source Code</option>
          </select>
        </>
      ) : (
        <>
          <input 
            type="text" 
            placeholder="Enter GitHub repository URL (e.g., https://github.com/username/repo)" 
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="github-url-input"
          />
          <p className="note">Note: Only public repositories are supported</p>
        </>
      )}
      
      <button 
        onClick={handleUpload}
        disabled={isLoading}
        className="upload-button"
      >
        {isLoading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export default Upload;