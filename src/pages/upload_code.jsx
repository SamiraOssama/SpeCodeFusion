import React, { useState } from "react";
import uploadIcon from "../assets/images/code.jpg";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";

const UploadSourceCode = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(""); // ✅ New success state

  // Handle file selection
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setSuccessMessage(""); // Reset success message when a new file is selected
    setError(null); // Reset error
  };

  // Handle file upload
  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    console.log("Uploading file to backend:", file);
    setUploading(true);
    setError(null);
    setSuccessMessage(""); // Clear success message before upload

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/api/upload/code", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Upload successful:", data);
        setSuccessMessage("✅ File uploaded successfully! Click 'View Results' to see the output.");
      } else {
        setError(data.error || "Upload failed.");
      }
    } catch (error) {
      setError("Error uploading file. Please try again.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    
    <div className="min-h-screen bg-blue-500 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg">
        <h2 className="text-center text-lg font-semibold text-gray-700 mb-4">
          Upload your source code
        </h2>
        <form
          className="border-2 border-dashed border-blue-500 p-6 rounded-lg text-center cursor-pointer"
          onSubmit={handleUpload}
        >
          <input type="file" name="file" onChange={handleFileChange} hidden id="fileInput" />
          <label htmlFor="fileInput">
            <div className="mb-4">
              <img src={uploadIcon} alt="Upload Icon" className="w-20 h-20 mx-auto" />
            </div>
            <p className="text-blue-500 font-medium">Browse File to upload</p>
          </label>
        </form>

        {file && (
          <p className="text-sm text-gray-600 mt-2">
            Selected File: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {successMessage && <p className="text-green-500 text-sm mt-2">{successMessage}</p>} {/* ✅ Success message here */}

        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`mt-4 px-6 py-2 ${
            uploading ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
          } text-white font-medium rounded-lg`}
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>

        <button
          onClick={() => navigate("")}
          className="mt-4 px-6 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600"
        >
          View Results
        </button>
      </div>
    </div>
  );
};

export default UploadSourceCode;


