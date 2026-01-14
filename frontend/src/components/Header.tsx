// src/components/Header.tsx
import { useState, useEffect } from 'react';

const Header = () => {
  const [theme, setTheme] = useState('light');

  // Detectar tema actual del body
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.body.classList.contains('theme-dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    updateTheme();
    
    // Observer para cambios de tema
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  return (
    <header className="bg-body-tertiary shadow-sm py-3 app-header">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-12">
            <div className="d-flex align-items-center">
              {/* Logo según tema */}
              <img 
                src={theme === 'dark' ? '/geo/logo_dark.png' : '/geo/logo_light.png'} 
                alt="Geo-Data Analytics" 
                height="40" 
                className="me-3"
                onError={(e) => {
                    // Fallback: mostrar emoji si no hay logo
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    
                    // Añadir emoji antes del título
                    const titleElement = document.querySelector('h1');
                    if (titleElement && !titleElement.textContent?.includes('🌍')) {
                    titleElement.textContent = '🌍 ' + titleElement.textContent;
                    }
                }}
                />
              <div>
                <h1 className="h3 mb-0 fw-bold">Geo-Data Analytics</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;