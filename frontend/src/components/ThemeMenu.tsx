// src/components/ThemeMenu.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import styles from './ThemeMenu.module.css';

interface ThemeMenuProps {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeMenu = ({ theme, setTheme }: ThemeMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate(); // <-- Hook de navegación

  return (
    <div className={styles.menuContainer}>
      <button
        className={styles.hamburgerButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menú"
      >
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
      </button>
      
      {isOpen && (
        <div className={styles.menuDropdown}>
          {/* NUEVO: Opción Inicio */}
          <button 
            className={styles.menuItem} 
            onClick={() => {
              navigate('/');
              setIsOpen(false);
            }}
          >
            <i className="bi bi-house-fill"></i>
            Inicio
          </button>
          
          <div className={styles.menuDivider}></div>
          
          {/* Opciones de datasets (navegación) */}
          <button 
            className={styles.menuItem} 
            onClick={() => {
              navigate('/dataset/covid');
              setIsOpen(false);
            }}
          >
            <i className="bi bi-virus"></i>
            COVID España
          </button>
            
          <button 
            className={styles.menuItem}
            onClick={() => {
              navigate('/dataset/weather');
              setIsOpen(false);
            }}
          >
            <i className="bi bi-cloud-sun-fill"></i>
            Clima España
          </button>  

          <button 
            className={styles.menuItem}
            onClick={() => {
              navigate('/dataset/elections');
              setIsOpen(false);
            }}            
          >
            <i className="bi bi-bar-chart-fill"></i>
            Resultados Electorales
          </button>
          
          <button 
            className={styles.menuItem}
            onClick={() => {
              navigate('/dataset/airquality');
              setIsOpen(false);
            }}
          >
            <i className="bi bi-wind"></i>
            Calidad del Aire
          </button>

          <button 
            className={styles.menuItem}
            onClick={() => {
              navigate('/dataset/housing');
              setIsOpen(false);
            }}            
          >
            <i className="bi bi-house-door-fill"></i>
            Precios Vivienda
          </button>
          
          <div className={styles.menuDivider}></div>
          
          
          {/* Toggle tema (mantener) */}
          <button 
            className={styles.menuItem}
            onClick={() => {
              setTheme(theme === 'light' ? 'dark' : 'light');
              setIsOpen(false);
            }}
          >
            {theme === 'light' ? (
              <>
                <i className="bi bi-moon-fill"></i>
                Modo Oscuro
              </>
            ) : (
              <>
                <i className="bi bi-sun-fill"></i>
                Modo Claro
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemeMenu;