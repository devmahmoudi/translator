import {
  setTranslatorConfiguration,
  type TranslatorConfiguration,
} from "./config/translatorConfig";
import { translatorHttpClient } from "./services/translatorHttpClient";

/**
 * Configure the translator module from the host application's environment.
 *
 * The module intentionally does not access `import.meta.env` or `process.env`,
 * so it works with Vite, Next.js, tests, and other runtimes.
 *
 * @example Vite
 * configureTranslator({
 *   domain: import.meta.env.VITE_TRANSLATOR_DOMAIN,
 *   serviceUrl: import.meta.env.VITE_TRANSLATOR_SERVICE_URL,
 * });
 *
 * @example Next.js
 * configureTranslator({
 *   domain: process.env.NEXT_PUBLIC_TRANSLATOR_DOMAIN,
 *   serviceUrl: process.env.NEXT_PUBLIC_TRANSLATOR_SERVICE_URL,
 * });
 */
export function configureTranslator(
  configuration: TranslatorConfiguration,
): void {
  setTranslatorConfiguration(configuration);

  if (configuration.serviceUrl?.trim()) {
    translatorHttpClient.defaults.baseURL = configuration.serviceUrl.trim();
  }
}

export type { TranslatorConfiguration };
