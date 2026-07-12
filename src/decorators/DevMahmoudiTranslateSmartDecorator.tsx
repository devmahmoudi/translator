import type ITranslatorService from "../contracts/ITranslatorService";
import type { TranslationPayload } from "../types/translation";
import createTranslatorService from "../factories/createTranslatorService";
import { mergeTranslation, translate } from "../utils/translate";

/**
 * Configuration for {@link createDevMahmoudiTranslateSmartDecorator}.
 */
export interface SmartTranslateConfig {
  /**
   * Application namespace. Overrides the module-level configuration for this
   * repository, allowing one client to address multiple translation domains.
   */
  domain?: string;
  /** Entity type name stored with each translation, e.g. "workgroup". */
  entityName: string;
  /** Property holding the entity identifier (default "id"). */
  idKey?: string;
  /**
   * Fields that must NOT be translated. Supports top-level names and dotted
   * nested paths, e.g. `"created_at"` or `"task_data.workflow_id"`.
   *
   * Top-level entries omit the whole property; nested paths omit only that
   * leaf/subtree while still sending the parent object for translation.
   * When omitted, every field on the entity (except the id) is sent.
   */
  ignoreFields?: string[];
  /**
   * Method-name classifiers. Reads translate the returned data; writes enqueue
   * it for translation. Anything matching neither is passed through untouched.
   */
  readMethods?: RegExp;
  writeMethods?: RegExp;
}

const DEFAULT_READ_METHODS =
  /^(get|find|list|fetch|search|load|read|show|all|query)/i;
const DEFAULT_WRITE_METHODS =
  /^(create|update|insert|upsert|save|store|edit|patch|put)/i;

/**
 * A single, module-agnostic translation decorator.
 *
 * Instead of hand-writing a decorator per repository (which breaks DRY because
 * every repository has different method names — `createUser`, `createWorkflow`,
 * `create`, …), this wraps any repository in a {@link Proxy} — the JS analogue
 * of PHP's `__call` magic method — and intercepts every method call:
 *
 *  - **read** methods (e.g. `getX`, `findX`, `search`): the returned entity,
 *    entity array, or paginated wrapper (`{ data: T[] }`) is overlaid with
 *    stored translations.
 *  - **write** methods (e.g. `createX`, `updateX`): the returned entity is
 *    enqueued for translation.
 *  - everything else is delegated unchanged.
 *
 * Source and target languages are resolved by the service layer via request
 * headers. The application domain comes from `configureTranslator()` unless
 * explicitly overridden in this config. Translation work is best-effort.
 *
 * @example
 * export const createTaskRepository = () =>
 *   createDevMahmoudiTranslateSmartDecorator(new SupabaseTaskRepository(), {
 *     domain: "satia-ng-web", // optional when configureTranslator() was called
 *     entityName: "task",
 *     ignoreFields: [
 *       "created_at",
 *       "updated_at",
 *       "task_data.workflow_id",
 *       "task_data.form_id",
 *       "step.step_id",
 *     ],
 *   });
 */
export default function createDevMahmoudiTranslateSmartDecorator<
  T extends object,
>(repository: T, config: SmartTranslateConfig): T {
  const translator: ITranslatorService = createTranslatorService(config.domain);

  const idKey = config.idKey ?? "id";
  const readMethods = config.readMethods ?? DEFAULT_READ_METHODS;
  const writeMethods = config.writeMethods ?? DEFAULT_WRITE_METHODS;

  // The id is identity, never content, so it is always excluded from the
  // translatable payload alongside any explicitly ignored fields / paths.
  const ignoredFields = new Set([idKey, ...(config.ignoreFields ?? [])]);

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const hasId = (value: unknown): value is Record<string, unknown> =>
    isRecord(value) && value[idKey] !== undefined && value[idKey] !== null;

  /**
   * Build the translatable payload, dropping ignored top-level fields and
   * nested dotted paths (e.g. `task_data.assigned_to`).
   *
   * Array elements inherit their parent's path prefix so an ignore like
   * `data.label` still applies inside `data: [{ label: "..." }]`.
   */
  const omitIgnored = (value: unknown, prefix: string): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => omitIgnored(item, prefix));
    }

    if (!isRecord(value)) return value;

    const result: TranslationPayload = {};
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (ignoredFields.has(path)) continue;
      result[key] = omitIgnored(child, path);
    }
    return result;
  };

  const pickSource = (entity: Record<string, unknown>): TranslationPayload =>
    omitIgnored(entity, "") as TranslationPayload;

  const enqueueEntity = async (entity: unknown): Promise<void> => {
    if (!hasId(entity)) return;

    try {
      await translator.enqueueTranslation({
        entity_name: config.entityName,
        entity_id: String(entity[idKey]),
        source: pickSource(entity),
      });
    } catch (error) {
      console.error(
        `[SmartTranslate] enqueue failed for ${config.entityName}:`,
        error,
      );
    }
  };

  const translateEntity = async (entity: unknown): Promise<unknown> => {
    if (!hasId(entity)) return entity;

    try {
      const translation = await translator.getTranslation({
        entity_name: config.entityName,
        entity_id: String(entity[idKey]),
      });

      if (!translation) return entity;

      // Translate only the picked (non-ignored) subtree, then deep-merge back
      // onto the full entity so ignored nested fields are never wiped.
      const translated = translate(pickSource(entity), translation);

      return mergeTranslation(entity, translated);
    } catch (error) {
      console.error(
        `[SmartTranslate] translate failed for ${config.entityName}:`,
        error,
      );
      return entity;
    }
  };

  /**
   * Walk common list/page wrappers (`{ data: T[] }`, `{ items }`, `{ results }`)
   * so paginated reads like `getWorkflows()` still translate each entity.
   * Entities that themselves carry an `id` (e.g. form responses with a `data`
   * payload) are handled as a single entity and are never unwrapped.
   */
  const mapCollectionResult = async (
    result: unknown,
    mapEntity: (entity: unknown) => Promise<unknown>,
  ): Promise<unknown> => {
    if (Array.isArray(result)) {
      return Promise.all(result.map(mapEntity));
    }

    if (hasId(result)) {
      return mapEntity(result);
    }

    if (isRecord(result)) {
      for (const key of ["data", "items", "results"] as const) {
        const collection = result[key];
        if (Array.isArray(collection)) {
          return {
            ...result,
            [key]: await Promise.all(collection.map(mapEntity)),
          };
        }
      }
    }

    return result;
  };

  const enqueueResult = async (result: unknown): Promise<void> => {
    await mapCollectionResult(result, async (entity) => {
      await enqueueEntity(entity);
      return entity;
    });
  };

  const translateResult = async (result: unknown): Promise<unknown> =>
    mapCollectionResult(result, translateEntity);

  return new Proxy(repository, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original !== "function" || typeof prop !== "string") {
        return original;
      }

      const isWrite = writeMethods.test(prop);
      const isRead = !isWrite && readMethods.test(prop);

      // Bind to the real repository so its internal `this.method()` calls do
      // not re-enter the proxy (which would double-translate/enqueue).
      if (!isWrite && !isRead) {
        return original.bind(target);
      }

      return async (...args: unknown[]): Promise<unknown> => {
        const result = await original.apply(target, args);

        if (isWrite) {
          await enqueueResult(result);
          return result;
        }

        return translateResult(result);
      };
    },
  }) as T;
}
