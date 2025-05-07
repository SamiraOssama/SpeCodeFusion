import { useState } from "react";
import Navbar from "../components/Navbar/Navbar";
import AdminSidebar from "../components/Navbar/adminsidebar";

const AdminAddUser = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("Sending Data:", formData); // ✅ Debug: Check if role is included
  
      const response = await fetch("http://localhost:5000/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
  
      const data = await response.json();
      if (response.ok) {
        console.log("✅ User added:", data);
        setMessage("✅ User added successfully!");
      } else {
        console.error("❌ Error:", data.error);
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("❌ Failed to add user:", error);
      setMessage("❌ Failed to add user.");
    }
  };

  return (

        <>
            <Navbar />
        
            <div className="min-h-screen flex">
              {/* Sidebar */}
              <AdminSidebar /> 
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Add New User</h2>
      {message && <p className="mb-4">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Username" required className="w-full p-2 border rounded" />
        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required className="w-full p-2 border rounded" />
        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" required className="w-full p-2 border rounded" />
        
        {/* Role Selection */}
        <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button type="submit" className="bg-blue-500 text-white p-2 rounded">Add User</button>
      </form>
    </div>
    </div>
    </>
  );
};

export default AdminAddUser;
