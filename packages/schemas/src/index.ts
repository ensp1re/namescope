import { z } from "zod";

export const RESULT_SCHEMA_VERSION = "namescope-result/v1" as const;

export const EvidenceSchema = z.object({
  provider: z.string(),
  query: z.string(),
  status: z.string(),
  source: z.string().url().optional(),
  detail: z.string(),
  checkedAt: z.string().datetime(),
  confidence: z.enum(["high", "medium", "low", "none"]),
});

export const CheckStateSchema = z.enum([
  "available",
  "registered",
  "no_exact_collision",
  "collision",
  "likely_available",
  "likely_taken",
  "invalid",
  "unknown",
  "unsupported",
  "error",
  "manual_verification_required",
]);

export const ProviderResultSchema = z.object({
  provider: z.string(),
  status: CheckStateSchema,
  score: z.number().min(0).max(100).optional(),
  summary: z.string(),
  evidence: z.array(EvidenceSchema),
  warnings: z.array(z.string()).default([]),
});

export const QualitySignalSchema = z.object({
  id: z.string(),
  score: z.number().min(0).max(100),
  weight: z.number().positive(),
  explanation: z.string(),
});

export const DimensionSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.string(),
  weight: z.number().min(0),
  evidence: z.array(EvidenceSchema).default([]),
});

export const TrademarkScreeningSchema = z.object({
  status: z.enum([
    "no_obvious_exact_conflict_found",
    "potential_conflict_found",
    "manual_review_required",
    "insufficient_data",
  ]),
  blocking: z.boolean(),
  disclaimer: z.string(),
  officialSearchLinks: z.array(z.string().url()),
  evidence: z.array(EvidenceSchema),
});

export const CompletedResultSchema = z.object({
  schemaVersion: z.literal(RESULT_SCHEMA_VERSION),
  name: z.string(),
  normalizedName: z.string(),
  score: z.number().min(0).max(100),
  verdict: z.string(),
  dimensions: z.record(z.string(), DimensionSchema),
  qualitySignals: z.array(QualitySignalSchema),
  providers: z.array(ProviderResultSchema),
  trademark: TrademarkScreeningSchema.optional(),
  warnings: z.array(z.string()),
  unknownChecks: z.array(z.string()),
  scoringWeights: z.record(z.string(), z.number()),
  explanation: z.string(),
  checkedAt: z.string().datetime(),
});

export const CandidateSchema = z.object({
  name: z.string(),
  style: z.string(),
  rationale: z.string(),
  sourceWords: z.array(z.string()),
});

export const GeneratedNamesSchema = z.object({
  projectDescription: z.string(),
  candidates: z.array(CandidateSchema),
  generatedAt: z.string().datetime(),
  availabilityChecked: z.literal(false),
});

export const ScoringWeightsSchema = z.object({
  packages: z.number().min(0).default(25),
  github: z.number().min(0).default(20),
  domains: z.number().min(0).default(15),
  quality: z.number().min(0).default(20),
  search: z.number().min(0).default(10),
  cli: z.number().min(0).default(10),
});

export const ConfigSchema = z.object({
  tlds: z.array(z.string()).default(["com", "org", "net", "io", "dev", "app", "ai", "co"]),
  registries: z.array(z.enum(["npm", "pypi", "crates"])).default(["npm", "pypi", "crates"]),
  weights: ScoringWeightsSchema.default({
    packages: 25,
    github: 20,
    domains: 15,
    quality: 20,
    search: 10,
    cli: 10,
  }),
  excludedWords: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().default(8_000),
  cacheTtlHours: z.number().positive().default(24),
  concurrency: z.number().int().min(1).max(20).default(4),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type ProviderResult = z.infer<typeof ProviderResultSchema>;
export type QualitySignal = z.infer<typeof QualitySignalSchema>;
export type CompletedResult = z.infer<typeof CompletedResultSchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type GeneratedNames = z.infer<typeof GeneratedNamesSchema>;
export type ScoringWeights = z.infer<typeof ScoringWeightsSchema>;
export type NamecheckConfig = z.infer<typeof ConfigSchema>;
export type TrademarkScreening = z.infer<typeof TrademarkScreeningSchema>;

export const completedResultJsonSchema = z.toJSONSchema(CompletedResultSchema, {
  target: "draft-2020-12",
});
