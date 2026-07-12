import axios, { type AxiosInstance } from "axios";

import type ITranslatorService from "../contracts/ITranslatorService";
import type {
  EnqueueTranslationResult,
  Translation,
  TranslationJob,
  TranslationLookup,
  TranslationRequest,
} from "../types/translation";
import { getTranslatorConfiguration } from "../config/translatorConfig";
import { translatorHttpClient } from "./translatorHttpClient";

/**
 * axios-based implementation of {@link ITranslatorService} that talks to the
 * translator FastAPI service over HTTP.
 *
 * Uses the shared {@link translatorHttpClient} by default so any interceptors
 * the host app registers (e.g. language headers) apply to these requests.
 */
export class DevMahmoudiTranslatorService implements ITranslatorService {
  private readonly http: AxiosInstance;
  private readonly domain?: string;

  /**
   * @param domain Application namespace. Overrides `configureTranslator()`.
   * @param http Optional HTTP client for dependency injection.
   */
  constructor(
    domain?: string,
    http: AxiosInstance = translatorHttpClient,
  ) {
    this.domain = domain?.trim() || undefined;
    this.http = http;
  }

  async enqueueTranslation(
    request: TranslationRequest,
  ): Promise<EnqueueTranslationResult> {
    const domain = this.resolveDomain(request.domain);
    const response = await this.http.post<EnqueueTranslationResult>(
      "/translations",
      { ...request, domain },
    );

    return response.data;
  }

  async getTranslation(lookup: TranslationLookup): Promise<Translation | null> {
    try {
      const domain = this.resolveDomain(lookup.domain);
      const response = await this.http.get<Translation>("/translations", {
        params: {
          lang: lookup.lang,
          domain,
          entity_name: lookup.entity_name,
          entity_id: lookup.entity_id,
        },
      });

      return response.data;
    } catch (error) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async getJob(jobId: number): Promise<TranslationJob | null> {
    try {
      const response = await this.http.get<TranslationJob>(
        `/translations/jobs/${jobId}`,
      );

      return response.data;
    } catch (error) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  private isNotFound(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 404;
  }

  private resolveDomain(override?: string): string {
    const domain =
      override?.trim() ||
      this.domain ||
      getTranslatorConfiguration().domain?.trim();
    if (!domain) {
      throw new Error(
        "Translator domain is required. Call configureTranslator({ domain }) " +
          "or pass a domain to DevMahmoudiTranslatorService/the smart decorator.",
      );
    }
    return domain;
  }
}
