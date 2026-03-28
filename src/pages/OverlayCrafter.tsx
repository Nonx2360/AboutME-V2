import { useState } from 'react';
import { Copy, Check, ExternalLink, Settings, Music, Gamepad2 } from 'lucide-react';
import { DISCORD_ID } from '../App';
import { Link } from 'react-router-dom';

export const OverlayCrafter = () => {
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState({
    theme: 'sketch',
    showSpotify: true,
    showActivity: true,
    transparent: true,
  });

  const baseUrl = window.location.origin + '/overlay';
  const overlayUrl = `${baseUrl}?id=${DISCORD_ID}&theme=${options.theme}&spotify=${options.showSpotify}&activity=${options.showActivity}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto py-16 px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-500 rounded-3xl shadow-2xl flex items-center justify-center shadow-indigo-500/20">
             <Settings className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter">Overlay Crafter</h1>
            <p className="text-gray-500 font-medium mt-1">Design your perfect stream companion.</p>
          </div>
        </div>
        <Link to="/" className="text-sm font-bold text-gray-400 hover:text-white transition-colors">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Configuration */}
        <div className="lg:col-span-5 space-y-8">
          <div className="sketch-card">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 mb-8 border-b border-white/5 pb-4">Configuration</h2>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Discord ID</label>
                <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 font-mono text-sm text-indigo-400 flex items-center justify-between">
                  {DISCORD_ID}
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <label className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${options.showSpotify ? 'bg-green-500/5 border-green-500/20' : 'bg-white/2 border-white/5 opacity-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${options.showSpotify ? 'bg-green-500 text-white' : 'bg-gray-800'}`}>
                      <Music size={18} />
                    </div>
                    <span className="font-bold text-gray-200">Spotify Tracker</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={options.showSpotify} 
                    onChange={(e) => setOptions({...options, showSpotify: e.target.checked})}
                    className="w-5 h-5 accent-green-500"
                  />
                </label>

                <label className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${options.showActivity ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/2 border-white/5 opacity-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${options.showActivity ? 'bg-indigo-500 text-white' : 'bg-gray-800'}`}>
                      <Gamepad2 size={18} />
                    </div>
                    <span className="font-bold text-gray-200">Activity Status</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={options.showActivity} 
                    onChange={(e) => setOptions({...options, showActivity: e.target.checked})}
                    className="w-5 h-5 accent-indigo-500"
                  />
                </label>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4">OBS Browser Source URL</h3>
              <div className="group relative">
                <input 
                  readOnly 
                  value={overlayUrl} 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono text-gray-400 focus:outline-none focus:border-indigo-500/50 transition-all pr-14"
                />
                <button 
                  onClick={copyToClipboard}
                  className="absolute right-2 top-2 bottom-2 px-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center min-w-[44px]"
                >
                  {copied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={3} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-6 leading-relaxed bg-white/2 p-4 rounded-xl border border-white/5">
                💡 <b>Pro Tip:</b> In OBS, set the dimensions to <b>400x600</b> and ensure 'Shutdown source when not visible' is checked for optimal performance.
              </p>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Live Preview
          </h2>
          <div className="relative border border-white/5 rounded-[40px] p-8 min-h-[600px] flex items-start justify-center overflow-hidden bg-[#0a0a0a] shadow-2xl">
             <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
             <iframe 
                src={overlayUrl} 
                className="relative z-10 w-full h-full border-none pointer-events-none scale-110 origin-top"
                style={{ width: '400px', height: '600px' }}
             />
             <div className="absolute top-6 right-8 z-20 text-[10px] font-black tracking-widest text-gray-500 bg-black/80 border border-white/5 px-3 py-1.5 rounded-full backdrop-blur-md">
               OBS ENVIRONMENT
             </div>
          </div>
          <div className="flex items-center justify-between px-4">
            <a 
              href={overlayUrl} 
              target="_blank" 
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors"
            >
              Open direct link <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
