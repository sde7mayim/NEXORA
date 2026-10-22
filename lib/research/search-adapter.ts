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
   * Searches the web using configured search provider.
   */
  static async searchWeb(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    const apiKey = process.env.WEB_SEARCH_API_KEY;

    if (!apiKey || apiKey.startsWith("tvly-...")) {
      throw new Error(
        "Web Search provider is not configured. Set WEB_SEARCH_API_KEY in your environment to enable live web research."
      );
    }

    // Official Tavily API integration
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Web search provider error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawResults = (data.results || []) as Array<{
      title: string;
      url: string;
      content: string;
      score?: number;
    }>;

    // Filter results through SSRF guardrail
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

    return safeResults;
  }
}
