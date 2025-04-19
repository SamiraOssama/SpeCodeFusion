import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import signup from "../assets/images/signup.png";
import { FaEnvelope, FaLock, FaGoogle } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // Handle errors

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear previous errors

    console.log("🔍 Sending login request...");

    try {
      const response = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("📩 Response received:", data);

      if (!response.ok) {
        console.warn(`⚠️ Login Failed: ${data.message}`);
        setErrorMessage(data.message || "Login failed. Please try again.");
        return; // Stops execution if login fails
      }

      console.log(`✅ Login Successful: ${data.user.username}`);
      console.log("🔑 Token:", data.token);

      // ✅ Store user info in localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/"); // Redirect to dashboard

    } catch (error) {
      console.error("❌ Network Error:", error);
      setErrorMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-full md:w-1/2 bg-blue-500 flex justify-center items-center">
        <img src={signup} alt="Login" className="w-full h-full object-cover" />
      </div>

      <div className="w-full md:w-1/2 bg-blue-500 flex flex-col justify-center items-center p-6">
        <h2 className="text-center text-lg font-semibold text-white mb-4">Login</h2>

        {errorMessage && <p className="text-red-500 bg-white p-2 rounded-md">{errorMessage}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
          <div className="relative">
            <FaEnvelope className="absolute left-3 top-3 text-blue-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email"
              className="mt-1 block w-full pl-10 pr-3 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl"
            />
          </div>

          <div className="relative">
            <FaLock className="absolute left-3 top-3 text-blue-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="mt-1 block w-full pl-10 pr-3 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl"
            />
          </div>

          <button type="submit" className="w-full py-2 px-4 bg-white text-blue-500 font-semibold rounded-2xl">
            Login
          </button>
          
          <div className="text-center text-white">
            Don't have an account?{' '}
            <button 
              type="button" 
              onClick={() => navigate("/signup")} 
              className="text-white font-semibold underline hover:text-blue-200"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;