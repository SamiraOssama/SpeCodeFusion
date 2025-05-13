import React, { useEffect, useState } from 'react';
import AdminSidebar from "../components/Navbar/adminsidebar";

const AdminRepositories = () => {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('none'); // Sort option (none, asc, desc)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default to 10 items per page

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error("Failed to delete repository");
      }

      setRepositories(repositories.filter(repo => repo._id !== id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete repository.");
    }
  };

  const filteredRepositories = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.owner?.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedRepositories = filteredRepositories.sort((a, b) => {
    if (sortOption === 'asc') {
      return a.name < b.name ? -1 : 1;
    }
    if (sortOption === 'desc') {
      return a.name > b.name ? -1 : 1;
    }
    return 0; // No sorting
  });

  const indexOfLastRepo = currentPage * itemsPerPage;
  const indexOfFirstRepo = indexOfLastRepo - itemsPerPage;
  const currentRepositories = sortedRepositories.slice(indexOfFirstRepo, indexOfLastRepo);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to the first page when the items per page changes
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  return (
    <div className="min-h-screen flex">
      <AdminSidebar />
      <div className="p-6 overflow-y-auto text-gray-800 flex-1">
        <h1 className="text-3xl font-bold mb-6 text-blue-700">All Repositories</h1>

        {/* Search Bar, Sort, and Items per page selector on the same line */}
        <div className="mb-6 flex justify-between items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by repo name or owner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="p-2 border rounded w-full"
            />
          </div>

          {/* Items per page selector */}
          <div className="flex items-center">
            <label className="mr-2">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="p-2 border rounded"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>

          {/* Sort options as a select dropdown */}
          <div className="flex items-center">
            <span className="mr-2">Sort by:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="none">No Sort</option>
              <option value="asc">A-Z</option>
              <option value="desc">Z-A</option>
            </select>
          </div>
        </div>

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
                {currentRepositories.length > 0 ? (
                  currentRepositories.map((repo) => (
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

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
            >
              Prev
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage * itemsPerPage >= filteredRepositories.length}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRepositories;
