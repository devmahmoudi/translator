export * from "./configureTranslator";
export * from "./config/translatorConfig";

export type { default as ITranslatorService } from "./contracts/ITranslatorService";

export { default as createDevMahmoudiTranslateSmartDecorator } from "./decorators/DevMahmoudiTranslateSmartDecorator";
export * from "./decorators/DevMahmoudiTranslateSmartDecorator";

export { default as createTranslatorService } from "./factories/createTranslatorService";

export * from "./services/DevMahmoudiTranslatorService";
export * from "./services/translatorHttpClient";

export * from "./types/translation";
export * from "./utils/translate";ma