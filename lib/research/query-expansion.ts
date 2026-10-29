export type QueryType = "broad_topic" | "specific_technical" | "current_freshness" | "factual_direct";

export interface QueryAnalysis {
  query: string;
  queryType: QueryType;
  primaryQuery: string;
  subqueries: string[];
  isTimeSensitive: boolean;
  requiresOfficialDocs: boolean;
}

export class QueryExpansionService {
  /**
   * Analyzes and classifies the user's research query to determine whether and how to expand it.
   */
  static analyzeQuery(rawQuery: string): QueryAnalysis {
    const query = rawQuery.trim();
    const qLower = query.toLowerCase();

    // 1. Time-sensitive / freshness check
    const isTimeSensitive =
      /\b(latest|recent|new|news|trend|trends|2024|2025|2026|today|current|upcoming)\b/i.test(qLower);

    // 2. Factual / exact documentation queries (e.g. "Python official documentation ...", "RFC 7519", "MDN array slice")
    const isOfficialDocsQuery =
      /\b(official doc|official documentation|docs|documentation|rfc\s*\d+|mdn|specification|spec|api reference)\b/i.test(
        qLower
      );

    // 3. Specific technical question (e.g. specific function, syntax, error message, or exact method)
    const isSpecificTechnical =
      /\b(useeffect|cleanup|hook|method|function|syntax|error|bug|exception|undefined|null pointer|regex|dockerfile|tsconfig|webpack|vite|regex|closure|async await)\b/i.test(
        qLower
      ) ||
      query.includes("()") ||
      query.includes("->") ||
      query.includes("::") ||
      query.split(/\s+/).length >= 5;

    // 4. Broad topic (e.g. "software engineering", "quantum computing", "machine learning", "cloud computing")
    const isBroad =
      !isSpecificTechnical &&
      !isOfficialDocsQuery &&
      (query.split(/\s+/).length <= 3 ||
        /\b(software engineering|computer science|artificial intelligence|machine learning|cybersecurity|blockchain|cloud computing|devops|data science|robotics|quantum computing|system design|agile)\b/i.test(
          qLower
        ));

    let queryType: QueryType = "broad_topic";
    if (isTimeSensitive) {
      queryType = "current_freshness";
    } else if (isOfficialDocsQuery) {
      queryType = "factual_direct";
    } else if (isSpecificTechnical) {
      queryType = "specific_technical";
    } else if (isBroad) {
      queryType = "broad_topic";
    } else {
      queryType = "specific_technical";
    }

    const subqueries = this.generateSubqueries(query, queryType);

    return {
      query,
      queryType,
      primaryQuery: query,
      subqueries,
      isTimeSensitive,
      requiresOfficialDocs: isOfficialDocsQuery,
    };
  }

  /**
   * Generates meaningful subqueries strictly preserving the user's intent.
   * Broad topics receive targeted subtopic facets.
   * Specific technical or factual queries remain focused without dilution.
   */
  private static generateSubqueries(query: string, queryType: QueryType): string[] {
    const qLower = query.toLowerCase();

    switch (queryType) {
      case "broad_topic": {
        // Expand broad topic into key facets: Architecture/Fundamentals, Methodologies/Testing, Tools/Practices, Documentation
        if (qLower.includes("software engineering")) {
          return [
            query,
            "software engineering fundamentals architecture system design",
            "software engineering methodologies testing quality assurance",
            "software engineering tools best practices guide",
          ];
        }
        if (qLower.includes("quantum computing")) {
          return [
            query,
            "quantum computing principles architecture hardware qubits",
            "quantum computing algorithms error correction",
            "quantum computing applications future outlook",
          ];
        }
        if (qLower.includes("machine learning")) {
          return [
            query,
            "machine learning core concepts algorithms models",
            "deep learning neural networks training best practices",
            "machine learning deployment mlops architecture",
          ];
        }

        // Generic broad topic expansion
        return [
          query,
          `${query} fundamentals architecture principles`,
          `${query} practical applications and best practices`,
          `${query} comprehensive guide documentation`,
        ];
      }

      case "current_freshness": {
        const currentYear = new Date().getFullYear();
        // Avoid repeating year if already present
        const hasYear = /\b202\d\b/.test(query);
        const yearSuffix = hasYear ? "" : ` ${currentYear}`;

        return [
          query,
          `${query}${yearSuffix} developments`,
          `${query}${yearSuffix} industry analysis trends`,
        ];
      }

      case "factual_direct": {
        // Keep strictly focused on official docs or specification without broad subtopics
        return [query];
      }

      case "specific_technical": {
        // Minor complementary technical focus if brief, otherwise just primary query
        if (query.split(/\s+/).length <= 4) {
          return [query, `${query} example explanation documentation`];
        }
        return [query];
      }

      default:
        return [query];
    }
  }
}

