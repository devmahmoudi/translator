export interface TranslatorConfiguration {
  /** Application namespace used to isolate translations. */
  domain?: string;
  /** Base URL of the translator HTTP service. */
  serviceUrl?: string;
}

let configuration: TranslatorConfiguration = {};

export function setTranslatorConfiguration(
  next: TranslatorConfiguration,
): void {
  configuration = {
    ...configuration,
    ...next,
    domain: next.domain?.trim() || configuration.domain,
    serviceUrl: next.serviceUrl?.trim() || configuration.serviceUrl,
  };
}

export function getTranslatorConfiguration(): Readonly<TranslatorConfiguration> {
  return configuration;
}
