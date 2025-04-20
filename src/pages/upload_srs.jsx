import React, { useState } from "react";
import uploadIcon from "../assets/images/upload.png";
import { useNavigate } from "react-router-dom";

const UploadSrs = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
const token = localStorage.getItem("token");
  // ✅ Restrict file types to PDF or TXT
  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const allowedTypes = ["application/pdf", "text/plain"];
    if (!allowedTypes.includes(file.type)) {
      setUploadStatus("❌ Invalid file type. Only PDF and TXT allowed.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadStatus(""); // Clear previous error messages
  };

  // ✅ Handle File Upload
  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setUploadStatus("❌ Please select a file first.");
      return;
    }

    if (isUploaded) {
      setUploadStatus("⚠️ You have already uploaded a file.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setUploadStatus("❌ You must be logged in to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true);
    setUploadStatus("⏳ Uploading...");

    try {
      

const response = await fetch("http://localhost:5000/upload", {
    method: "POST",
    body: formData,
    headers: { 
        Accept: "application/json", 
        Authorization: `Bearer ${token}`  // ✅ Correct Bearer format
    },
    credentials: "include",
});

    

      const result = await response.json();
      if (response.ok) {
        setUploadStatus(`✅ Success: ${result.success}`);
        setIsUploaded(true);

        // ✅ Navigate to ReportDetail.jsx after success
        setTimeout(() => {
          navigate("/Extractedreq");
        }, 1500);
      } else {
        setUploadStatus(`❌ Error: ${result.error || "Unknown error occurred."}`);
      }
    } catch (error) {
      setUploadStatus("❌ Failed to upload. Check server connection.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-500 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg">
        <h2 className="text-center text-lg font-semibold text-gray-700 mb-4">
          Upload your SRS file (PDF or TXT)
        </h2>

        <form onSubmit={handleUpload} className="border-2 border-dashed border-blue-500 p-6 rounded-lg text-center">
          <input type="file" hidden id="fileInput" accept=".pdf,.txt" onChange={handleFileChange} disabled={isUploaded} />
          <label htmlFor="fileInput" className="cursor-pointer">
            <div className="mb-4"><img src={uploadIcon} alt="Upload Icon" className="w-20 h-20 mx-auto" /></div>
            <p className="text-blue-500 font-medium">{selectedFile ? `📄 ${selectedFile.name}` : "Browse File to upload"}</p>
          </label>
          <button type="submit" className={`mt-4 px-4 py-2 text-white rounded-lg ${isUploading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"}`} disabled={isUploading || isUploaded}>
            {isUploading ? "Uploading..." : isUploaded ? "Uploaded ✅" : "Upload"}
          </button>
        </form>

        {uploadStatus && <p className="mt-4 text-center">{uploadStatus}</p>}
      </div>
    </div>
  );
};

export default UploadSrs;
