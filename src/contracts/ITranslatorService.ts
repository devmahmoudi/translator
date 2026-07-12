import type {
  EnqueueTranslationResult,
  Translation,
  TranslationJob,
  TranslationLookup,
  TranslationRequest,
} from "../types/translation";

/**
 * Client-side contract for the translator service.
 *
 * Translation is asynchronous: `enqueueTranslation` fans a source out to its
 * target languages (storing same-language content immediately and queuing the
 * rest), while the translated results become available through
 * `getTranslation` once the backend worker has processed each job.
 */
export default interface ITranslatorService {
  /** Queue a translation request; returns the per-target outcome. */
  enqueueTranslation(
    request: TranslationRequest,
  ): Promise<EnqueueTranslationResult>;

  /** Fetch a stored translation for a language, or `null` if not available yet. */
  getTranslation(lookup: TranslationLookup): Promise<Translation | null>;

  /** Fetch the status of a queued job, or `null` if it does not exist. */
  getJob(jobId: number): Promise<TranslationJob | null>;
}
