const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const CORS_PROXY = "https://api.allorigins.win/get?url=";

export const fetchLeetCodeDailyLink = async (): Promise<string | null> => {
    console.log("LeetCode: Fetching daily problem via GraphQL...");

    try {
        // LeetCode's GraphQL query for the daily challenge
        const query = `
            query questionOfToday {
                activeDailyCodingChallengeQuestion {
                    link
                }
            }
        `;

        // Since we are using AllOrigins (which only supports GET), 
        // we pass the GraphQL query as a URL parameter.
        const targetUrl = `${LEETCODE_GRAPHQL_URL}?query=${encodeURIComponent(query)}`;
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);

        if (!response.ok) {
            throw new Error(`Proxy error: ${response.status}`);
        }

        const data = await response.json();
        const apiResponse = JSON.parse(data.contents);


        if (apiResponse?.data?.activeDailyCodingChallengeQuestion?.link) {
            const relativeLink = apiResponse.data.activeDailyCodingChallengeQuestion.link;
            const fullLink = `https://leetcode.com${relativeLink}`;
            return fullLink;
        }

        return null;

    } catch (error) {
        console.error("LeetCode: GraphQL Fetch error:", error);
        return null;
    }
};
