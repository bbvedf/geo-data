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
  const [openSubmenus, setOpenSubmenus] = useState({ finanzas: false, geo: false });
  const navigate = useNavigate();

  const [user] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const toggleSubmenu = (menu: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenSubmenus(prev => ({
      ...prev,
      // @ts-ignore
      [menu]: !prev[menu]
    }));
  };

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
          {user && user.isApproved !== false ? (
            <>
              {/* --- SECCIÓN: NAVEGACIÓN --- */}
              <div className={styles.sectionHeader}>Navegación</div>
              <button
                className={styles.menuItem}
                onClick={() => window.location.href = 'https://ryzenpc.mooo.com/'}
              >
                <i className="bi bi-house-fill"></i>
                Dashboard Principal
              </button>

              {user?.role === 'admin' && (
                <button
                  className={styles.menuItem}
                  onClick={() => window.location.href = 'https://ryzenpc.mooo.com/#/dashboard?tab=configuracion'}
                >
                  <i className="bi bi-people-fill"></i>
                  Gestión de Usuarios
                </button>
              )}

              <div className={styles.menuDivider}></div>

              {/* --- SECCIÓN: APLICACIONES --- */}
              <div className={styles.sectionHeader}>Aplicaciones</div>

              {/* Finanzas (Colapsable) */}
              <div className={styles.submenu}>
                <div className={styles.menuItemContainer}>
                  <div className={styles.menuItemHeader} onClick={(e) => toggleSubmenu('finanzas', e)}>
                    <i className="bi bi-wallet2"></i>
                    <span>Finanzas Personales</span>
                  </div>
                  <button className={styles.submenuToggle} onClick={(e) => toggleSubmenu('finanzas', e)}>
                    {/* @ts-ignore */}
                    <i className={`bi bi-chevron-${openSubmenus.finanzas ? 'up' : 'down'}`}></i>
                  </button>
                </div>
                {/* @ts-ignore */}
                {openSubmenus.finanzas && (
                  <div className={styles.submenuContent}>
                    <button className={styles.menuSubItem} onClick={() => window.location.href = '/finanzas/categories'}>
                      <i className="bi bi-folder2-open"></i> Categorías
                    </button>
                    <button className={styles.menuSubItem} onClick={() => window.location.href = '/finanzas/transactions'}>
                      <i className="bi bi-cash-stack"></i> Transacciones
                    </button>
                    <button className={styles.menuSubItem} onClick={() => window.location.href = '/finanzas/stats'}>
                      <i className="bi bi-graph-up-arrow"></i> Estadísticas
                    </button>
                  </div>
                )}
              </div>

              {/* Geo-Data (Colapsable) */}
              <div className={styles.submenu}>
                <div className={styles.menuItemContainer}>
                  <div className={styles.menuItemHeader} onClick={(e) => toggleSubmenu('geo', e)}>
                    <i className="bi bi-geo-alt-fill"></i>
                    <span>Geo-Data Analytics</span>
                  </div>
                  <button className={styles.submenuToggle} onClick={(e) => toggleSubmenu('geo', e)}>
                    {/* @ts-ignore */}
                    <i className={`bi bi-chevron-${openSubmenus.geo ? 'up' : 'down'}`}></i>
                  </button>
                </div>
                {/* @ts-ignore */}
                {openSubmenus.geo && (
                  <div className={styles.submenuContent}>
                    <button className={styles.menuSubItem} onClick={() => { navigate('/'); setIsOpen(false); }}>
                      <i className="bi bi-speedometer2"></i> Inicio
                    </button>
                    <button className={styles.menuSubItem} onClick={() => { navigate('/dataset/covid'); setIsOpen(false); }}>
                      <i className="bi bi-virus"></i> COVID España
                    </button>
                    <button className={styles.menuSubItem} onClick={() => { navigate('/dataset/weather'); setIsOpen(false); }}>
                      <i className="bi bi-cloud-sun-fill"></i> Clima España
                    </button>
                    <button className={styles.menuSubItem} onClick={() => { navigate('/dataset/elections'); setIsOpen(false); }}>
                      <i className="bi bi-bar-chart-fill"></i> Resultados Electorales
                    </button>
                    <button className={styles.menuSubItem} onClick={() => { navigate('/dataset/airquality'); setIsOpen(false); }}>
                      <i className="bi bi-wind"></i> Calidad del Aire
                    </button>
                    <button className={styles.menuSubItem} onClick={() => { navigate('/dataset/housing'); setIsOpen(false); }}>
                      <i className="bi bi-house-door-fill"></i> Precios Vivienda
                    </button>
                  </div>
                )}
              </div>

              {user?.role === 'admin' && (
                <button className={styles.menuItem} onClick={() => window.location.href = '/tickets/'}>
                  <i className="bi bi-ticket-perforated-fill"></i> Sistema de Tickets
                </button>
              )}

              <button className={styles.menuItem} onClick={() => window.location.href = '/contactos/'}>
                <i className="bi bi-person-lines-fill"></i> Agenda de Contactos
              </button>

              <div className={styles.menuDivider}></div>

              {/* --- SECCIÓN: HERRAMIENTAS --- */}
              <div className={styles.sectionHeader}>Herramientas</div>
              <button className={styles.menuItem} onClick={() => window.location.href = 'https://ryzenpc.mooo.com/#/dashboard?tab=calculadora'}>
                <i className="bi bi-calculator-fill"></i> Interés Compuesto
              </button>
              <button className={styles.menuItem} onClick={() => window.location.href = 'https://ryzenpc.mooo.com/#/dashboard?tab=mortgage'}>
                <i className="bi bi-house-door-fill"></i> Hipoteca
              </button>
              <button className={styles.menuItem} onClick={() => window.location.href = 'https://ryzenpc.mooo.com/#/dashboard?tab=basic-calculator'}>
                <i className="bi bi-percent"></i> Calculadora Básica
              </button>

              <div className={styles.menuDivider}></div>
            </>
          ) : (
            <div className={styles.sectionHeader}>Sistema</div>
          )}

          {/* --- SECCIÓN: SISTEMA --- */}
          <button
            className={styles.menuItem}
            onClick={() => {
              setTheme(theme === 'light' ? 'dark' : 'light');
              setIsOpen(false);
            }}
          >
            {theme === 'light' ? (
              <>
                <i className="bi bi-moon-stars-fill"></i> Modo Oscuro
              </>
            ) : (
              <>
                <i className="bi bi-sun-fill"></i> Modo Claro
              </>
            )}
          </button>

          <button
            className={`${styles.menuItem} ${styles.logoutItem}`}
            onClick={() => window.location.href = 'https://ryzenpc.mooo.com/api/auth/logout'}
          >
            <i className="bi bi-box-arrow-right"></i>
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemeMenu;