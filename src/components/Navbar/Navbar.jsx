import React, { useState, useEffect } from "react";
import { IoMdMenu } from "react-icons/io";
import { Link, useNavigate } from "react-router-dom";

const getNavbarMenu = (user) => {
  const menu = [
    { id: 1, title: "Home", path: "/" },
    { id: 2, title: "My Repos", path: "/Allrepos" },
    { id: 3, title: "All Repos", path: "/All" },
    { id: 4, title: "My Profile", path: "/profile" },
    { id: 5, title: "Requests", path: "/Requestpage" },
  ];

  if (user?.role === "admin") {
    menu.push({ id: 6, title: "Dashboard", path: "/AdminDashboard" });
  }

  return menu;
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [requestCount, setRequestCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchRequestCount(parsedUser.id);
    }
  }, []);
  

  const fetchRequestCount = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}/repo-requests/count`);
      const data = await response.json();
      setRequestCount(data.count);
    } catch (error) {
      console.error("Error fetching request count:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  const handleRequirementExtraction = () => {
    user ? navigate("/Dashboarddmalak") : navigate("/login");
  };

  const renderRequestBadge = () => {
    return requestCount > 0 && (
      <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
        {requestCount}
      </span>
    );
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center py-4 px-4">

        {/* Logo */}
        <Link to="/" className="font-bold text-2xl text-blue-600 whitespace-nowrap">
          SpeCode Fusion
        </Link>

        {/* Desktop Menu - All items in one line */}
        <div className="hidden lg:flex items-center space-x-6">
        {getNavbarMenu(user).map((menu) => (

            <div key={menu.id} className="relative flex items-center">
              <Link
                to={menu.path}
                className="text-gray-700 hover:text-blue-500 transition whitespace-nowrap"
              >
                {menu.title}
                {menu.id === 5 && renderRequestBadge()}
              </Link>
            </div>
          ))}

          <button
            onClick={handleRequirementExtraction}
            className="text-gray-700 hover:text-blue-500 transition whitespace-nowrap"
          >
            Create Repository
          </button>

          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 whitespace-nowrap">Welcome, {user.username || user.email}!</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition whitespace-nowrap"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-3xl text-gray-700"
          onClick={() => setIsOpen(!isOpen)}
        >
          <IoMdMenu />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="lg:hidden bg-white shadow-md py-4 px-6">
          {NavbarMenu.map((menu) => (
            <div key={menu.id} className="relative py-2">
              <Link
                to={menu.path}
                className="text-gray-700 hover:text-blue-500 transition flex items-center justify-between"
                onClick={() => setIsOpen(false)}
              >
                <span>{menu.title}</span>
                {menu.id === 5 && renderRequestBadge()}
              </Link>
            </div>
          ))}
          
          <button
            onClick={() => {
              handleRequirementExtraction();
              setIsOpen(false);
            }}
            className="w-full text-left text-gray-700 py-2 hover:text-blue-500 transition"
          >
            Create Repository
          </button>

          {user ? (
            <div className="mt-4">
              <p className="text-gray-700 py-2">Welcome, {user.username || user.email}!</p>
              <button
                onClick={handleLogout}
                className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="block bg-blue-500 text-white text-center py-2 rounded-lg hover:bg-blue-600 transition mt-4"
              onClick={() => setIsOpen(false)}
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
