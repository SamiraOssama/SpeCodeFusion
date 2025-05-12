import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationsContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const token = localStorage.getItem('token');

  const fetchNotifications = async () => {
    if (!token) {
      console.log('No token found, skipping notification fetch');
      return;
    }

    try {
      console.log('Fetching notifications...');
      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Notifications received:', data);
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      } else {
        console.error('Failed to fetch notifications:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n._id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

 
  const refreshNotifications = () => {
    fetchNotifications();
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
     
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [token]);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      fetchNotifications,
      refreshNotifications 
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}; 