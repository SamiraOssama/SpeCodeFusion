import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // For navigation
import { FaEnvelope } from 'react-icons/fa';
import signup from "../assets/images/signup.png";
import Navbar from "../components/Navbar/Navbar";
const ResetPassword = () => {
  const navigate = useNavigate();

  // State for email input
  const [email, setEmail] = useState('');

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you can perform validation or API calls to send the reset link
    console.log('Password Reset Email Sent to:', email);
    
    // Redirect to login page after email submission
    navigate('/login'); // Redirect to login page after successful email submission
  };

  return (
    <>
      <Navbar /> 
    <div className="min-h-screen flex">
      {/* Left side (Image) */}
      <div className="w-full md:w-1/2 bg-blue-500 flex justify-center items-center">
        <img
          src={signup} // Replace with your reset password image
          alt="Reset Password"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side (Form with Blue Background) */}
      <div className="w-full md:w-1/2 bg-blue-500 flex flex-col justify-center items-center p-6">
        <h2 className="text-center text-lg font-semibold text-white mb-4">
          Reset Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
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
              placeholder="Enter your email"
              className="mt-1 block w-full pl-10 pr-3 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-700 placeholder-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-6">
            <button
              type="submit"
              className="w-[400px] py-2 px-4 bg-white text-blue-500 font-semibold rounded-2xl shadow-md hover:bg-yellow-500 transition duration-200 mt-6"
            >
              Send Reset Link
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-white">
            Remembered your password?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-white hover:underline"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default ResetPassword;
