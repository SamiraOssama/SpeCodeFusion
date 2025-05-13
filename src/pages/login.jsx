import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import signup from "../assets/images/signup.png";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

const Login = () => {
  const navigate = useNavigate();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message || "Login failed. Please try again.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      window.location.href = data.user.role === "admin" ? "/admindashboard" : "/";
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

      <div className="w-full md:w-1/2 bg-blue-500 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-center text-2xl font-semibold text-white mb-6">Login</h2>

          {errorMessage && (
            <div className="mb-6">
              <p className="text-red-500 bg-white p-3 rounded-lg text-center">{errorMessage}</p>
            </div>
          )}

          <div className="mb-8">
            <p className="text-white text-center mb-3">Sign in with:</p>
            <button 
              onClick={() => window.location.href = "http://localhost:5000/api/users/google"}
              className="w-full h-12 flex items-center justify-center bg-white text-blue-500 font-semibold rounded-lg shadow-md hover:bg-blue-50 transition duration-200"
            >
              <FcGoogle className="text-xl mr-2" /> Sign in with Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 text-white bg-blue-500">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-lg" />
              <input
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                placeholder="Username or Email"
                className="w-full h-12 pl-12 pr-4 bg-white text-blue-500 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
              />
            </div>

            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-lg" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full h-12 pl-12 pr-4 bg-white text-blue-500 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
              />
            </div>

            <button 
              type="submit" 
              className="w-full h-12 bg-white text-blue-500 font-semibold rounded-lg shadow-md hover:bg-blue-50 transition duration-200"
            >
              Login
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <p 
              className="text-sm text-white hover:text-gray-200 cursor-pointer"
              onClick={() => navigate("/signup")}
            >
              Don't have an account? <span className="font-semibold underline">Sign up</span>
            </p>
            <p 
              className="text-sm text-white hover:text-gray-200 cursor-pointer"
              onClick={() => navigate("/reset-password")}
            >
              Forgot password? <span className="font-semibold underline">Reset it</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
