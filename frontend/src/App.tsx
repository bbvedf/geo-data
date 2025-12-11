// src/App.tsx - CON React Router v6
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './index.css';
import { Header, DashboardView, CovidDatasetView, ThemeMenu, DatasetNotFoundView, WeatherDatasetView, ElectionDatasetView, AirQualityDatasetView, HousingDatasetView } from './components';


function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${theme}`);
  localStorage.setItem('theme', theme);
  
  // Disparar evento personalizado
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
 }, [theme]);


  return (
    <BrowserRouter>
      <ThemeMenu theme={theme} setTheme={setTheme} />
      <Header />
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/dataset/covid" element={<CovidDatasetView />} />
          <Route path="/dataset/weather" element={<WeatherDatasetView />} />
          <Route path="/dataset/elections" element={<ElectionDatasetView />} />
          <Route path="/dataset/airquality" element={<AirQualityDatasetView />} />
          <Route path="/dataset/housing" element={<HousingDatasetView />} />
          <Route path="/dataset/:datasetId" element={<DatasetNotFoundView />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;