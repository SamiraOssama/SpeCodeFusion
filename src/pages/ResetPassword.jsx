import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaUser, FaLock } from 'react-icons/fa';
import signup from "../assets/images/signup.png";
import Navbar from "../components/Navbar/Navbar";

const ResetPassword = () => {
  const navigate = useNavigate();


  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [step, setStep] = useState(1); 
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');


  const handleVerification = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email || !username) {
      setErrorMessage('Please enter both email and username');
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/users/send-reset-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, username }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResetToken(data.resetToken);
        setStep(2);
        setSuccessMessage('Verification successful. Please set your new password.');
      } else {
        setErrorMessage(data.message || 'Verification failed. Please check your email and username.');
      }
    } catch (error) {
      console.error("Error during verification:", error);
      setErrorMessage("Server error. Please try again later.");
    }
  };

  
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords don't match!");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/users/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          token: resetToken,
          newPassword 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage(data.message);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setErrorMessage(data.message);
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("There was an error resetting your password.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex">
       
        <div className="w-full md:w-1/2 bg-blue-500 flex justify-center items-center">
          <img
            src={signup}
            alt="Reset Password"
            className="w-full h-full object-cover"
          />
        </div>

       
        <div className="w-full md:w-1/2 bg-blue-500 flex flex-col justify-center items-center p-6">
          <h2 className="text-center text-2xl font-semibold text-white mb-4">
            {step === 1 ? 'Reset Password - Verification' : 'Set New Password'}
          </h2>

      
          {errorMessage && <p className="text-red-500 bg-white p-2 rounded-md mb-4">{errorMessage}</p>}
          {successMessage && <p className="text-green-500 bg-white p-2 rounded-md mb-4">{successMessage}</p>}

          {step === 1 ? (
            
            <form onSubmit={handleVerification} className="space-y-4 w-full max-w-md">
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-3 text-blue-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="mt-1 block w-full pl-10 pr-3 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-700 placeholder-blue-500"
                />
              </div>

              <div className="relative">
                <FaUser className="absolute left-3 top-3 text-blue-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter your username"
                  className="mt-1 block w-full pl-10 pr-3 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-700 placeholder-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-white text-blue-500 font-semibold rounded-2xl shadow-md hover:bg-yellow-500 transition duration-200"
              >
                Verify Account
              </button>
            </form>
          ) : (
           
            <form onSubmit={handlePasswordReset} className="space-y-4 w-full max-w-md">
              <div className="relative">
                <FaLock className="absolute left-3 top-3 text-blue-500" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  className="mt-1 block w-full pl-10 pr-3 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-700 placeholder-blue-500"
                />
              </div>

              <div className="relative">
                <FaLock className="absolute left-3 top-3 text-blue-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  className="mt-1 block w-full pl-10 pr-3 py-2 bg-white text-blue-500 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-700 placeholder-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-white text-blue-500 font-semibold rounded-2xl shadow-md hover:bg-yellow-500 transition duration-200"
              >
                Reset Password
              </button>
            </form>
          )}

          <div className="mt-4 text-center">
            <p 
              onClick={() => navigate('/login')}
              className="text-sm text-white hover:text-gray-200 cursor-pointer font-semibold hover:underline"
            >
              Remembered your password?
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
