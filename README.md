# @devmahmoudi/translator

Type-safe client SDK for asynchronous entity translation.

This package helps frontend repositories:

- enqueue translation jobs after write operations
- resolve translated entity data on read operations
- keep translation logic isolated from i18n/framework details

The package is transport-ready (Axios), framework-agnostic, and exported as ESM with TypeScript types.

---

## Features

- Configurable translator domain and service URL via `configureTranslator`
- Shared `translatorHttpClient` for app-level interceptors (for example `Accept-Language`)
- `DevMahmoudiTranslatorService` implementation of `ITranslatorService`
- `createDevMahmoudiTranslateSmartDecorator` to wrap repositories with automatic read/write translation behavior
- `translate` and `mergeTranslation` helpers for deep, safe translation overlay
- Strongly typed request/response/job contracts

---

## Installation

Using `pnpm`:

```bash
pnpm add @devmahmoudi/translator
```

Using `npm`:

```bash
npm install @devmahmoudi/translator
```

Using `yarn`:

```bash
yarn add @devmahmoudi/translator
```

---

## Quick Start

### 1) Configure once at app bootstrap

```ts
import { configureTranslator } from "@devmahmoudi/translator";

configureTranslator({
  domain: "Project domain value. For example: press.satia.co. You can define this value in your project .env",
  serviceUrl: "Translator service server url",
});
```

### 2) Attach current language to requests (recommended)

```ts
import { translatorHttpClient } from "@devmahmoudi/translator";

translatorHttpClient.interceptors.request.use((config) => {
  config.headers.set("Accept-Language", "fa");
  return config;
});
```

### 3) Wrap your repository with the smart decorator

```ts
import { createDevMahmoudiTranslateSmartDecorator } from "@devmahmoudi/translator";
import { SupabaseTaskRepository } from "./SupabaseTaskRepository";

export const createTaskRepository = () =>
  createDevMahmoudiTranslateSmartDecorator(new SupabaseTaskRepository(), {
    ignoreFields: [
      "created_at",
      "updated_at",
      "task_data.workflow_id",
      "task_data.form_id",
    ],
  });
```

---

## How It Works

1. `configureTranslator` stores module-level configuration (`domain`, `serviceUrl`).
2. Write methods (`create*`, `update*`, ...) enqueue translation jobs automatically.
3. Read methods (`get*`, `find*`, `list*`, ...) fetch translation data and overlay it onto source entities.
4. Translation is asynchronous: reads can return original source until translation becomes available.

---

### Smart Repository Decorator

#### `createDevMahmoudiTranslateSmartDecorator(repository, config)`

```ts
function createDevMahmoudiTranslateSmartDecorator<T extends object>(
  repository: T,
  config: SmartTranslateConfig,
): T;
```

Wraps a repository using `Proxy` and intercepts method calls by name pattern.

Default method classifiers:

- read: `/^(get|find|list|fetch|search|load|read|show|all|query)/i`
- write: `/^(create|update|insert|upsert|save|store|edit|patch|put)/i`

Behavior:

- write methods: enqueue returned entities for translation
- read methods: overlay stored translations onto returned entities
- other methods: passed through unchanged

Supported return shapes for read/write interception:

- single entity with id
- arrays of entities
- paginated wrappers with `data`, `items`, or `results` arrays

#### `SmartTranslateConfig`

```ts
interface SmartTranslateConfig {
  domain?: string;
  entityName?: string;
  idKey?: string;
  ignoreFields?: string[];
  readMethods?: RegExp;
  writeMethods?: RegExp;
}
```

Notes:

- `entityName` defaults to the repository's runtime class name (for example, `SupabaseTaskRepository`). Set it explicitly when a different or class-name-independent identifier is needed.
- `idKey` defaults to `"id"` and is always excluded from translation payload.
- `ignoreFields` supports top-level and dotted nested paths (`"task_data.workflow_id"`).
- Translation enqueue/overlay errors are logged and treated as best-effort (repository call still succeeds).

---

## End-to-End Example

```ts
import {
  configureTranslator,
  translatorHttpClient,
  createDevMahmoudiTranslateSmartDecorator,
} from "@devmahmoudi/translator";

configureTranslator({
  domain: "satia-ng-web",
  serviceUrl: "http://localhost:8055",
});

translatorHttpClient.interceptors.request.use((config) => {
  config.headers.set("Accept-Language", "en");
  return config;
});

class TaskRepository {
  async createTask(input: Record<string, unknown>) {
    // save and return entity
    return { id: 10, ...input };
  }

  async getTask() {
    return { id: 10, title: "عنوان", description: "..." };
  }
}

const repository = createDevMahmoudiTranslateSmartDecorator(
  new TaskRepository(),
  {
    entityName: "task",
    ignoreFields: ["created_at", "updated_at"],
  },
);

await repository.createTask({ title: "عنوان" }); // enqueue translation
const task = await repository.getTask(); // translated overlay when available
```

---

## Development

From this package directory:

```bash
pnpm dev
pnpm build
pnpm lint
```

---

## License

ISC
