import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/Navbar/adminsidebar";

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    username: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/admin/admins");
        if (!response.ok) {
          throw new Error("Failed to fetch admins");
        }
        const data = await response.json();
        setAdmins(data);
      } catch (error) {
        setError("Failed to fetch admins.");
      }
    };
    fetchAdmins();
  }, []);

  // Handle input changes for new admin data
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAdminData({ ...newAdminData, [name]: value });
  };

  // Handle new admin submission
  const handleAddAdmin = async () => {
    const { username, email, password } = newAdminData;
    if (!username || !email || !password) {
      setError("All fields are required.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newAdminData, role: "admin" }),
      });

      if (response.ok) {
        const newAdmin = await response.json();
        setAdmins([...admins, newAdmin]);  // Add the new admin to the list
        setShowModal(false);
        setNewAdminData({ username: "", email: "", password: "" });  // Clear form
        setError(null);  // Clear errors
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to add admin.");
      }
    } catch (err) {
      setError("Failed to add admin.");
    }
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-8">
          <h2 className="text-3xl font-bold mb-6 text-blue-700 text-center">
            Manage Admins
          </h2>

          {error && (
            <p className="mb-4 text-center text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          {/* Admin Table */}
          <div className="overflow-x-auto bg-white shadow-md rounded-lg">
            <table className="w-full border-collapse">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-6 py-3 text-left">Username</th>
                  <th className="px-6 py-3 text-left">Email</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center text-gray-500">
                      No admins found
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin._id} className="hover:bg-gray-100 border-b">
                      <td className="px-6 py-4">{admin.username}</td>
                      <td className="px-6 py-4">{admin.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Button to Add New Admin */}
          <div className="mt-6 text-center">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
              onClick={() => setShowModal(true)}
            >
              Add New Admin
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Adding New Admin */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-8 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Add New Admin
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-gray-700 font-medium">Username</label>
                <input
                  type="text"
                  name="username"
                  value={newAdminData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700 font-medium">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newAdminData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700 font-medium">Password</label>
                <input
                  type="password"
                  name="password"
                  value={newAdminData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAdmin}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
              >
                Add Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAdmins;
