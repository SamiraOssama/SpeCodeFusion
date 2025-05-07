import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import AdminSidebar from "../components/Navbar/adminsidebar";
import EditUserModal from "../pages/AdminEditUser";


const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/admin/users");
        if (!response.ok) throw new Error("Failed to fetch users");

        const data = await response.json();
        setUsers(data);
        setLoading(false);
      } catch (err) {
        console.error("❌ Error fetching users:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  
  const handleEdit = (userId) => {
    const user = users.find((u) => u._id === userId);
    setEditingUser(user);
    setIsModalOpen(true);
  };
  
  const closeEditModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };
  
  const handleSaveUser = async (updatedUser) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${updatedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });
      if (!res.ok) throw new Error("Update failed");
  
      const newUser = await res.json();
      setUsers(users.map(u => (u._id === newUser._id ? newUser : u)));
    } catch (err) {
      alert(err.message);
    }
  };
  

  const handleDelete = (userId) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this user?");
    if (isConfirmed) {
      fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: "DELETE",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to delete user");
          }
          alert("User deleted successfully!");
          setUsers(users.filter((user) => user._id !== userId));
        })
        .catch((err) => alert(err.message));
    }
  };

  return (
    
     <>
        <Navbar />
    
        <div className="min-h-screen flex">
        
          <AdminSidebar /> 
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">All Users</h2>

      {loading && <p>Loading users...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!loading && !error && (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-4 py-2">Username</th>
              <th className="border border-gray-300 px-4 py-2">Email</th>
              <th className="border border-gray-300 px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-100">
                  <td className="border border-gray-300 px-4 py-2">{user.username}</td>
                  <td className="border border-gray-300 px-4 py-2">{user.email}</td>
                  <td className="border border-gray-300 px-4 py-2 flex justify-around">
                   
                  
                    <td className="border border-gray-300 px-4 py-2 flex gap-2 justify-center">
  <button
    onClick={() => handleEdit(user._id)}
    className="bg-blue-500 text-white px-4 py-2 rounded-md"
  >
    Edit
  </button>
  <button
    onClick={() => handleDelete(user._id)}
    className="bg-red-500 text-white px-4 py-2 rounded-md"
  >
    Delete
  </button>
</td>

                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-4">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
    </div>
    <EditUserModal
  isOpen={isModalOpen}
  onClose={closeEditModal}
  userData={editingUser}
  onSave={handleSaveUser}
/>

    </>
  );
};

export default AdminUsers;

