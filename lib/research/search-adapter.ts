import { QueryExpansionService } from "./query-expansion";
import {
  RawSearchCandidate,
  RankedSearchResult,
  SearchRankingEngine,
  SourceType,
} from "./ranking-engine";

export interface WebSearchResult {
  id?: string;
  title: string;
  url: string;
  domain?: string;
  snippet: string;
  publishedDate?: string;
  score?: number;
  sourceType?: SourceType;
  queryMatched?: string;
}

export interface ResearchSynthesisResult {
  query: string;
  sources: WebSearchResult[];
  synthesizedAnswer: string;
  citations: Array<{ index: number; title: string; url: string }>;
}

export interface BroadResearchResponse {
  query: string;
  queryType: string;
  subqueries: string[];
  totalResults: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  sources: WebSearchResult[];
  citations: Array<{ index: number; title: string; url: string; domain: string }>;
  provider: string;
}

export class WebResearchService {
  private static searchCache: Map<string, { timestamp: number; candidates: RawSearchCandidate[] }> = new Map();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
      const cleanHost = hostname.replace(/^\[|\]$/g, "");

      // Block loopbacks and internal names
      if (
        cleanHost === "localhost" ||
        cleanHost.endsWith(".localhost") ||
        cleanHost === "127.0.0.1" ||
        cleanHost === "::1" ||
        cleanHost === "0.0.0.0" ||
        cleanHost.endsWith(".local") ||
        cleanHost.endsWith(".internal") ||
        cleanHost.startsWith("fe80:") ||
        cleanHost.startsWith("fc00:") ||
        cleanHost.startsWith("fd00:")
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
   * Fetches real web search results via DuckDuckGo Web HTML interface.
   */
  static async fetchDuckDuckGoHtml(query: string, limit = 15): Promise<RawSearchCandidate[]> {
    const cacheKey = `ddg_${query.toLowerCase().trim()}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.candidates;
    }

    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const html = await res.text();

      const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const snippetRegex = /<(?:a|div)[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/gi;

      const links: Array<{ title: string; url: string }> = [];
      let m: RegExpExecArray | null;

      while ((m = linkRegex.exec(html)) !== null) {
        const rawHref = m[1];
        const rawTitle = m[2]
          .replace(/<[^>]+>/g, "")
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim();

        let actualUrl = rawHref;
        if (rawHref.includes("uddg=")) {
          const match = rawHref.match(/uddg=([^&]+)/);
          if (match) {
            actualUrl = decodeURIComponent(match[1]);
          }
        }

        if (this.isUrlSafe(actualUrl)) {
          links.push({ title: rawTitle, url: actualUrl });
        }
      }

      const snippets: string[] = [];
      while ((m = snippetRegex.exec(html)) !== null) {
        const rawSnippet = m[1]
          .replace(/<[^>]+>/g, "")
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim();
        snippets.push(rawSnippet);
      }

      const candidates: RawSearchCandidate[] = [];
      for (let i = 0; i < links.length && i < limit; i++) {
        candidates.push({
          title: links[i].title,
          url: links[i].url,
          snippet: snippets[i] || "",
          sourceQuery: query,
          provider: "duckduckgo_web",
        });
      }

      if (candidates.length === 0) {
        return await this.fetchDuckDuckGoLite(query, limit);
      }

      if (candidates.length > 0) {
        this.searchCache.set(cacheKey, { timestamp: Date.now(), candidates });
      }

      return candidates;
    } catch (err) {
      console.warn("[WebResearch] DuckDuckGo HTML search error, trying Lite:", (err as Error).message);
      return await this.fetchDuckDuckGoLite(query, limit);
    }
  }

  /**
   * Fetches real web search results via DuckDuckGo Lite interface (POST endpoint, direct clean URLs).
   */
  static async fetchDuckDuckGoLite(query: string, limit = 15): Promise<RawSearchCandidate[]> {
    const cacheKey = `lite_${query.toLowerCase().trim()}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.candidates;
    }

    try {
      const res = await fetch("https://lite.duckduckgo.com/lite/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: `q=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const html = await res.text();

      const aRegex = /<a[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
      const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

      const links: Array<{ title: string; url: string }> = [];
      let m: RegExpExecArray | null;

      while ((m = aRegex.exec(html)) !== null) {
        let rawHref = m[1];
        const rawTitle = m[2]
          .replace(/<[^>]+>/g, "")
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim();

        if (rawHref.includes("uddg=")) {
          const match = rawHref.match(/uddg=([^&]+)/);
          if (match) rawHref = decodeURIComponent(match[1]);
        }

        if (this.isUrlSafe(rawHref) && !rawHref.includes("duckduckgo.com") && rawTitle.length > 3) {
          links.push({ title: rawTitle, url: rawHref });
        }
      }

      const snippets: string[] = [];
      while ((m = snippetRegex.exec(html)) !== null) {
        const rawSnippet = m[1]
          .replace(/<[^>]+>/g, "")
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim();
        snippets.push(rawSnippet);
      }

      const candidates: RawSearchCandidate[] = [];
      for (let i = 0; i < links.length && i < limit; i++) {
        candidates.push({
          title: links[i].title,
          url: links[i].url,
          snippet: snippets[i] || "",
          sourceQuery: query,
          provider: "duckduckgo_lite",
        });
      }

      if (candidates.length > 0) {
        this.searchCache.set(cacheKey, { timestamp: Date.now(), candidates });
      }

      return candidates;
    } catch (err) {
      console.warn("[WebResearch] DuckDuckGo Lite search error:", (err as Error).message);
      return [];
    }
  }

  /**
   * Fetches authoritative encyclopedic articles from Wikipedia Search API.
   */
  static async fetchWikipedia(query: string, limit = 5): Promise<RawSearchCandidate[]> {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&utf8=&format=json&origin=*`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Nexora/0.4.0 (AI Research Engine; hello@nexora.ai)" },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const hits = (data.query?.search || []) as Array<{
        title: string;
        snippet: string;
        pageid: number;
        timestamp: string;
      }>;

      const candidates: RawSearchCandidate[] = [];
      for (const hit of hits.slice(0, limit)) {
        const cleanSnippet = hit.snippet.replace(/<[^>]+>/g, "").trim();
        const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/\s+/g, "_"))}`;
        if (this.isUrlSafe(articleUrl) && cleanSnippet.length > 25) {
          candidates.push({
            title: `${hit.title} - Wikipedia`,
            url: articleUrl,
            snippet: cleanSnippet,
            publishedDate: hit.timestamp ? hit.timestamp.split("T")[0] : undefined,
            sourceQuery: query,
            provider: "wikipedia_api",
          });
        }
      }
      return candidates;
    } catch {
      return [];
    }
  }

  /**
   * Fetches search results from Tavily API if configured.
   */
  static async fetchTavily(query: string, maxResults = 10): Promise<RawSearchCandidate[]> {
    const apiKey = process.env.WEB_SEARCH_API_KEY;
    if (!apiKey || apiKey.startsWith("tvly-...")) return [];

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: maxResults,
          search_depth: "basic",
          include_answer: false,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) return [];
      const data = await response.json();
      const rawResults = (data.results || []) as Array<{
        title: string;
        url: string;
        content: string;
        score?: number;
      }>;

      const safeResults: RawSearchCandidate[] = [];
      for (const res of rawResults) {
        if (this.isUrlSafe(res.url)) {
          safeResults.push({
            title: res.title,
            url: res.url,
            snippet: res.content,
            sourceQuery: query,
            provider: "tavily",
            rawScore: res.score,
          });
        }
      }
      return safeResults;
    } catch (err) {
      console.warn("[WebResearch] Tavily search error:", (err as Error).message);
      return [];
    }
  }

  /**
   * Fallback to DuckDuckGo Instant Answer API for quick encyclopedic facts.
   */
  static async fetchDuckDuckGoInstantAnswer(query: string): Promise<RawSearchCandidate[]> {
    const cacheKey = `instant_${query.toLowerCase().trim()}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.candidates;
    }

    try {
      const ddgRes = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (!ddgRes.ok) return [];
      const ddgData = await ddgRes.json();
      const candidates: RawSearchCandidate[] = [];

      if (ddgData.AbstractText && ddgData.AbstractURL && this.isUrlSafe(ddgData.AbstractURL)) {
        candidates.push({
          title: ddgData.Heading || query,
          url: ddgData.AbstractURL,
          snippet: ddgData.AbstractText,
          sourceQuery: query,
          provider: "duckduckgo_instant",
        });
      }

      if (Array.isArray(ddgData.RelatedTopics)) {
        for (const topic of ddgData.RelatedTopics.slice(0, 5)) {
          if (topic.Text && topic.FirstURL && this.isUrlSafe(topic.FirstURL)) {
            candidates.push({
              title: topic.Text.split(" - ")[0] || topic.Text.substring(0, 60),
              url: topic.FirstURL,
              snippet: topic.Text,
              sourceQuery: query,
              provider: "duckduckgo_instant",
            });
          }
        }
      }
      if (candidates.length > 0) {
        this.searchCache.set(cacheKey, { timestamp: Date.now(), candidates });
      }

      return candidates;
    } catch {
      return [];
    }
  }

  /**
   * Live Weather Provider using wttr.in
   */
  static async fetchLiveWeather(city: string): Promise<RawSearchCandidate[]> {
    try {
      const weatherRes = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
        headers: { "User-Agent": "Nexora/0.4.0 (AI Research Engine)" },
        signal: AbortSignal.timeout(4000),
      });

      if (!weatherRes.ok) return [];
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
            provider: "wttr.in",
            rawScore: 1.0,
          },
        ];
      }
    } catch (err) {
      console.warn("[WebResearch] Weather fetch fallback error:", err);
    }
    return [];
  }

  /**
   * Main multi-query research method that retrieves candidates across expanded subtopics,
   * performs deduplication, relevance scoring, and diversity filtering.
   */
  static async executeBroadResearch(params: {
    query: string;
    page?: number;
    pageSize?: number;
    sortBy?: "relevance" | "date";
    maxCandidates?: number;
  }): Promise<BroadResearchResponse> {
    const { query, page = 1, pageSize = 10, sortBy = "relevance", maxCandidates = 45 } = params;
    const trimmed = query.trim();

    // 1. Weather Check
    const weatherMatch =
      trimmed.match(/(?:weather|temperature|forecast|climate|rain)\s+(?:in|for|of|at)?\s*([a-zA-Z\s]+)/i) ||
      trimmed.match(/([a-zA-Z\s]+)\s+(?:weather|temperature|forecast|climate)/i);

    if (weatherMatch && weatherMatch[1]) {
      const city = weatherMatch[1].trim().replace(/[?.!]+$/, "");
      if (city.length >= 2 && !/^(today|now|tomorrow|current|the)$/i.test(city)) {
        const weatherResults = await this.fetchLiveWeather(city);
        if (weatherResults.length > 0) {
          const ranked = weatherResults.map((r, i) => ({
            id: `weather_${i}`,
            title: r.title,
            url: r.url,
            domain: "wttr.in",
            snippet: r.snippet,
            score: 1.0,
            publishedDate: new Date().toISOString().split("T")[0],
            sourceType: "general_web" as SourceType,
          }));

          return {
            query: trimmed,
            queryType: "live_weather",
            subqueries: [trimmed],
            totalResults: 1,
            page: 1,
            pageSize,
            hasMore: false,
            sources: ranked,
            citations: [{ index: 1, title: ranked[0].title, url: ranked[0].url, domain: "wttr.in" }],
            provider: "wttr.in",
          };
        }
      }
    }

    // 2. Query Analysis & Expansion
    const analysis = QueryExpansionService.analyzeQuery(trimmed);
    const subqueries = analysis.subqueries;

    // 3. Parallel Candidate Gathering across queries and providers
    const candidatePromises: Promise<RawSearchCandidate[]>[] = [];

    // For each subquery, fetch from primary providers
    for (const sq of subqueries) {
      // Tavily (if configured)
      candidatePromises.push(this.fetchTavily(sq, 8));
      // DuckDuckGo Web
      candidatePromises.push(this.fetchDuckDuckGoHtml(sq, 12));
    }

    // Also include Wikipedia & DuckDuckGo Instant Answer for primary query
    candidatePromises.push(this.fetchWikipedia(trimmed, 6));
    candidatePromises.push(this.fetchDuckDuckGoInstantAnswer(trimmed));

    const settled = await Promise.allSettled(candidatePromises);
    const allCandidates: RawSearchCandidate[] = [];

    for (const res of settled) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        allCandidates.push(...res.value);
      }
    }

    // 4. Ranking, Deduplication, and Diversity Pass
    let ranked = SearchRankingEngine.rankAndDiversify(allCandidates, trimmed, {
      maxDomainFrequencyInTop: 2,
      isTimeSensitive: analysis.isTimeSensitive,
    });

    // 5. Apply Sorting
    if (sortBy === "date") {
      ranked.sort((a, b) => {
        const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        return dateB - dateA;
      });
    }

    // 6. Pagination Slice
    const totalResults = ranked.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedSources = ranked.slice(startIndex, endIndex);
    const hasMore = endIndex < totalResults;

    const sources: WebSearchResult[] = pagedSources.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      domain: r.domain,
      snippet: r.snippet,
      publishedDate: r.publishedDate,
      score: r.relevanceScore,
      sourceType: r.sourceType,
      queryMatched: r.queryMatched,
    }));

    const citations = sources.map((s, idx) => ({
      index: startIndex + idx + 1,
      title: s.title,
      url: s.url,
      domain: s.domain || "web",
    }));

    return {
      query: trimmed,
      queryType: analysis.queryType,
      subqueries,
      totalResults,
      page,
      pageSize,
      hasMore,
      sources,
      citations,
      provider: allCandidates.some((c) => c.provider === "tavily") ? "tavily+duckduckgo" : "duckduckgo_web",
    };
  }

  /**
   * Standard searchWeb interface for backward compatibility with AI chat and knowledge service.
   * Returns top N high-quality results.
   */
  static async searchWeb(query: string, maxResults = 10): Promise<WebSearchResult[]> {
    const research = await this.executeBroadResearch({
      query,
      page: 1,
      pageSize: maxResults,
      sortBy: "relevance",
    });
    return research.sources;
  }
}
