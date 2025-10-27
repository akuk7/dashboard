import React, { useState, useEffect, useRef } from 'react';
// Using Sparkles for a touch of inspiration

interface Quote {
    text: string;
    author: string;
}

const DISCIPLINE_QUOTES: Quote[] = [
    { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { text: "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.", author: "Steve Jobs" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "Work hard in silence, let your success be your noise.", author: "Frank Ocean" },
    { text: "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.", author: "Bruce Lee" },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
    { text: "Motivation is what gets you started. Discipline is what keeps you going.", author: "Jim Rohn" },
    { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
    { text: "The difference between ordinary and extraordinary is that little 'extra'.", author: "Jimmy Johnson" },
    { text: "Opportunity is missed by most people because it is dressed in overalls and looks like work.", author: "Thomas Edison" }
];

const HeroSection: React.FC = () => {
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
    const quoteRef = useRef<HTMLParagraphElement>(null); // Ref for the quote for potential animation

    useEffect(() => {
        const interval = setInterval(() => {
            // Add a class for fading out if you implement CSS transitions
            if (quoteRef.current) {
                quoteRef.current.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            }

            setTimeout(() => {
                setCurrentQuoteIndex((prevIndex) => 
                    (prevIndex + 1) % DISCIPLINE_QUOTES.length
                );
                // Remove class to fade in
                if (quoteRef.current) {
                    quoteRef.current.classList.remove('opacity-0');
                }
            }, 500); // Half a second delay for fade out

        }, 8000); // Change quote every 8 seconds

        return () => clearInterval(interval);
    }, []);

    const currentQuote = DISCIPLINE_QUOTES[currentQuoteIndex];

    return (
        <section 
            id="home" 
            className="relative w-full min-h-[calc(100vh-40px)] flex flex-col items-center justify-center bg-black text-white px-4 py-20 overflow-hidden border-b border-[#303030] mb-4"
            // Grid background pattern similar to Next.js image
            style={{
                backgroundImage: `
                    linear-gradient(to right, #303030 1px, transparent 1px),
                    linear-gradient(to bottom, #303030 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                backgroundAttachment: 'fixed' // Makes grid static while content scrolls
            }}
        >
            {/* Overlay to dim the grid slightly and add depth */}
            <div className="absolute inset-0 bg-black opacity-90 z-10"></div>
            
            <div className="relative z-20 text-center max-w-4xl mx-auto space-y-8">
                {/* Main Heading */}
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                    Your <span className="text-gray-400">Personal</span> <br/>Command Center
                </h1>

                {/* Animated Quotes */}
                <div className="min-h-[100px] flex flex-col justify-center items-center"> {/* Ensure consistent height for quote container */}
                    <p 
                        ref={quoteRef}
                        className="text-lg md:text-xl text-gray-400 italic mb-2 transition-opacity duration-700 ease-in-out"
                    >
                        "{currentQuote.text}"
                    </p>
                    <p className="text-sm md:text-md text-gray-500 font-medium">
                        — {currentQuote.author}
                    </p>
                </div>

                {/* Optional Call to Action or Introductory Text */}
                <p className="text-md md:text-lg text-gray-500 max-w-2xl mx-auto pt-4">
                    Track habits, manage tasks, set goals, and reflect on your progress. 
                    All in one place, designed to empower your daily discipline and drive success.
                </p>

                {/* Example Button (if you want one) */}
                {/* <button className="mt-8 px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors duration-300 flex items-center justify-center mx-auto gap-2 shadow-lg shadow-white/10">
                    <Sparkles className="w-5 h-5" />
                    Start Optimizing Your Day
                </button> */}
            </div>
        </section>
    );
};

export default HeroSection;