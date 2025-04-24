import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import signup from "../assets/images/signup.png";
import { FaUser, FaEnvelope, FaLock} from "react-icons/fa"; 
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Navbar from "../components/Navbar/Navbar";

const SignUp = () => {
  const navigate = useNavigate();

 
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errorMessage, setErrorMessage] = useState(""); 
  const [showPassword, setShowPassword] = useState(false);


 
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
    <>
      <Navbar />
    <div className="min-h-screen flex">
   
      <div className="w-full md:w-1/2 bg-blue-500 flex justify-center items-center">
        <img
          src={signup}
          alt="Sign Up"
          className="w-full h-full object-cover"
        />
      </div>

  
      <div className="w-full md:w-1/2 bg-blue-500 flex flex-col justify-center items-center p-6">
        <h1 className="text-center text-lg font-semibold text-white mb-4">
          Sign Up
        </h1>

     
        {errorMessage && (
          <p className="text-red-500 bg-white p-2 rounded-md">{errorMessage}</p>
        )}

   
<button 
  onClick={() => window.location.href = "http://localhost:5000/api/users/google"}
  className="w-[400px] flex items-center justify-center py-2 px-4 bg-white text-blue-500 font-semibold rounded-2xl shadow-md hover:bg-blue-100 transition duration-200 mb-6"
>
  <FcGoogle className="mr-2 text-yellow-500" /> Continue with Google
</button>


        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">

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

          

        
          <div className="relative">
  <FaLock className="absolute left-3 top-3 text-blue-500" />

  <input
    type={showPassword ? "text" : "password"}
    id="password"
    name="password"
    value={password}
    onChange={(e) => {
      setPassword(e.target.value);
      checkPasswordStrength(e.target.value);
    }}
    required
    placeholder="Password"
    className="mt-1 block w-full pl-10 pr-12 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-700 placeholder-blue-500"
  />

  {/* Always render the eye icon but position it so it doesn't affect layout */}
  <span
    onClick={() => setShowPassword((prev) => !prev)}
    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 cursor-pointer"
  >
    {showPassword ? <FaEyeSlash /> : <FaEye />}
  </span>
</div>


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

        
  <span
    className="text-blue-600 hover:underline cursor-pointer"
    onClick={() => navigate("/login")}
  >
    <p className="mt-4 text-sm text-gray-600">
    Already have an account?{" "}
    </p>
  </span>

      </div>
    </div>
    </>
  );
};

export default SignUp;
