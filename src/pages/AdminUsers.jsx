import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import AdminSidebar from "../components/Navbar/adminsidebar";
import EditUserModal from "../pages/AdminEditUser";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("none");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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
      closeEditModal();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = (userId) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    fetch(`http://localhost:5000/api/admin/users/${userId}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete user");
        setUsers(users.filter((u) => u._id !== userId));
        alert("User deleted successfully!");
      })
      .catch((err) => alert(err.message));
  };

  // Sorting and searching
  const sortedUsers = [...users].sort((a, b) => {
    if (sortOrder === "az") return a.username.localeCompare(b.username);
    if (sortOrder === "za") return b.username.localeCompare(a.username);
    return 0;
  });

  const filteredUsers = sortedUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 p-6">
          <h2 className="text-3xl font-bold mb-6 text-blue-700">All Users</h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <input
              type="text"
              placeholder="Search by username or email"
              className="w-full sm:w-1/3 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="flex gap-4 items-center">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="none">No Sort</option>
                <option value="az">Username A-Z</option>
                <option value="za">Username Z-A</option>
              </select>

              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border rounded-md"
              >
                <option value={10}>Show 10</option>
                <option value={25}>Show 25</option>
                <option value={50}>Show 50</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <p>Loading users...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <>
              <div className="overflow-x-auto bg-white shadow-md rounded-lg">
                <table className="w-full border-collapse">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left">Username</th>
                      <th className="px-6 py-3 text-left">Email</th>
                      <th className="px-6 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-100 border-b">
                          <td className="px-6 py-4">{user.username}</td>
                          <td className="px-6 py-4">{user.email}</td>
                          <td className="px-6 py-4 justify-center gap-20">
                            <button
                              onClick={() => handleEdit(user._id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(user._id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center py-4">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-center mt-6 gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded ${
                      page === currentPage
                        ? "bg-blue-500 text-white"
                        : "bg-white hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
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
