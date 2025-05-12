import React, { createContext, useContext, useState } from 'react';

const RepoContext = createContext();

export const RepoProvider = ({ children }) => {
  const [repoName, setRepoName] = useState('');
  const [repoId, setRepoId] = useState(null);

  const updateRepo = (id, name) => {
    setRepoId(id);
    setRepoName(name);
  };

  return (
    <RepoContext.Provider value={{ repoName, repoId, updateRepo }}>
      {children}
    </RepoContext.Provider>
  );
};

export const useRepo = () => {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error('useRepo must be used within a RepoProvider');
  }
  return context;
}; 