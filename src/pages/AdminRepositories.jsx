import React, { useEffect, useState } from 'react';
import Navbar from "../components/Navbar/Navbar";
import AdminSidebar from "../components/Navbar/adminsidebar";

const AdminRepositories = () => {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRepositories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/repositories');
      if (!response.ok) throw new Error('Failed to fetch repositories');
      const data = await response.json();
      setRepositories(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching repositories:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this repository?")) return;
  
    try {
      const response = await fetch(`http://localhost:5000/api/admin/repositories/${id}`, {
        method: 'DELETE',
      });
  
      // Check if the response is OK (status code 200-299)
      if (!response.ok) {
        const errorText = await response.text(); // Get the response body as text
        console.error('Error response:', errorText); // Log the error body for debugging
        throw new Error("Failed to delete repository");
      }
  
      // If delete is successful, filter out the deleted repository
      setRepositories(repositories.filter(repo => repo._id !== id));
  
    } catch (error) {
      console.error("Delete error:", error); // Log the error message
      alert("Failed to delete repository.");
    }
  };
  
  

  useEffect(() => {
    fetchRepositories();
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex">
        <AdminSidebar />

        <div className="p-6 overflow-y-auto text-gray-800 flex-1">
          <h1 className="text-3xl font-bold mb-6 text-blue-700">All Repositories</h1>

          {loading && <p className="text-blue-500">Loading...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}

          {!loading && !error && (
            <div className="overflow-x-auto bg-white shadow-md rounded-lg">
              <table className="w-full border-collapse">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left">Repo Name</th>
                    <th className="px-6 py-3 text-left">Owner</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {repositories.length > 0 ? (
                    repositories.map((repo) => (
                      <tr key={repo._id} className="hover:bg-gray-100 border-b">
                        <td className="px-6 py-4">{repo.name}</td>
                        <td className="px-6 py-4">{repo.owner?.username || 'N/A'}</td>
                        <td className="px-6 py-4">{repo.owner?.email || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDelete(repo._id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center px-6 py-4">No repositories found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminRepositories;
