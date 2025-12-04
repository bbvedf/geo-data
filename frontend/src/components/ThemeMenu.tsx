// src/components/ThemeMenu.tsx
import { useState } from 'react';
import 'bootstrap-icons/font/bootstrap-icons.css';
import styles from './ThemeMenu.module.css';

interface ThemeMenuProps {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeMenu = ({ theme, setTheme }: ThemeMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
          <button className={styles.menuItem} onClick={() => setIsOpen(false)}>
            <i className="bi bi-map-fill"></i>
            Mapa Interactivo
          </button>
          <button className={styles.menuItem} onClick={() => setIsOpen(false)}>
            <i className="bi bi-bar-chart-fill"></i>
            Gráficos
          </button>
          <button className={styles.menuItem} onClick={() => setIsOpen(false)}>
            <i className="bi bi-table"></i>
            Tabla de Datos
          </button>
          
          <div className={styles.menuDivider}></div>
          
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