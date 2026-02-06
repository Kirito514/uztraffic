import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hero() {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0f1014] selection:bg-blue-500/30">
            {/* Premium Aurora Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[128px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[128px] animate-pulse delay-1000" />
            <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-indigo-500/10 rounded-full blur-[96px]" />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                >
                    {/* Status Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md shadow-2xl shadow-blue-500/10 cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-medium text-gray-300">Toshkent shahrida jonli monitoring</span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 tracking-tight leading-[1.1]">
                        Aqlli Shahar <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient-x">
                            Kelajak Trafiki
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
                        Sun'iy intellekt va katta ma'lumotlar yordamida shahar harakatini
                        <span className="text-white font-medium"> 35% ga tezlashtiring</span>.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="group relative px-8 py-4 bg-white text-black rounded-2xl font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] flex items-center gap-3 overflow-hidden"
                        >
                            <span className="relative z-10">Boshqaruv Paneli</span>
                            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-medium text-lg transition-all border border-white/10 flex items-center gap-3 backdrop-blur-sm hover:border-white/20">
                            <Play className="w-5 h-5 fill-current" />
                            Demo Video
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f1014] to-transparent pointer-events-none" />
        </div>
    );
}
