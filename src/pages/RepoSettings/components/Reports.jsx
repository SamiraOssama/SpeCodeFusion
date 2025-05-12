import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiActivity, FiDownload, FiCalendar, FiUser } from 'react-icons/fi';
import { useTheme } from '../../../context/ThemeContext';
import { motion } from 'framer-motion';

const Reports = () => {
  const { repoId } = useParams();
  const { darkMode } = useTheme();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
       
        const mockActivities = [
          {
            id: 1,
            type: 'commit',
            user: 'reem',
            description: 'Updated repository settings',
            date: '2024-03-20',
            details: 'Modified access permissions and collaboration settings'
          },
          {
            id: 2,
            type: 'collaboration',
            user: 'ramrooma',
            description: 'Added new collaborator',
            date: '2024-03-19',
            details: 'Added user@example.com as a contributor'
          },
        ];
        
        setActivities(mockActivities);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching activities:', error);
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [repoId]);

  const activityVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className={`min-h-screen w-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`container mx-auto px-4 py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-none`}>
           
            <div className={`p-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiActivity className="text-blue-500" />
                Activity Reports
              </h2>
            </div>

           
            <div className={`p-6 space-y-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
             
              <div className="flex justify-end">
                <button className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}>
                  <FiDownload />
                  Export Report
                </button>
              </div>

              <div>
                {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <motion.div
                        key={activity.id}
                        variants={activityVariants}
                        initial="hidden"
                        animate="visible"
                        className={`p-6 rounded-lg transition-colors border-0 ${
                          darkMode 
                            ? 'bg-gray-700 hover:bg-gray-600' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-full ${
                            darkMode ? 'bg-gray-600' : 'bg-gray-200'
                          }`}>
                            <FiUser className={activity.type === 'commit' ? 'text-blue-500' : 'text-green-500'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {activity.description}
                              </p>
                              <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <FiCalendar className="flex-shrink-0" />
                                <span>{activity.date}</span>
                              </div>
                            </div>
                            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {activity.details}
                            </p>
                            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              by @{activity.user}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports; 