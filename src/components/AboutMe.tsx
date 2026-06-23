import { useLanyard } from '../hooks/useLanyard';
import { Music, Gamepad2, Mail, ArrowRight, Code2, X, Menu } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { SpotifyLyricsCard } from './SpotifyLyricsCard';
import { ActivityInner } from './SharedComponents';
import { useRef, useState, useEffect } from 'react';

/* ─── Magnetic ─────────────────────────────────────────────────────────── */
const Magnetic = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 150 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const mouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { width, height, left, top } = ref.current!.getBoundingClientRect();
    x.set((clientX - (left + width / 2)) * 0.2);
    y.set((clientY - (top + height / 2)) * 0.2);
  };

  const mouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={mouseMove}
      onMouseLeave={mouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
};


/* ─── SectionLabel ──────────────────────────────────────────────────────── */
const SectionLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-4 mb-12 group">
    <div className="section-label-line w-8" />
    <span className="font-sans text-[10px] font-black uppercase tracking-[0.5em] text-accent transition-all group-hover:tracking-[0.8em]">{text}</span>
  </div>
);

/* ─── Navbar ────────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Projects', href: '#projects' },
  { label: 'Arsenal', href: '#arsenal' },
  { label: 'Presence', href: '#presence' },
  { label: 'Contact', href: '#contact' },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  const handleNavClick = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <nav className="navbar">
        {/* Logo / home anchor */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 group"
          aria-label="Scroll to top"
        >
          <div className="w-3 h-3 rounded-full bg-accent group-hover:scale-125 transition-transform glow-accent" />
          <span className="hidden sm:block font-sans text-[10px] font-black uppercase tracking-[0.4em] text-white/30 group-hover:text-white transition-colors">
            Nonx2
          </span>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map(link => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className="navbar-link"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white/40 hover:text-white transition-colors"
          onClick={() => setOpen(prev => !prev)}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="navbar-drawer"
          >
            {NAV_LINKS.map(link => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="navbar-link"
              >
                {link.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ─── Main Component ────────────────────────────────────────────────────── */
export const AboutMe = ({ userId }: { userId: string }) => {
  const data = useLanyard(userId);

  const projects = [
    {
      title: 'Yuuna-Project',
      category: 'AI',
      tags: ['Python', 'PyTorch'],
      shortDesc: 'Locally-hosted AI companion with voice synthesis, character management, and avatar control.',
      description: 'Yuuna Project is a comprehensive AI companion system featuring Yuna-chan, a caring and expressive AI personality. This project combines a locally hosted language model with advanced integrations for voice synthesis, character management, and virtual avatar control.',
      image: 'https://i.postimg.cc/J7sHGy8x/Yuuna.png',
      githubUrl: 'https://github.com/nonx2360/Yuuna-Project'
    },
    {
      title: 'CafeOS',
      category: 'Full Stack',
      tags: ['TypeScript', 'Python', 'FastAPI', 'TailWindCSS'],
      shortDesc: 'POS & operations system for modern cafes — real-time orders, KDS, staff management.',
      description: 'A complete point-of-sale and operations management system designed for modern cafes and coffee shops. Built with React and FastAPI, featuring real-time order updates, kitchen display integration, staff management, and comprehensive reporting.',
      image: 'https://i.postimg.cc/cdbjn2fr/Screenshot-2026-03-28-210319.png',
      githubUrl: 'https://github.com/nonx2360/CafeOS'
    },
    {
      title: 'DSNPRU_REG',
      category: 'WebApp',
      tags: ['Python', 'SQLite3', 'FastAPI', 'TailWindCSS'],
      shortDesc: 'School activity registration system — student sign-ups and admin management dashboard.',
      description: 'A comprehensive web-based activity registration system designed for schools. It allows students to view and register for activities, while providing administrators with powerful tools to manage activities, students, and registration data.',
      image: 'https://i.postimg.cc/MTy4DZ2d/Screenshot-2026-03-28-210152.png',
      githubUrl: 'https://github.com/nonx2360/DSNPRU_REG'
    }
  ];

  const [selectedProject, setSelectedProject] = useState<typeof projects[0] | null>(null);

  useEffect(() => {
    document.body.style.overflow = selectedProject ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedProject]);

  if (!data) return null;

  const { activities, spotify } = data;
  const filteredActivities = activities.filter((a) => a.type !== 4 && a.name !== 'Spotify');

  return (
    <div className="relative min-h-screen bg-black overflow-x-hidden">
      {/* Fixed Navbar */}
      <Navbar />

      {/* Vertical Side Email */}
      <div className="fixed left-8 bottom-12 hidden lg:block z-50">
        <div className="rotate-[-90deg] origin-left">
          <a href="mailto:nutchanon9911@gmail.com" className="font-sans text-[10px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-accent transition-colors">
            nutchanon9911@gmail.com
          </a>
        </div>
      </div>

      {/* Main Content — pt-[60px] to clear fixed nav */}
      <main className="container mx-auto px-6 pt-[60px] lg:px-32 relative z-10">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="hero-section pb-24">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="hero-label">Full Stack Developer</div>
            <h1 className="hero-title text-accent">NUTCHANON</h1>
            <h1 className="hero-title text-white">NONX2</h1>
            <p className="hero-subtitle">
              Crafting high-performance, scalable, and intuitive web solutions.
              Based in Thailand, fueling ideas with music and code.
            </p>
            <div className="mt-16 flex flex-wrap gap-6">
              <Magnetic>
                <a
                  href="#contact"
                  className="px-10 py-5 bg-accent text-white font-black text-[10px] uppercase tracking-widest hover:brightness-125 transition-all glow-accent block"
                >
                  Get In Touch
                </a>
              </Magnetic>
              <Magnetic>
                <a
                  href="#projects"
                  className="px-10 py-5 border border-white/20 text-white font-black text-[10px] uppercase tracking-widest hover:border-white/60 hover:bg-white/5 transition-all block"
                >
                  View Work
                </a>
              </Magnetic>
            </div>
          </motion.div>
        </section>

        {/* ── Projects ─────────────────────────────────────────────────── */}
        <section id="projects" className="py-32">
          <SectionLabel text="Selected Projects" />
          <div className="space-y-2">
            {projects.map((project, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.23, 1, 0.32, 1] }}
                onClick={() => setSelectedProject(project)}
                className="group py-12 project-card flex flex-col md:flex-row md:items-end justify-between hover:px-8 transition-all cursor-pointer"
              >
                <div>
                  <span className="font-sans text-[10px] font-black text-accent/40 mb-4 block tracking-widest">_0{i + 1}.</span>
                  <h3 className="text-5xl lg:text-8xl font-black text-white/90 group-hover:text-white transition-colors">{project.title}</h3>

                  {/* Short description — always visible, brightens on hover */}
                  <p className="mt-4 max-w-lg text-[13px] font-medium text-white/25 group-hover:text-white/55 transition-colors leading-relaxed">
                    {project.shortDesc}
                  </p>

                  {/* Tech tags — fade in on hover */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {project.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[9px] font-bold text-white/40 border border-white/10 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="text-[9px] font-bold text-accent/50 border border-accent/20 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 delay-75">
                      {project.category}
                    </span>
                  </div>
                </div>

                <div className="mt-8 md:mt-0 flex items-center gap-6 text-white/10 group-hover:text-accent transition-all transform translate-x-4 group-hover:translate-x-0">
                  <div className="text-[10px] font-black uppercase tracking-widest">View Details</div>
                  <ArrowRight size={20} />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Arsenal ──────────────────────────────────────────────────── */}
        <section id="arsenal" className="py-32">
          <SectionLabel text="My Arsenal" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            {[
              { label: 'Frontend', items: ['React', 'TypeScript', 'Tailwind', 'Framer'] },
              { label: 'Backend', items: ['Node.js', 'Python', 'FastAPI', 'PostgreSQL'] },
              { label: 'Tools', items: ['Git', 'Arch Linux', 'Docker', 'Vercel'] },
              { label: 'Design', items: ['Figma', 'Clean UI', 'Typography', 'Motion'] }
            ].map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {/* Category header with accent underline */}
                <div className="mb-10">
                  <h4 className="text-xs font-black text-accent uppercase tracking-widest opacity-70 inline-block pb-1 border-b border-accent/30">
                    {cat.label}
                  </h4>
                </div>
                <div className="flex flex-col gap-4">
                  {cat.items.map(item => (
                    <span
                      key={item}
                      className="text-2xl font-black text-white/40 hover:text-accent hover:translate-x-2 transition-all duration-300 cursor-default"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Real-Time Presence ────────────────────────────────────────── */}
        <section id="presence" className="py-24">
          <SectionLabel text="Real-time Presence" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* Spotify */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="status-card p-8 rounded-3xl relative overflow-hidden group min-h-[200px] flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 p-6 text-white/5 group-hover:text-accent/20 transition-colors pointer-events-none">
                <Music size={64} strokeWidth={1} />
              </div>
              <SpotifyLyricsCard lanyardSpotify={spotify} />
            </motion.div>

            {/* Activity */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="status-card p-8 rounded-3xl relative overflow-hidden group min-h-[200px]"
            >
              <div className="absolute top-0 right-0 p-6 text-white/5 group-hover:text-accent/20 transition-colors">
                <Gamepad2 size={64} strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-2 h-2 bg-accent rounded-full animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Currently Active</span>
                  <span className="text-[9px] font-bold text-white/15 uppercase tracking-wider">· Discord Rich Presence</span>
                </div>
                <div className="space-y-6">
                  {filteredActivities.length > 0 ? (
                    filteredActivities.map((activity, idx) => (
                      <ActivityInner key={idx} activity={activity} />
                    ))
                  ) : (
                    <div className="text-lg font-serif italic text-white/10 py-8 text-center">Just chilling...</div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Contact / Footer ─────────────────────────────────────────── */}
        <footer id="contact" className="py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl lg:text-[10rem] font-black text-white mb-16 tracking-tighter leading-none">
              LET'S <br /> <span className="text-accent underline decoration-white/5 underline-offset-[20px]">TALK</span>
            </h2>

            {/* Centered contact layout */}
            <div className="flex flex-col items-center gap-6">
              <Magnetic>
                <a href="mailto:nutchanon9911@gmail.com" className="group flex items-center gap-4 text-white/40 hover:text-white transition-colors">
                  <Mail size={22} />
                  <span className="font-black text-xl lg:text-3xl tracking-tight">nutchanon9911@gmail.com</span>
                </a>
              </Magnetic>

              <div className="w-16 h-px bg-white/10 my-2" />

              <Magnetic>
                <a
                  href="https://discord.com/users/908945543223463997"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-black px-14 py-6 font-black text-[12px] uppercase tracking-[0.3em] hover:bg-accent hover:text-white transition-all inline-block"
                >
                  Discord
                </a>
              </Magnetic>
            </div>
          </motion.div>

          {/* Footer bar */}
          <div className="mt-40 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 opacity-60">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">© 2026 NONX2 DESIGN SYSTEM</div>
            <div className="flex gap-12">
              {[
                { name: 'Github', url: 'https://github.com/nonx2360' },
                { name: 'Instagram', url: 'https://www.instagram.com/nonx2_real/' },
                { name: 'Spotify', url: 'https://open.spotify.com/user/31lpokq7ozh7u2xvxbzifsqvwyre' }
              ].map(social => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-accent transition-colors"
                >
                  {social.name}
                </a>
              ))}
            </div>
          </div>
        </footer>

        {/* ── Project Modal ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedProject && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-3xl flex flex-col md:flex-row shadow-[0_0_100px_rgba(255,48,0,0.1)] custom-scrollbar"
              >
                {/* Close */}
                <button
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-6 right-6 z-10 w-10 h-10 bg-black/50 hover:bg-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors backdrop-blur-md"
                >
                  <X size={20} />
                </button>

                {/* Image */}
                <div className="w-full md:w-1/2 h-64 md:h-auto relative bg-neutral-900 border-r border-white/5 flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-black/20 to-transparent z-10" />
                  <img
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-6 left-6 z-20">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-black/50 backdrop-blur-md px-3 py-1 rounded-full">
                      {selectedProject.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center">
                  <h3 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight line-clamp-2 leading-none">
                    {selectedProject.title}
                  </h3>
                  <p className="text-white/60 font-serif text-lg md:text-xl italic mb-8 leading-relaxed">
                    "{selectedProject.description}"
                  </p>
                  <div className="mb-12">
                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Tech Stack</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.tags.map(tag => (
                        <span key={tag} className="text-xs font-bold text-white/80 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Magnetic>
                    <a
                      href={selectedProject.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 font-black text-[12px] uppercase tracking-[0.2em] hover:bg-accent hover:text-white transition-all w-fit group"
                    >
                      <Code2 size={18} className="transition-transform group-hover:scale-110" />
                      View Repository
                    </a>
                  </Magnetic>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
};
