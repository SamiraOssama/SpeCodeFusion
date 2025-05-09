import React, { useState, useEffect } from "react";

const AdminEditUser = ({ isOpen, onClose, userData, onSave }) => {
  const [formData, setFormData] = useState({ username: "", email: "" });

  useEffect(() => {
    if (userData) {
      setFormData({
        username: userData.username || "",
        email: userData.email || "",
      });
    }
  }, [userData]);

  if (!isOpen || !userData) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSave({ ...userData, ...formData });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-8 border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Edit User
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-gray-700 font-medium">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-700 font-medium">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminEditUser;
