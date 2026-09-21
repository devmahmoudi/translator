import type ITranslatorService from "../contracts/ITranslatorService";
import { DevMahmoudiTranslatorService } from "../services/DevMahmoudiTranslatorService";

export default function createTranslatorService(domain?: string, server?: string): ITranslatorService {
  return new DevMahmoudiTranslatorService(domain, server);
}
