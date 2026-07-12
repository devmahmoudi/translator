import axios from "axios";

const DEFAULT_TRANSLATOR_SERVICE_URL = "http://localhost:8055";

/**
 * Shared axios instance used to talk to the translator service.
 *
 * It is exported so the host application can attach a request interceptor at
 * bootstrap (e.g. to inject the `Accept-Language` header from its i18n layer)
 * without the translator module depending on i18n.
 */
export const translatorHttpClient = axios.create({
  baseURL: DEFAULT_TRANSLATOR_SERVICE_URL,
  headers: { "Content-Type": "application/json" },
});
