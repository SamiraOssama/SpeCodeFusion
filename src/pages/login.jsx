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

      <div className="w-full md:w-1/2 bg-blue-500 flex flex-col justify-center items-center p-6">
        <h2 className="text-center text-lg font-semibold text-white mb-4">Login</h2>

        {errorMessage && <p className="text-red-500 bg-white p-2 rounded-md">{errorMessage}</p>}

        <div className="mt-6 text-center">
          <p className="text-white mb-2">Or sign in with:</p>
          <button 
            onClick={() => window.location.href = "http://localhost:5000/api/users/google"}
            className="w-[400px] flex items-center justify-center py-2 px-4 bg-white text-blue-500 font-semibold rounded-2xl shadow-md hover:bg-blue-100 transition duration-200 mb-6"
          >
            <FcGoogle className="mr-2 text-yellow-500" />  Sign in with Google
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
          <div className="relative">
            <FaEnvelope className="absolute left-3 top-3 text-blue-500" />
            <input
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              placeholder="Username or Email"
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
        </form>

        <span
          className="text-blue-600 hover:underline cursor-pointer"
          onClick={() => navigate("/signup")}
        >
          <p className="mt-4 text-sm text-white">
            Don't have an account? Sign up
          </p>
        </span>

        <span
          className="text-blue-600 hover:underline cursor-pointer"
          onClick={() => navigate("/reset-password")}
        >
          <p className="mt-4 text-sm text-white">
            Forgot password? Reset it
          </p>
        </span>
      </div>
    </div>
  );
};

export default Login;
