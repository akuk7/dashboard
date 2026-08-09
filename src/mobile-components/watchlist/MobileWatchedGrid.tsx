import { useEffect, useRef, useState } from 'react'
import supabase from '../../lib/supabase'
import type { WatchedMovie } from '../../types/watchList'

interface Props {
  onClose: () => void
}

const DOUBLE_TAP_MS = 300

const MobileWatchedGrid: React.FC<Props> = ({ onClose }) => {
  const [movies, setMovies] = useState<WatchedMovie[]>([])
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const lastTapRef = useRef(0)

  useEffect(() => {
    supabase
      .from('watched_movies')
      .select('*')
      .order('title')
      .then(({ data }) => setMovies((data as WatchedMovie[]) || []))
  }, [])

  const visibleMovies = movies.filter((movie) => movie.poster_url && !failedIds.has(movie.id))

  const handleFail = (id: string) => {
    setFailedIds((prev) => new Set(prev).add(id))
  }

  const handleTap = () => {
    const now = Date.now()
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      onClose()
    }
    lastTapRef.current = now
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md overflow-y-auto" onClick={handleTap}>
      <div className="grid gap-0.5 p-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(30px, 1fr))' }}>
        {visibleMovies.map((movie) => (
          <img
            key={movie.id}
            src={movie.poster_url!}
            alt=""
            title={movie.title}
            onError={() => handleFail(movie.id)}
            className="w-full aspect-2/3 object-cover rounded-sm"
          />
        ))}
      </div>
    </div>
  )
}

export default MobileWatchedGrid
