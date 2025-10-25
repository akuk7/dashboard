import React, { useState } from 'react';
import { Search } from 'lucide-react';

const SpotifyPlayer: React.FC = () => {
    // A default embedded playlist URL (replace with your preferred default or an empty string)
    const initialEmbedSrc = "https://open.spotify.com/embed/playlist/37i9dQZF1Ephc8wMmzflQI?utm_source=generator&theme=0"; 
    
    const [embedSrc, setEmbedSrc] = useState(initialEmbedSrc);
    const [inputUrl, setInputUrl] = useState('');

    // Function to convert a standard Spotify URL to an embeddable URI
    const getEmbedSrcFromUrl = (url: string): string | null => {
        try {
            const parsedUrl = new URL(url);
            const pathSegments = parsedUrl.pathname.split('/').filter(p => p);
            
            if (pathSegments.length >= 2) {
                const type = pathSegments[0]; // e.g., 'track', 'album', 'playlist'
                const id = pathSegments[1];
                
                // Construct the embed URL with theme=0 for dark mode
                return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
            }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e: unknown) {
            return null;
        }
        return null;
    };

    const handleUpdatePlayer = () => {
        const newSrc = getEmbedSrcFromUrl(inputUrl);
        if (newSrc) {
            setEmbedSrc(newSrc);
        }
    };

    return (
        // Monochromatic Card Container - using p-4 for tighter integration
        <div className="p-2 bg-[#121212] rounded-xl border border-[#303030] shadow-md text-white ">
            
            {/* SEARCH BAR (Sleek, rounded, with integrated buttons) */}
           <div className="relative flex items-center mb-3">
                <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="What do you want to play?"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    // Trigger the update when the user hits Enter
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdatePlayer()}
                    
                    // FIX: Added focus:outline-none and explicitly set ring/border to 0/default color on focus.
                    className="w-full bg-[#0A0A0A] border border-[#303030] rounded-full pl-8 pr-4 py-1 text-white text-xs placeholder-gray-500 transition-all duration-200  
                               focus:outline-none focus:ring-0 focus:border-[#303030]" 
                />
            </div>
            
            {/* The embedded Spotify iframe */}
            <div className="overflow-hidden rounded-lg">
                <iframe
                    title="Spotify Embed"
                    style={{ borderRadius: '8px' }}
                    src={embedSrc}
                    width="382"
                    height="152" // Standard height for Spotify embeds
                    frameBorder="0"
                    allowFullScreen={true}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                />
            </div>
        </div>
    );
};

export default SpotifyPlayer;