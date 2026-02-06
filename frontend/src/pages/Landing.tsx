import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import BentoGrid from '../components/BentoGrid';

export default function Landing() {
    return (
        <div className="min-h-screen bg-[#0f1014] text-white selection:bg-blue-500/30">
            <Navbar />
            <Hero />
            <Stats />
            <BentoGrid />

            {/* Simple Footer */}
            <footer className="py-8 bg-black/20 border-t border-white/5 text-center text-gray-500 text-sm">
                <p>&copy; 2024 UzTraffic. Toshkent Shahar Raqamli Rivojlanish Departamenti.</p>
            </footer>
        </div>
    );
}
