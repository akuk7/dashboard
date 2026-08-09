// WatchedGrid.tsx

import React, { useEffect, useRef, useState } from 'react';
import supabase from '../lib/supabase';
import type { WatchedMovie } from '../types/watchList';

interface Props {
    onClose: () => void;
}

const POSTER_ASPECT = 2 / 3; // width / height
const GAP_PX = 4;

// Picks the column count (rows follow as ceil(n / cols)) that maximizes
// poster size while keeping every item on screen with no scrolling.
function bestColumnCount(count: number, width: number, height: number): number {
    let bestCols = 1;
    let bestArea = 0;

    for (let cols = 1; cols <= count; cols++) {
        const rows = Math.ceil(count / cols);
        const availableWidth = width - (cols - 1) * GAP_PX;
        const availableHeight = height - (rows - 1) * GAP_PX;

        let cellWidth = availableWidth / cols;
        let cellHeight = cellWidth / POSTER_ASPECT;
        if (cellHeight * rows > availableHeight) {
            cellHeight = availableHeight / rows;
            cellWidth = cellHeight * POSTER_ASPECT;
        }

        const area = cellWidth * cellHeight;
        if (area > bestArea) {
            bestArea = area;
            bestCols = cols;
        }
    }

    return bestCols;
}

const WatchedGrid: React.FC<Props> = ({ onClose }) => {
    const [movies, setMovies] = useState<WatchedMovie[]>([]);
    const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
    const [columns, setColumns] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase
            .from('watched_movies')
            .select('*')
            .order('title')
            .then(({ data }) => setMovies((data as WatchedMovie[]) || []));
    }, []);

    const visibleMovies = movies.filter((movie) => movie.poster_url && !failedIds.has(movie.id));

    const handleFail = (id: string) => {
        setFailedIds((prev) => new Set(prev).add(id));
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container || visibleMovies.length === 0) return;

        const recompute = () => {
            const { width, height } = container.getBoundingClientRect();
            setColumns(bestColumnCount(visibleMovies.length, width, height));
        };

        recompute();
        window.addEventListener('resize', recompute);
        return () => window.removeEventListener('resize', recompute);
    }, [visibleMovies.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const rows = Math.ceil(visibleMovies.length / columns) || 1;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md overflow-hidden p-3">
            <div
                ref={containerRef}
                className="grid gap-1 w-full h-full"
                style={{
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                }}
            >
                {visibleMovies.map((movie) => (
                    <img
                        key={movie.id}
                        src={movie.poster_url!}
                        alt=""
                        title={movie.title}
                        onError={() => handleFail(movie.id)}
                        className="w-full h-full object-cover rounded-sm"
                    />
                ))}
            </div>
        </div>
    );
};

export default WatchedGrid;
