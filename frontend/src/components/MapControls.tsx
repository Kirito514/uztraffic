import { useState } from 'react';
import { Layers, Maximize, Minimize, Search, Globe, Moon, Sun, Plus, Minus } from 'lucide-react';

interface MapControlsProps {
    isExpanded: boolean;
    onToggleExpand: () => void;
    onStyleChange: (style: 'dark' | 'light' | 'satellite') => void;
    onSearch: (query: string) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    currentStyle: string;
}

export default function MapControls({
    isExpanded,
    onToggleExpand,
    onStyleChange,
    onSearch,
    onZoomIn,
    onZoomOut,
    currentStyle
}: MapControlsProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showStyleMenu, setShowStyleMenu] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearch(searchQuery);
        }
    };

    return (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
            {/* Search Bar */}
            <form
                onSubmit={handleSubmit}
                className="flex items-center bg-[#1a1b23]/90 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-2xl overflow-hidden min-w-[300px]"
            >
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Manzilni qidiring (masalan: Chilonzor)..."
                    className="flex-1 bg-transparent border-none text-white text-sm px-4 focus:ring-0 placeholder:text-gray-500"
                />
                <button
                    type="submit"
                    className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors text-white"
                >
                    <Search size={18} />
                </button>
            </form>

            <div className="flex justify-end gap-3 px-1">
                {/* Style Switcher */}
                <div className="relative">
                    <button
                        onClick={() => setShowStyleMenu(!showStyleMenu)}
                        className="p-3 bg-[#1a1b23]/90 backdrop-blur-md border border-white/10 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-all shadow-xl"
                        title="Xarita ko'rinishi"
                    >
                        <Layers size={20} />
                    </button>

                    {showStyleMenu && (
                        <div className="absolute top-full right-0 mt-2 bg-[#1a1b23] border border-white/10 rounded-2xl p-2 shadow-2xl min-w-[150px] animate-in fade-in slide-in-from-top-1">
                            <button
                                onClick={() => { onStyleChange('dark'); setShowStyleMenu(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${currentStyle === 'dark' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <Moon size={16} /> To'q rejim
                            </button>
                            <button
                                onClick={() => { onStyleChange('light'); setShowStyleMenu(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${currentStyle === 'light' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <Sun size={16} /> Yorqin rejim
                            </button>
                            <button
                                onClick={() => { onStyleChange('satellite'); setShowStyleMenu(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${currentStyle === 'satellite' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <Globe size={16} /> Sun'iy yo'ldosh
                            </button>
                        </div>
                    )}
                </div>

                {/* Expand Toggle */}
                <button
                    onClick={onToggleExpand}
                    className="p-3 bg-[#1a1b23]/90 backdrop-blur-md border border-white/10 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-all shadow-xl"
                    title={isExpanded ? "Kichraytirish" : "Kattalashtirish"}
                >
                    {isExpanded ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>

                {/* Zoom Controls */}
                <div className="flex flex-col bg-[#1a1b23]/90 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    <button
                        onClick={onZoomIn}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-all border-b border-white/10"
                        title="Yaqinlashtirish"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        onClick={onZoomOut}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Uzoqlashtirish"
                    >
                        <Minus size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
