'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import UserService from '@/Services/UserService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    UserService.initKeycloak(() => {
      setAuthenticated(UserService.isLoggedIn());
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ authenticated, UserService }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
