import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebResearchService } from "../../lib/research/search-adapter";
import { QueryExpansionService } from "../../lib/research/query-expansion";
import { SearchRankingEngine, RawSearchCandidate } from "../../lib/research/ranking-engine";

describe("Web Research Engine & Source-Grounded Ranking", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // TEST A: Broad Topic ("software engineering")
  // =========================================================================
  describe("Test A: Broad topic query expansion & multi-source coverage", () => {
    it("expands 'software engineering' into meaningful subtopics", () => {
      const analysis = QueryExpansionService.analyzeQuery("software engineering");
      expect(analysis.queryType).toBe("broad_topic");
      expect(analysis.subqueries.length).toBeGreaterThanOrEqual(3);
      expect(analysis.subqueries.some((sq) => sq.includes("fundamentals") || sq.includes("architecture"))).toBe(true);
      expect(analysis.subqueries.some((sq) => sq.includes("testing") || sq.includes("methodologies"))).toBe(true);
    });

    it("retrieves more than 4 results and demotes shallow category pages", async () => {
      // Mock candidates simulating raw web provider output
      const mockRawCandidates: RawSearchCandidate[] = [
        {
          title: "Category:Software engineering",
          url: "https://en.wikipedia.org/wiki/Category:Software_engineering",
          snippet: "Category page containing subcategories.", // Shallow category snippet
          sourceQuery: "software engineering",
        },
        {
          title: "Software Engineering Tutorial - GeeksforGeeks",
          url: "https://www.geeksforgeeks.org/software-engineering/software-engineering/",
          snippet: "A comprehensive guide to software engineering principles, lifecycle models, design, and architecture.",
          sourceQuery: "software engineering",
        },
        {
          title: "Software engineering - Wikipedia",
          url: "https://en.wikipedia.org/wiki/Software_engineering",
          snippet: "Software engineering is a branch of computer science focused on designing, developing, testing, and maintaining software applications.",
          sourceQuery: "software engineering",
        },
        {
          title: "Software Engineering Best Practices - GitHub Guide",
          url: "https://github.com/resources/articles/what-is-software-engineering",
          snippet: "Detailed insights into modern software engineering practices, CI/CD pipelines, code reviews, and testing strategies.",
          sourceQuery: "software engineering tools best practices guide",
        },
        {
          title: "Software Architecture & System Design",
          url: "https://martinfowler.com/architecture/",
          snippet: "Architectural patterns, modularity, microservices, and design principles in modern software engineering.",
          sourceQuery: "software engineering fundamentals architecture system design",
        },
        {
          title: "Testing & Quality Assurance in Software Engineering",
          url: "https://www.tutorialspoint.com/software_engineering/software_testing.htm",
          snippet: "In-depth overview of unit testing, integration testing, automated regressions, and quality metrics in software development.",
          sourceQuery: "software engineering methodologies testing quality assurance",
        },
      ];

      const ranked = SearchRankingEngine.rankAndDiversify(mockRawCandidates, "software engineering");

      // Verify > 4 results
      expect(ranked.length).toBe(6);

      // Verify substantive articles rank higher than shallow category page
      const categoryItem = ranked.find((r) => r.title.includes("Category:Software engineering"));
      expect(categoryItem).toBeDefined();
      expect(categoryItem!.relevanceScore).toBeLessThan(0.3);

      // Top result should be an authoritative or substantive technical guide
      expect(ranked[0].relevanceScore).toBeGreaterThan(0.6);
      expect(ranked[0].title).not.toContain("Category:");
    });
  });

  // =========================================================================
  // TEST B: Specific Technical Question ("React useEffect cleanup function")
  // =========================================================================
  describe("Test B: Specific technical query focus & high-precision ranking", () => {
    it("keeps specific technical queries focused without unrelated broad subtopics", () => {
      const analysis = QueryExpansionService.analyzeQuery("React useEffect cleanup function");
      expect(analysis.queryType).toBe("specific_technical");
      // Subqueries should NOT explode into unrelated generic engineering topics
      for (const sq of analysis.subqueries) {
        expect(sq.toLowerCase()).toContain("useeffect");
      }
    });

    it("ranks official React documentation and targeted technical guides top", () => {
      const candidates: RawSearchCandidate[] = [
        {
          title: "Introduction to Software Engineering - Generic Overview",
          url: "https://example.com/software-engineering-basics",
          snippet: "Software engineering is great. Here are generic basics of computer programming.",
        },
        {
          title: "Synchronizing with Effects – React Official Documentation",
          url: "https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development",
          snippet: "How to write an Effect with a cleanup function. When your component unmounts, React runs the cleanup function to prevent memory leaks and cancel subscriptions.",
        },
        {
          title: "Understanding useEffect Cleanup in React - FreeCodeCamp Guide",
          url: "https://www.freecodecamp.org/news/react-useeffect-cleanup-function/",
          snippet: "A deep dive into why and when to return a cleanup function inside useEffect, aborting fetch requests, and clearing timers.",
        },
      ];

      const ranked = SearchRankingEngine.rankAndDiversify(candidates, "React useEffect cleanup function");

      // Official react.dev docs must rank #1
      expect(ranked[0].url).toContain("react.dev");
      expect(ranked[0].sourceType).toBe("official_docs");
      expect(ranked[0].relevanceScore).toBeGreaterThan(ranked[2].relevanceScore);
      // Generic software page should rank last
      expect(ranked[ranked.length - 1].url).toContain("software-engineering-basics");
    });
  });

  // =========================================================================
  // TEST C: Current Information ("latest software engineering trends")
  // =========================================================================
  describe("Test C: Freshness detection & date extraction", () => {
    it("detects freshness intent and boosts recent dates for time-sensitive queries", () => {
      const analysis = QueryExpansionService.analyzeQuery("latest software engineering trends");
      expect(analysis.isTimeSensitive).toBe(true);
      expect(analysis.queryType).toBe("current_freshness");

      const candidates: RawSearchCandidate[] = [
        {
          title: "Historical Software Engineering in 1995",
          url: "https://example.com/1995-trends",
          snippet: "Software engineering trends in 1995 focused on C++ and desktop shrink-wrap software.",
        },
        {
          title: "Top Software Engineering Trends in 2026",
          url: "https://techtarget.com/articles/2026/software-trends",
          snippet: "Published on 2026-03-15. Key trends include AI-assisted engineering agents, edge computing, and memory-safe systems.",
          publishedDate: "2026-03-15",
        },
      ];

      const ranked = SearchRankingEngine.rankAndDiversify(candidates, "latest software engineering trends", {
        isTimeSensitive: true,
      });

      expect(ranked[0].title).toContain("2026");
      expect(ranked[0].publishedDate).toBe("2026-03-15");
      expect(ranked[0].relevanceScore).toBeGreaterThan(ranked[1].relevanceScore);
    });

    it("extracts publication dates from snippets and URLs when available", () => {
      const c1: RawSearchCandidate = {
        title: "DevOps Evolution",
        url: "https://example.com/devops",
        snippet: "Updated on 2025-11-20 with new benchmarks for automated deployment pipelines.",
      };
      const extractedDate = SearchRankingEngine.extractDate(c1);
      expect(extractedDate).toBe("2025-11-20");
    });
  });

  // =========================================================================
  // TEST D: Narrow Factual Query ("Python official documentation list comprehension")
  // =========================================================================
  describe("Test D: Narrow factual query precision", () => {
    it("classifies factual documentation queries and prioritizes official python docs", () => {
      const analysis = QueryExpansionService.analyzeQuery("Python official documentation list comprehension");
      expect(analysis.queryType).toBe("factual_direct");
      expect(analysis.requiresOfficialDocs).toBe(true);
      expect(analysis.subqueries.length).toBe(1); // No expansion explosion

      const candidates: RawSearchCandidate[] = [
        {
          title: "Random Python Forum Discussion",
          url: "https://forum.example.com/thread/123",
          snippet: "Someone asked a question about list comprehension syntax in Python.",
        },
        {
          title: "5. Data Structures — Python 3.12 Documentation",
          url: "https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions",
          snippet: "List comprehensions provide a concise way to create lists. Common applications are to make new lists where each element is the result of some operations applied to each member.",
        },
      ];

      const ranked = SearchRankingEngine.rankAndDiversify(
        candidates,
        "Python official documentation list comprehension"
      );
      expect(ranked[0].url).toContain("docs.python.org");
      expect(ranked[0].sourceType).toBe("official_docs");
    });
  });

  // =========================================================================
  // TEST E: Duplicate & Low-Quality Results Filtering
  // =========================================================================
  describe("Test E: Deduplication, URL normalization, and low-quality filtering", () => {
    it("normalizes tracking parameters, fragments, and removes duplicate URLs", () => {
      const candidates: RawSearchCandidate[] = [
        {
          title: "Software Engineering Overview",
          url: "https://example.com/guide/?utm_source=twitter&utm_medium=social#section-1",
          snippet: "Short snippet.",
        },
        {
          title: "Software Engineering Overview (Extended)",
          url: "https://example.com/guide/?gclid=xyz789&fbclid=abc",
          snippet: "Much longer and more informative snippet explaining software engineering principles in detail.",
        },
        {
          title: "Software Engineering Overview (Base)",
          url: "https://example.com/guide",
          snippet: "Base version.",
        },
      ];

      const deduped = SearchRankingEngine.deduplicateCandidates(candidates);
      expect(deduped.length).toBe(1);
      expect(deduped[0].url).toBe("https://example.com/guide");
      // Retains the best/longest snippet
      expect(deduped[0].snippet).toContain("Much longer and more informative");
    });

    it("demotes empty snippets and generic index pages", () => {
      const candidates: RawSearchCandidate[] = [
        {
          title: "Valid Engineering Article",
          url: "https://example.com/valid",
          snippet: "Detailed technical explanation with actionable engineering advice.",
        },
        {
          title: "Disambiguation Page for Software",
          url: "https://example.com/disambig",
          snippet: "Disambiguation index page.",
        },
        {
          title: "Empty Page",
          url: "https://example.com/empty",
          snippet: "   ",
        },
      ];

      const ranked = SearchRankingEngine.rankAndDiversify(candidates, "software engineering");
      expect(ranked[0].url).toContain("valid");
      expect(ranked[0].relevanceScore).toBeGreaterThan(0.5);

      const emptyItem = ranked.find((r) => r.url.includes("empty"));
      expect(emptyItem!.relevanceScore).toBeLessThanOrEqual(0.2);
    });

    it("balances domain diversity in top results", () => {
      const candidates: RawSearchCandidate[] = [
        { title: "Article 1", url: "https://site-a.com/page1", snippet: "High quality article 1 from site A." },
        { title: "Article 2", url: "https://site-a.com/page2", snippet: "High quality article 2 from site A." },
        { title: "Article 3", url: "https://site-a.com/page3", snippet: "High quality article 3 from site A." },
        { title: "Article 4", url: "https://site-a.com/page4", snippet: "High quality article 4 from site A." },
        { title: "Article B1", url: "https://site-b.com/page1", snippet: "Good article from site B." },
        { title: "Article C1", url: "https://site-c.com/page1", snippet: "Good article from site C." },
      ];

      const ranked = SearchRankingEngine.rankAndDiversify(candidates, "article", {
        maxDomainFrequencyInTop: 2,
      });

      // Top 3 results should not be all site-a.com
      const top3Domains = ranked.slice(0, 3).map((r) => r.domain);
      const siteACount = top3Domains.filter((d) => d === "site-a.com").length;
      expect(siteACount).toBeLessThanOrEqual(2);
    });
  });

  // =========================================================================
  // TEST F: Provider Limitations & Error Handling
  // =========================================================================
  describe("Test F: Provider limitations, timeouts, and accurate counting", () => {
    it("handles provider failure gracefully without fabricating results", async () => {
      // Mock fetch failing on all external endpoints
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network timeout or connection refused"));

      const result = await WebResearchService.executeBroadResearch({
        query: "nonexistent query test",
        page: 1,
        pageSize: 10,
      });

      expect(result.sources).toEqual([]);
      expect(result.totalResults).toBe(0);
      expect(result.hasMore).toBe(false);
      // Never invents fake results
    });

    it("correctly slices paginated results and computes hasMore accurately", async () => {
      // Mock fetchDuckDuckGoHtml to return 15 candidates
      vi.spyOn(WebResearchService, "fetchDuckDuckGoHtml").mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          title: `Result ${i + 1} - Software Engineering Guide`,
          url: `https://example${i}.org/guide-${i}`,
          snippet: `Snippet content for engineering guide ${i + 1}.`,
          sourceQuery: "software engineering",
        }))
      );
      vi.spyOn(WebResearchService, "fetchTavily").mockResolvedValue([]);
      vi.spyOn(WebResearchService, "fetchWikipedia").mockResolvedValue([]);
      vi.spyOn(WebResearchService, "fetchDuckDuckGoInstantAnswer").mockResolvedValue([]);

      // Page 1 with pageSize 5
      const page1 = await WebResearchService.executeBroadResearch({
        query: "software engineering",
        page: 1,
        pageSize: 5,
      });

      expect(page1.sources.length).toBe(5);
      expect(page1.totalResults).toBe(15);
      expect(page1.hasMore).toBe(true);

      // Page 3 (last page) with pageSize 5
      const page3 = await WebResearchService.executeBroadResearch({
        query: "software engineering",
        page: 3,
        pageSize: 5,
      });

      expect(page3.sources.length).toBe(5);
      expect(page3.hasMore).toBe(false);
    });
  });

  // =========================================================================
  // TEST G: Security & SSRF Protection
  // =========================================================================
  describe("Test G: Security & SSRF Guardrails", () => {
    it("allows standard public HTTPS and HTTP URLs", () => {
      expect(WebResearchService.isUrlSafe("https://en.wikipedia.org/wiki/Software_engineering")).toBe(true);
      expect(WebResearchService.isUrlSafe("https://react.dev/learn")).toBe(true);
      expect(WebResearchService.isUrlSafe("http://example.com/guide")).toBe(true);
    });

    it("blocks dangerous private IP addresses and loopbacks", () => {
      // Loopback
      expect(WebResearchService.isUrlSafe("http://localhost:3000")).toBe(false);
      expect(WebResearchService.isUrlSafe("http://127.0.0.1:8080/admin")).toBe(false);
      expect(WebResearchService.isUrlSafe("http://[::1]:8080")).toBe(false);
      expect(WebResearchService.isUrlSafe("http://0.0.0.0:80")).toBe(false);

      // RFC 1918 Private ranges
      expect(WebResearchService.isUrlSafe("http://10.0.0.1/secrets")).toBe(false);
      expect(WebResearchService.isUrlSafe("http://172.16.0.5/internal")).toBe(false);
      expect(WebResearchService.isUrlSafe("http://172.31.255.255/")).toBe(false);
      expect(WebResearchService.isUrlSafe("http://192.168.1.1/router")).toBe(false);

      // Cloud Metadata / Link-local (AWS/GCP/Azure)
      expect(WebResearchService.isUrlSafe("http://169.254.169.254/latest/meta-data/")).toBe(false);

      // Internal DNS names
      expect(WebResearchService.isUrlSafe("http://database.local:5432")).toBe(false);
      expect(WebResearchService.isUrlSafe("http://auth.internal:8000")).toBe(false);

      // Non-HTTP protocols
      expect(WebResearchService.isUrlSafe("ftp://ftp.example.com/files")).toBe(false);
      expect(WebResearchService.isUrlSafe("file:///etc/passwd")).toBe(false);
      expect(WebResearchService.isUrlSafe("javascript:alert(1)")).toBe(false);
    });
  });
});

