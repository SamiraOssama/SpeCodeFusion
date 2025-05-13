import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import signup from "../assets/images/signup.png";
import { FaUser, FaEnvelope, FaLock} from "react-icons/fa"; 
import { FcGoogle } from "react-icons/fc";

const SignUp = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errorMessage, setErrorMessage] = useState(""); 

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); 

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
        navigate("/login"); 
      } else {
        setErrorMessage(data.message || "Signup failed. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Network error. Please try again.");
    }
  };

  const getPasswordStrengthMessage = () => {
    if (passwordStrength === 0) return "Weak";
    if (passwordStrength <= 25) return "Weak";
    if (passwordStrength <= 50) return "Moderate";
    if (passwordStrength <= 75) return "Strong";
    return "Very Strong";
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-full md:w-1/2 bg-blue-500 flex justify-center items-center">
        <img
          src={signup}
          alt="Sign Up"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="w-full md:w-1/2 bg-blue-500 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-center text-2xl font-semibold text-white mb-6">Sign Up</h2>

          {errorMessage && (
            <div className="mb-6">
              <p className="text-red-500 bg-white p-3 rounded-lg text-center">{errorMessage}</p>
            </div>
          )}

          <div className="mb-8">
            <p className="text-white text-center mb-3">Sign up with:</p>
            <button 
              onClick={() => window.location.href = "http://localhost:5000/api/users/google"}
              className="w-full h-12 flex items-center justify-center bg-white text-blue-500 font-semibold rounded-lg shadow-md hover:bg-blue-50 transition duration-200"
            >
              <FcGoogle className="text-xl mr-2" /> Sign up with Google
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
              <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-lg" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Username"
                className="w-full h-12 pl-12 pr-4 bg-white text-blue-500 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
              />
            </div>

            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-lg" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email"
                className="w-full h-12 pl-12 pr-4 bg-white text-blue-500 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
              />
            </div>

            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-lg" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  checkPasswordStrength(e.target.value);
                }}
                required
                placeholder="Password"
                className="w-full h-12 pl-12 pr-4 bg-white text-blue-500 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
              />
            </div>

            <div className="text-sm text-white text-center">
              Password Strength: {getPasswordStrengthMessage()}
            </div>

            <button 
              type="submit" 
              className="w-full h-12 bg-white text-blue-500 font-semibold rounded-lg shadow-md hover:bg-blue-50 transition duration-200"
            >
              Create Account
            </button>
          </form>

          <div className="mt-6 text-center">
            <p 
              className="text-sm text-white hover:text-gray-200 cursor-pointer"
              onClick={() => navigate("/login")}
            >
              Already have an account? <span className="font-semibold underline">Login</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
