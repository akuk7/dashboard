const INITIAL_URL = "https://www.indiags.com/epaper-pdf-download";
const NEW_BASE_URL = "https://www.indiags.com/newspaper/";

// We use a CORS proxy to bypass browser restrictions
const CORS_PROXY = "https://api.allorigins.win/get?url=";

export const fetchTheHinduLink = async (): Promise<string | null> => {
    try {
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(INITIAL_URL)}`);
        const data = await response.json();
        const html = data.contents;

        // Create a temporary DOM element to parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find all pdf-item divs
        const pdfItems = doc.querySelectorAll('.pdf-item');

        let targetHref = null;

        for (const item of Array.from(pdfItems)) {
            const text = item.textContent || "";
            // Check if it contains "The Hindu" but NOT "School"
            if (text.includes("The Hindu") && !(text.includes("School") || text.includes("UPSC"))) {
                const link = item.querySelector('a.btn-read');
                if (link) {
                    targetHref = link.getAttribute('href');
                    break;
                }
            }
        }

        if (!targetHref) return null;

        // Parse the href to get the 'file' parameter
        const url = new URL(targetHref, "https://www.indiags.com");
        const filePath = url.searchParams.get('file');

        if (!filePath) return null;

        // Decode and construct the new direct link
        const directLink = NEW_BASE_URL + filePath.split(' ').join('%20');

        return directLink;
    } catch (error) {
        console.error("Error fetching newspaper link:", error);
        return null;
    }
};
