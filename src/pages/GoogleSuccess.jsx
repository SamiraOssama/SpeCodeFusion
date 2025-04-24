import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const GoogleSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
  
    console.log("Google token received:", token); // Log token here
    
    if (token) {
      localStorage.setItem("token", token);
  
      fetch("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Profile data received:", data); // Log the fetched profile data
          localStorage.setItem("user", JSON.stringify(data));
          navigate("/"); // Redirect to User Profile
        })
        .catch((err) => console.error("Error fetching user profile:", err));
    } else {
      navigate("/login");
    }
  }, [navigate]);
  

  return <p className="text-center mt-10">Signing you in...</p>;
};

export default GoogleSuccess;
