import React, { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { FiSettings, FiUsers, FiBarChart, FiCode } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import './RepoSidebar.css';

const RepoSidebar = () => {
  const { repoId } = useParams();
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState(null);
  const { darkMode } = useTheme();

  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('No token found in localStorage');
          setIsOwner(false);
          return;
        }

        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const userId = tokenPayload.id;
        console.log('User ID from JWT:', userId);
        
        const response = await fetch(`http://localhost:5000/api/repos/${repoId}/details`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch repo details: ${response.status}`);
        }

        const repoData = await response.json();
        console.log('Repo Data:', repoData);
        console.log('Comparing IDs:', {
          userId: userId,
          ownerId: repoData.repo.owner
        });

        setIsOwner(userId === repoData.repo.owner);
      } catch (error) {
        console.error('Error checking owner status:', error);
        setError(error.message);
        setIsOwner(false);
      }
    };

    if (repoId) {
      checkOwnership();
    }
  }, [repoId]);

  const navItems = [
    {
      path: `/repo/${repoId}/settings/general`,
      icon: <FiSettings />,
      label: 'General Settings'
    },
    ...(isOwner ? [{
      path: `/repo/${repoId}/settings/collaborators`,
      icon: <FiUsers />,
      label: 'Collaborators'
    }] : []),
    {
      path: `/repo/${repoId}/settings/reports`,
      icon: <FiBarChart />,
      label: 'Reports'
    },
    {
      path: `/repo/${repoId}/settings/suggestions`,
      icon: <FiCode />,
      label: 'Code Suggestions'
    }
  ];

  if (error) {
    console.error('RepoSidebar error:', error);
  }

  return (
    <div className={`repo-sidebar ${darkMode ? 'dark' : ''}`}>
      <nav className="repo-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''} ${darkMode ? 'dark' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default RepoSidebar; 