import React from 'react';

const SpotifyPlayer: React.FC = () => {
    // Fixed default playlist - Spotify's compact embed (80px) is the shortest supported height,
    // to keep this card close to the day-counter cells' height.
    const embedSrc = "https://open.spotify.com/embed/playlist/37i9dQZF1Ephc8wMmzflQI?utm_source=generator&theme=0";

    return (
        // Monochromatic Card Container
        <div className="grow basis-2/5 min-w-0 flex flex-col items-center justify-center p-2 bg-[#121212] rounded-xl border border-[#303030] shadow-md text-white" id="music">
            <div className="w-full overflow-hidden rounded-lg">
                <iframe
                    title="Spotify Embed"
                    style={{ borderRadius: '8px' }}
                    src={embedSrc}
                    width="100%"
                    height="80"
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
