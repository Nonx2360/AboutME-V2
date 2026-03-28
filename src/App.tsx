import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AboutMe } from './components/AboutMe';
import { OverlayView } from './pages/OverlayView';
import { OverlayCrafter } from './pages/OverlayCrafter';

export const DISCORD_ID = "908945543223463997";

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className="custom-cursor" 
      style={{ left: `${position.x}px`, top: `${position.y}px`, transform: 'translate(-50%, -50%)' }} 
    />
  );
};

const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2,
      speed: Math.random() * 0.5 + 0.1
    }));

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        star.y += star.speed;
        if (star.y > h) star.y = 0;
      });
      requestAnimationFrame(animate);
    };

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    animate();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas id="starfield" ref={canvasRef} />;
};

function App() {
  return (
    <Router>
      <CustomCursor />
      <Starfield />
      <div className="min-h-screen relative z-10">
        <Routes>
          <Route path="/" element={<AboutMe userId={DISCORD_ID} />} />
          <Route path="/crafter" element={<OverlayCrafter />} />
          <Route path="/overlay" element={<OverlayView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
