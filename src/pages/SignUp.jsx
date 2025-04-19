import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // For navigation
import signup from "../assets/images/signup.png"; // Path to your image
import { FaUser, FaEnvelope, FaLock, FaGoogle } from "react-icons/fa"; // Import icons

const SignUp = () => {
  const navigate = useNavigate();

  // State for form inputs
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errorMessage, setErrorMessage] = useState(""); // To display errors

  // Password strength checker function
  const checkPasswordStrength = (password) => {
    const lengthCriteria = password.length >= 8;
    const numberCriteria = /[0-9]/.test(password);
    const uppercaseCriteria = /[A-Z]/.test(password);
    const specialCharCriteria = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    let strength = 0;

    if (lengthCriteria) strength += 25;
    if (numberCriteria) strength += 25;
    if (uppercaseCriteria) strength += 25;
    if (specialCharCriteria) strength += 25;

    setPasswordStrength(strength);
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear previous errors

    // Validate password
    if (!password.match(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@#$%^&*!?.]{8,}$/)) {
      setErrorMessage(
        "Password must be at least 8 characters long, include a number and an uppercase letter."
      );
      return;
    }

    const userData = { username, email, password };

    try {
      const response = await fetch("http://localhost:5000/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Signup successful:", data);
        alert(data.message);
        navigate("/login"); // Redirect to login page
      } else {
        setErrorMessage(data.message || "Signup failed. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Network error. Please try again.");
    }
  };

  // Password strength message
  const getPasswordStrengthMessage = () => {
    if (passwordStrength === 0) return "Weak";
    if (passwordStrength <= 25) return "Weak";
    if (passwordStrength <= 50) return "Moderate";
    if (passwordStrength <= 75) return "Strong";
    return "Very Strong";
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side (Image) */}
      <div className="w-full md:w-1/2 bg-blue-500 flex justify-center items-center">
        <img
          src={signup}
          alt="Sign Up"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side (Form with Blue Background) */}
      <div className="w-full md:w-1/2 bg-blue-500 flex flex-col justify-center items-center p-6">
        <h1 className="text-center text-lg font-semibold text-white mb-4">
          Sign Up
        </h1>

        {/* Display error message */}
        {errorMessage && (
          <p className="text-red-500 bg-white p-2 rounded-md">{errorMessage}</p>
        )}

        {/* Continue with Google Button */}
        <button className="w-[400px] flex items-center justify-center py-2 px-4 bg-white text-blue-500 font-semibold rounded-2xl shadow-md hover:bg-blue-100 transition duration-200 mb-6">
          <FaGoogle className="mr-2 text-yellow-500" /> Continue with Google
        </button>

        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
          {/* Username Field */}
          <div className="relative">
            <FaUser className="absolute left-3 top-3 text-blue-500" />
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Username"
              className="mt-1 block w-full pl-10 pr-3 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-700 placeholder-blue-500"
            />
          </div>

          {/* Email Field */}
          <div className="relative">
            <FaEnvelope className="absolute left-3 top-3 text-blue-500" />
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email"
              className="mt-1 block w-full pl-10 pr-3 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-700 placeholder-blue-500"
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <FaLock className="absolute left-3 top-3 text-blue-500" />
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                checkPasswordStrength(e.target.value);
              }}
              required
              placeholder="Password"
              className="mt-1 block w-full pl-10 pr-3 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-700 placeholder-blue-500"
            />
          </div>

          {/* Password Strength Bar */}
          <div className="w-full h-1 mt-2 rounded-full bg-gray-300">
            <div
              className={`h-full rounded-full ${
                passwordStrength >= 75
                  ? "bg-yellow-500"
                  : passwordStrength >= 50
                  ? "bg-yellow-400"
                  : passwordStrength >= 25
                  ? "bg-yellow-300"
                  : "bg-gray-300"
              }`}
              style={{ width: `${passwordStrength}%` }}
            ></div>
          </div>

          {/* Password Strength Message */}
          <div className="mt-2 text-sm text-white">
            {getPasswordStrengthMessage()}
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-6">
            <button
              type="submit"
              className="w-[400px] py-2 px-4 bg-white text-blue-500 font-semibold rounded-2xl shadow-md hover:bg-yellow-500 transition duration-200 mt-6"
            >
              Create Account
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-white">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-white hover:underline"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
