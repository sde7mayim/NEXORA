export interface RawSearchCandidate {
  title: string;
  url: string;
  snippet: string;
  sourceQuery?: string;
  provider?: string;
  publishedDate?: string;
  rawScore?: number;
}

export type SourceType =
  | "official_docs"
  | "educational"
  | "technical_publication"
  | "research_paper"
  | "community_discussion"
  | "general_web";

export interface RankedSearchResult {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  relevanceScore: number; // 0.0 to 1.0
  publishedDate?: string;
  sourceType: SourceType;
  queryMatched: string;
}

export class SearchRankingEngine {
  // Authoritative tech domains
  private static readonly OFFICIAL_DOC_DOMAINS = [
    "react.dev",
    "reactjs.org",
    "python.org",
    "docs.python.org",
    "developer.mozilla.org",
    "nodejs.org",
    "nextjs.org",
    "typescriptlang.org",
    "kubernetes.io",
    "docker.com",
    "docs.docker.com",
    "aws.amazon.com",
    "cloud.google.com",
    "learn.microsoft.com",
    "github.com",
    "go.dev",
    "rust-lang.org",
  ];

  private static readonly REPUTABLE_EDU_AND_TECH_DOMAINS = [
    "geeksforgeeks.org",
    "tutorialspoint.com",
    "coursera.org",
    "edx.org",
    "mit.edu",
    "stanford.edu",
    "harvard.edu",
    "cmu.edu",
    "berkeley.edu",
    "wikipedia.org",
    "techtarget.com",
    "martinfowler.com",
    "ieee.org",
    "acm.org",
    "freecodecamp.org",
    "stackoverflow.com",
    "arxiv.org",
  ];

  /**
   * Cleans and normalizes URLs by stripping tracking parameters, hash fragments, and trailing slashes.
   */
  static normalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);

      // Strip common tracking and analytics parameters
      const trackingParams = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "fbclid",
        "gclid",
        "gbraid",
        "wbraid",
        "msclkid",
        "ref",
        "ref_src",
        "source",
        "session_id",
        "_ga",
        "_gl",
      ];

      for (const param of trackingParams) {
        parsed.searchParams.delete(param);
      }

      // Remove hash fragment
      parsed.hash = "";

      // Normalize pathname: remove trailing slash unless it's root
      let pathname = parsed.pathname;
      if (pathname.length > 1 && pathname.endsWith("/")) {
        pathname = pathname.slice(0, -1);
      }
      parsed.pathname = pathname;

      return parsed.toString();
    } catch {
      return rawUrl.trim();
    }
  }

  /**
   * Deduplicates candidates by normalized URL while preserving the most informative snippet.
   */
  static deduplicateCandidates(candidates: RawSearchCandidate[]): RawSearchCandidate[] {
    const seen = new Map<string, RawSearchCandidate>();

    for (const c of candidates) {
      if (!c.url || !c.title) continue;
      const cleanUrl = this.normalizeUrl(c.url);

      if (seen.has(cleanUrl)) {
        const existing = seen.get(cleanUrl)!;
        // Keep the candidate with longer/better snippet
        if ((c.snippet?.length || 0) > (existing.snippet?.length || 0)) {
          seen.set(cleanUrl, { ...c, url: cleanUrl });
        }
      } else {
        seen.set(cleanUrl, { ...c, url: cleanUrl });
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Detects the source category based on domain and URL patterns.
   */
  static categorizeSource(url: string): SourceType {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      if (this.OFFICIAL_DOC_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
        return "official_docs";
      }
      if (host.endsWith(".edu") || host.endsWith(".ac.uk")) {
        return "educational";
      }
      if (host.includes("arxiv.org") || host.includes("ieee.org") || host.includes("acm.org") || host.includes("doi.org")) {
        return "research_paper";
      }
      if (this.REPUTABLE_EDU_AND_TECH_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
        return "technical_publication";
      }
      if (host.includes("stackoverflow.com") || host.includes("reddit.com") || host.includes("discourse.")) {
        return "community_discussion";
      }
    } catch {}
    return "general_web";
  }

  /**
   * Extracts publication date or year if available in snippet or URL.
   */
  static extractDate(candidate: RawSearchCandidate): string | undefined {
    if (candidate.publishedDate) return candidate.publishedDate;

    // Check for explicit ISO date: 2024-05-12
    const isoMatch = candidate.snippet.match(/\b(202[0-9]-[01][0-9]-[0-3][0-9])\b/);
    if (isoMatch) return isoMatch[1];

    // Check for Month Day, Year: Oct 28, 2026 or October 2026
    const dateTextMatch = candidate.snippet.match(
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2},?\s+)?(202[0-9])\b/i
    );
    if (dateTextMatch) return dateTextMatch[0];

    // Check URL for year/month
    const urlYearMatch = candidate.url.match(/\/(202[0-9])\/([01][0-9])\//);
    if (urlYearMatch) return `${urlYearMatch[1]}-${urlYearMatch[2]}`;

    return undefined;
  }

  /**
   * Evaluates relevance score (0.0 - 1.0) based on title, content depth, authority, and freshness.
   */
  static scoreCandidate(candidate: RawSearchCandidate, originalQuery: string, isTimeSensitive = false): number {
    const qLower = originalQuery.toLowerCase().trim();
    const qTokens = qLower.split(/\s+/).filter((t) => t.length > 2);

    const titleLower = (candidate.title || "").toLowerCase();
    const snippetLower = (candidate.snippet || "").toLowerCase();

    // 1. Heavy penalty for generic category, disambiguation, or index pages with shallow substance
    const isCategoryPage =
      /^category\s*:/i.test(titleLower) ||
      /\bcategory\s*$/i.test(titleLower) ||
      /\bdisambiguation\b/i.test(titleLower) ||
      /\bindex of\b/i.test(titleLower);

    if (isCategoryPage && snippetLower.length < 120) {
      return 0.15; // Strongly demote
    }

    // 2. Penalty for empty or near-empty snippet
    if (!candidate.snippet || candidate.snippet.trim().length < 25) {
      return 0.2;
    }

    let score = 0.4; // Base score for real web results

    // 3. Exact query phrase in title (high precision signal)
    if (titleLower.includes(qLower)) {
      score += 0.25;
    } else {
      // Token overlap in title
      let titleMatches = 0;
      for (const t of qTokens) {
        if (titleLower.includes(t)) titleMatches++;
      }
      if (qTokens.length > 0) {
        score += 0.15 * (titleMatches / qTokens.length);
      }
    }

    // 4. Token overlap in snippet
    let snippetMatches = 0;
    for (const t of qTokens) {
      if (snippetLower.includes(t)) snippetMatches++;
    }
    if (qTokens.length > 0) {
      score += 0.15 * (snippetMatches / qTokens.length);
    }

    // 5. Source Authority Boost
    const sourceType = this.categorizeSource(candidate.url);
    if (sourceType === "official_docs") {
      score += 0.15;
    } else if (sourceType === "technical_publication" || sourceType === "educational" || sourceType === "research_paper") {
      score += 0.1;
    }

    // 6. Substantive content length boost
    if (candidate.snippet.length > 150) {
      score += 0.05;
    }

    // 7. Freshness boost if time-sensitive query
    if (isTimeSensitive) {
      const currentYear = new Date().getFullYear();
      if (titleLower.includes(`${currentYear}`) || snippetLower.includes(`${currentYear}`)) {
        score += 0.1;
      }
    }

    return Math.min(1.0, parseFloat(score.toFixed(3)));
  }

  /**
   * Reranks and diversifies search candidates.
   * Ensures that no single domain monopolizes the top results.
   */
  static rankAndDiversify(
    candidates: RawSearchCandidate[],
    originalQuery: string,
    options: {
      maxDomainFrequencyInTop?: number;
      isTimeSensitive?: boolean;
    } = {}
  ): RankedSearchResult[] {
    const { maxDomainFrequencyInTop = 2, isTimeSensitive = false } = options;

    // 1. Deduplicate
    const deduped = this.deduplicateCandidates(candidates);

    // 2. Score each candidate
    const scoredList: RankedSearchResult[] = deduped.map((c, idx) => {
      let domain = "";
      try {
        domain = new URL(c.url).hostname.replace(/^www\./, "");
      } catch {
        domain = "web";
      }

      return {
        id: `src_${idx}_${domain.slice(0, 8)}`,
        title: c.title,
        url: c.url,
        domain,
        snippet: c.snippet,
        relevanceScore: this.scoreCandidate(c, originalQuery, isTimeSensitive),
        publishedDate: this.extractDate(c),
        sourceType: this.categorizeSource(c.url),
        queryMatched: c.sourceQuery || originalQuery,
      };
    });

    // 3. Initial sort by relevance score descending
    scoredList.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 4. Source Diversity Pass for Top Results:
    // Limit any single domain to maxDomainFrequencyInTop occurrences in top 10
    const topRanked: RankedSearchResult[] = [];
    const overflow: RankedSearchResult[] = [];
    const domainCounts = new Map<string, number>();

    for (const item of scoredList) {
      const currentCount = domainCounts.get(item.domain) || 0;
      if (currentCount < maxDomainFrequencyInTop || topRanked.length >= 10) {
        topRanked.push(item);
        domainCounts.set(item.domain, currentCount + 1);
      } else {
        overflow.push(item);
      }
    }

    // Combine top diverse results with remainder
    return [...topRanked, ...overflow];
  }
}

