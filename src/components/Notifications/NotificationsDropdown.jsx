import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationsContext';
import { useTheme } from '../../context/ThemeContext';
import { format } from 'date-fns';
import { IoNotificationsOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const handleNotificationClick = (notification) => {
    if (notification.type === 'repo_invitation') {
      navigate(`/repo/${notification.repoId}/invitation`, {
        state: {
          invitation: {
            invitationId: notification.metadata?.invitationId || '',
            invitedBy: notification.metadata?.invitedBy || ''
          },
          notificationId: notification._id
        }
      });
    } else if (notification.type === 'request_response' && notification.metadata?.response === 'removed') {
     
      if (!notification.read) {
        markAsRead(notification._id);
      }
    } else {
      
      if (!notification.read) {
        markAsRead(notification._id);
      }
      navigate(`/repo/${notification.repoId}`);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex items-center">
      <IoNotificationsOutline 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-6 h-6 ${darkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-500'} cursor-pointer ml-2`}
      />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[1.25rem] h-5">
          {unreadCount}
        </span>
      )}

     
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-80 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl z-50 top-full`}>
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : ''}`}>
            <div className="flex justify-between items-center">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : ''}`}>Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'}`}
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className={`p-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`block p-4 border-b last:border-b-0 cursor-pointer ${
                    darkMode
                      ? `${!notification.read ? 'bg-blue-900 bg-opacity-50' : 'hover:bg-gray-700'} border-gray-700`
                      : `${!notification.read ? 'bg-blue-50' : 'hover:bg-gray-50'}`
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : ''} ${darkMode ? 'text-gray-200' : ''}`}>
                        {notification.message}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                        {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown; 