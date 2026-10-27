export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  score?: number;
}

export interface ResearchSynthesisResult {
  query: string;
  sources: WebSearchResult[];
  synthesizedAnswer: string;
  citations: Array<{ index: number; title: string; url: string }>;
}

export class WebResearchService {
  /**
   * SSRF Guardrail: checks if a URL targets prohibited private or internal networks.
   */
  static isUrlSafe(targetUrl: string): boolean {
    try {
      const parsed = new URL(targetUrl);

      // Only allow http and https
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();

      // Block loopbacks and internal names
      if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname === "0.0.0.0" ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
      ) {
        return false;
      }

      // Block IPv4 private ranges (RFC 1918 & Cloud Metadata)
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const match = hostname.match(ipv4Regex);
      if (match) {
        const octets = match.slice(1).map(Number);
        const [o1, o2] = octets;

        // 10.0.0.0/8
        if (o1 === 10) return false;
        // 172.16.0.0/12
        if (o1 === 172 && o2 >= 16 && o2 <= 31) return false;
        // 192.168.0.0/16
        if (o1 === 192 && o2 === 168) return false;
        // 169.254.0.0/16 (Link local / AWS/GCP metadata)
        if (o1 === 169 && o2 === 254) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Searches the web using configured search provider, with instant live weather & open fallback.
   */
  static async searchWeb(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    const trimmedQuery = query.trim();

    // 1. Live Weather Detection (e.g. "weather in Coimbatore", "temperature in Chennai", etc.)
    const weatherMatch =
      trimmedQuery.match(/(?:weather|temperature|forecast|climate|rain)\s+(?:in|for|of|at)?\s*([a-zA-Z\s]+)/i) ||
      trimmedQuery.match(/([a-zA-Z\s]+)\s+(?:weather|temperature|forecast|climate)/i);

    if (weatherMatch && weatherMatch[1]) {
      const city = weatherMatch[1].trim().replace(/[?.!]+$/, "");
      if (city.length >= 2 && !/^(today|now|tomorrow|current|the)$/i.test(city)) {
        try {
          const weatherRes = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
            headers: { "User-Agent": "Nexora/0.4.0 (AI Research Engine)" },
            signal: AbortSignal.timeout(5000),
          });

          if (weatherRes.ok) {
            const data = await weatherRes.json();
            const current = data.current_condition?.[0];
            const area = data.nearest_area?.[0];
            const locationName = area?.areaName?.[0]?.value || city;
            const regionName = area?.region?.[0]?.value || "";
            const countryName = area?.country?.[0]?.value || "";

            if (current) {
              const snippet = `Live Real-time Weather for ${locationName}${regionName ? `, ${regionName}` : ""}${countryName ? `, ${countryName}` : ""}:
• Current Condition: ${current.weatherDesc?.[0]?.value?.trim() || "Clear"}
• Temperature: ${current.temp_C}°C (${current.temp_F}°F)
• Feels Like: ${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)
• Humidity: ${current.humidity}%
• Wind: ${current.windspeedKmph} km/h from ${current.winddir16Point}
• Cloud Cover: ${current.cloudcover}%
• Precipitation: ${current.precipMM} mm
• Pressure: ${current.pressure} hPa
• Visibility: ${current.visibility} km
• UV Index: ${current.uvIndex}`;

              return [
                {
                  title: `Live Weather for ${locationName} (${current.temp_C}°C, ${current.weatherDesc?.[0]?.value?.trim() || "Clear"})`,
                  url: `https://wttr.in/${encodeURIComponent(city)}`,
                  snippet,
                  score: 1.0,
                },
              ];
            }
          }
        } catch (wErr) {
          console.warn("[WebResearch] Weather fetch fallback:", wErr);
        }
      }
    }

    // 2. Official Tavily API integration if key configured
    const apiKey = process.env.WEB_SEARCH_API_KEY;
    if (apiKey && !apiKey.startsWith("tvly-...")) {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query: trimmedQuery,
            max_results: maxResults,
            search_depth: "basic",
            include_answer: false,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawResults = (data.results || []) as Array<{
            title: string;
            url: string;
            content: string;
            score?: number;
          }>;

          const safeResults: WebSearchResult[] = [];
          for (const res of rawResults) {
            if (this.isUrlSafe(res.url)) {
              safeResults.push({
                title: res.title,
                url: res.url,
                snippet: res.content,
                score: res.score,
              });
            }
          }
          if (safeResults.length > 0) return safeResults;
        }
      } catch (tavilyErr) {
        console.warn("[WebResearch] Tavily search error:", tavilyErr);
      }
    }

    // 3. DuckDuckGo Instant Answer Open Fallback
    try {
      const ddgRes = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmedQuery)}&format=json&no_html=1&skip_disambig=1`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (ddgRes.ok) {
        const ddgData = await ddgRes.json();
        const results: WebSearchResult[] = [];
        if (ddgData.AbstractText) {
          results.push({
            title: ddgData.Heading || trimmedQuery,
            url: ddgData.AbstractURL || "https://duckduckgo.com",
            snippet: ddgData.AbstractText,
            score: 0.9,
          });
        }
        if (Array.isArray(ddgData.RelatedTopics)) {
          for (const topic of ddgData.RelatedTopics.slice(0, 3)) {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(" - ")[0] || topic.Text.substring(0, 50),
                url: topic.FirstURL,
                snippet: topic.Text,
                score: 0.8,
              });
            }
          }
        }
        if (results.length > 0) return results;
      }
    } catch {}

    return [];
  }
}
