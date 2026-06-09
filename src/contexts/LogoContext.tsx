import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface LogoContextType {
  logoKiriSidebar: string | null;
  logoKiriPdf: string | null;
  logoKananPdf: string | null;
  stampImage: string | null;
  isLoading: boolean;
  refreshLogos: () => Promise<void>;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined);

export const LogoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logoKiriSidebar, setLogoKiriSidebar] = useState<string | null>(null);
  const [logoKiriPdf, setLogoKiriPdf] = useState<string | null>(null);
  const [logoKananPdf, setLogoKananPdf] = useState<string | null>(null);
  const [stampImage, setStampImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshLogos = useCallback(async () => {
    try {
      const response = await api.get('/system-settings/logos');
      const data = response.data.data;
      if (data) {
        setLogoKiriSidebar(data.logo_kiri_sidebar || null);
        setLogoKiriPdf(data.logo_kiri_pdf || null);
        setLogoKananPdf(data.logo_kanan_pdf || null);
        setStampImage(data.stamp_image || null);
      }
    } catch (error) {
      console.error('Failed to fetch logos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLogos();
  }, [refreshLogos]);

  return (
    <LogoContext.Provider
      value={{
        logoKiriSidebar,
        logoKiriPdf,
        logoKananPdf,
        stampImage,
        isLoading,
        refreshLogos,
      }}
    >
      {children}
    </LogoContext.Provider>
  );
};

export const useLogo = () => {
  const context = useContext(LogoContext);
  if (!context) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
};
