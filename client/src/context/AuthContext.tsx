import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Participant, Team } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthResponse {
  token: string;
  user: User;
  participant?: Participant | null;
  team?: Team | null;
  isLeader?: boolean;
}

interface AuthContextType {
  user: User | null;
  participant: Participant | null;
  team: Team | null;
  isLeader: boolean;
  token: string | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLeader, setIsLeader] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('synapse_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    const savedToken = localStorage.getItem('synapse_token');
    if (!savedToken) {
      setUser(null);
      setParticipant(null);
      setTeam(null);
      setIsLeader(false);
      setLoading(false);
      return;
    }

    try {
      const data = await api.get<{
        user: User;
        participant: Participant | null;
        team: Team | null;
        isLeader: boolean;
      }>('/auth/me');

      setUser(data.user);
      setParticipant(data.participant);
      setTeam(data.team);
      setIsLeader(data.isLeader);
    } catch (err) {
      console.warn('[Auth] Session expired or invalid:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [token]);

  /**
   * Primary and only authentication system: Google Auth (GIS / Credential token)
   */
  const loginWithGoogle = async (credential: string) => {
    setLoading(true);
    try {
      const data = await api.post<AuthResponse>('/auth/google', { credential });
      localStorage.setItem('synapse_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setParticipant(data.participant || null);
      setTeam(data.team || null);
      setIsLeader(!!data.isLeader);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('synapse_token');
    setToken(null);
    setUser(null);
    setParticipant(null);
    setTeam(null);
    setIsLeader(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        participant,
        team,
        isLeader,
        token,
        loading,
        loginWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
