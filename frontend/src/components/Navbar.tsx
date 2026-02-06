import { Link } from 'react-router-dom';
import { Siren, LayoutDashboard, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-4' : 'py-6'}`}>
            <div className={`max-w-7xl mx-auto px-6 transition-all duration-300`}>
                <div className={`
                    flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300
                    ${scrolled
                        ? 'bg-[#0f1014]/80 border border-white/10 shadow-2xl backdrop-blur-xl'
                        : 'bg-transparent border border-transparent'}
                `}>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
                            <Siren className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-wide">
                            UzTraffic
                        </span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <a href="#" className="hover:text-white transition-colors">Imkoniyatlar</a>
                        <a href="#" className="hover:text-white transition-colors">Statistika</a>
                        <a href="#" className="hover:text-white transition-colors">Haqida</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            to="/dashboard"
                            className="hidden md:flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-100 rounded-xl transition-all font-semibold text-sm"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Dashboard</span>
                        </Link>

                        <button className="md:hidden p-2 text-white bg-white/5 rounded-lg">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
