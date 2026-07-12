/**
 * Client-side types for the translator service.
 * Field names mirror the FastAPI payloads (snake_case) so repository
 * implementations can consume/return responses without remapping.
 */

/** Arbitrary JSON content to translate (or a translated result). Nested objects/arrays are supported. */
export type TranslationPayload = Record<string, unknown>;

/** Outcome status for a single target language of a request. */
export type TranslationTargetStatus = "pending" | "stored";

/** Lifecycle status of a queued translation job. */
export type TranslationJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/** Body for `POST /translations`. */
export interface TranslationRequest {
  /**
   * Source language of `source`, e.g. "fa". Optional: when omitted it is
   * resolved from the `Accept-Language` request header by the service layer.
   *
   * Note: the set of target/supported languages is owned by the translator
   * service (its env), not the client, to prevent token-exhaustion abuse.
   */
  lang?: string;
  /**
   * Application namespace. Usually injected by the translator service from
   * its constructor or `configureTranslator()`.
   */
  domain?: string;
  /** Entity type name, e.g. "task" or "form". */
  entity_name: string;
  /** Identifier of the entity being translated. */
  entity_id: string;
  /** Content to translate; nested objects/arrays are supported and passed to the prompt as-is. */
  source: TranslationPayload;
}

/** Result of handling one target language within a request. */
export interface TranslationTargetOutcome {
  target_lang: string;
  status: TranslationTargetStatus;
  /** Set when a job was queued (status "pending"). */
  job_id: number | null;
  /** Set when the content was stored immediately (status "stored"). */
  translation_id: number | null;
}

/** Response of `POST /translations`. */
export interface EnqueueTranslationResult {
  domain: string;
  entity_name: string;
  entity_id: string;
  source_lang: string;
  results: TranslationTargetOutcome[];
}

/** Keys used to look up a stored translation (`GET /translations`). */
export interface TranslationLookup {
  /**
   * Language of the stored content (a target language). Optional: when omitted
   * it is resolved from request headers by the service layer.
   */
  lang?: string;
  /** Application namespace; service-level configuration is used when omitted. */
  domain?: string;
  entity_name: string;
  entity_id: string;
}

/** A stored translation row (`GET /translations`). */
export interface Translation {
  id: number;
  /** Language of the stored content. */
  lang: string;
  domain: string;
  entity_name: string;
  entity_id: string;
  data: TranslationPayload;
  created_at: string;
  updated_at: string;
}

/** A queued/processed job (`GET /translations/jobs/{id}`). */
export interface TranslationJob {
  job_id: number;
  source_lang: string;
  target_lang: string;
  domain: string;
  entity_name: string;
  entity_id: string;
  status: TranslationJobStatus;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  translation_id: number | null;
  created_at: string;
  updated_at: string;
}
