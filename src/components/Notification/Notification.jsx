import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import './Notification.css';

const Notification = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose && onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <FiCheckCircle className="text-green-500" size={24} />,
    error: <FiXCircle className="text-red-500" size={24} />,
    warning: <FiAlertCircle className="text-yellow-500" size={24} />
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-50 border border-green-200' :
            type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}
        >
          {icons[type]}
          <p className={`text-sm font-medium ${
            type === 'success' ? 'text-green-800' :
            type === 'error' ? 'text-red-800' :
            'text-yellow-800'
          }`}>
            {message}
          </p>
          <button
            onClick={() => {
              setIsVisible(false);
              onClose && onClose();
            }}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <FiXCircle size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification; 