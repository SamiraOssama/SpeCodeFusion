import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // For navigation
import { FaEnvelope } from 'react-icons/fa';
import signup from "../assets/images/signup.png";
import Navbar from "../components/Navbar/Navbar";

const ResetPassword = () => {
  const navigate = useNavigate();

  // State for email input
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // For displaying error messages

  // Function to handle sending password reset email
  const handlePasswordReset = async (email) => {
    try {
      const response = await fetch("http://localhost:5000/api/users/send-reset-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message); // Success message
        navigate('/login'); // Redirect to login page after success
      } else {
        setErrorMessage(data.message); // Error message
      }
    } catch (error) {
      console.error("Error sending reset email:", error);
      setErrorMessage("There was an error. Please try again.");
    }
  };

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    // Send password reset request
    handlePasswordReset(email);
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

          {/* Display error message if any */}
          {errorMessage && <p className="text-red-500 bg-white p-2 rounded-md">{errorMessage}</p>}

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
