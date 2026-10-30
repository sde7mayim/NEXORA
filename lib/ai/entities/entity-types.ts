export type EntityCategory =
  | "laptop"
  | "smartphone"
  | "celebrity"
  | "place"
  | "electronics"
  | "company"
  | "media"
  | "general_entity";

export interface EntityImage {
  url: string;
  caption?: string;
  source?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
}

export interface EntityQuickFact {
  label: string;
  value: string;
}

export interface EntitySpecGroup {
  groupName: string;
  specs: Array<{ label: string; value: string }>;
}

export interface EntityVisitingInfo {
  bestTimeToVisit?: string;
  idealDuration?: string;
  weatherOverview?: string;
  entryFee?: string;
  timings?: string;
  nearbyDestinations?: string[];
  travelTips?: string[];
}

export interface EntityCelebrityInfo {
  profession: string;
  nationality?: string;
  born?: string;
  majorAchievements?: string[];
  notableWorks?: string[];
  careerHighlights?: string[];
}

export interface EntityCardData {
  id: string;
  name: string;
  category: EntityCategory;
  subtitle?: string;
  description?: string;
  images: EntityImage[];
  quickFacts: EntityQuickFact[];
  specGroups?: EntitySpecGroup[];
  features?: string[];
  pros?: string[];
  cons?: string[];
  suitableFor?: string[];
  variants?: string[];
  attractions?: string[];
  visitingInfo?: EntityVisitingInfo;
  celebrityInfo?: EntityCelebrityInfo;
  sources?: Array<{ title: string; url: string }>;
}

export interface EntityDetectionResult {
  isEntityQuery: boolean;
  entityName?: string;
  category?: EntityCategory;
  detectedBrand?: string;
  isFollowUp?: boolean;
  resolvedFromContext?: boolean;
  comparisonEntities?: string[];
  specificAspect?: string; // e.g. "battery", "camera", "achievements", "places to visit"
}

