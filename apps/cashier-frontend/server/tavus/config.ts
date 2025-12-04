export interface TavusConfig {
  apiKey: string;
  baseUrl: string;
  defaultReplicaId?: string;
  defaultPersonaId?: string;
}

export function getTavusConfig(): TavusConfig {
  const apiKey = process.env.TAVUS_API_KEY;
  const baseUrl = process.env.TAVUS_API_BASE ?? "https://tavusapi.com";
  const defaultReplicaId = process.env.REPLICA_ID;
  const defaultPersonaId = process.env.PERSONA_ID;

  if (!apiKey) {
    throw new Error("TAVUS_API_KEY is not configured");
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, "") || "https://tavusapi.com",
    defaultReplicaId,
    defaultPersonaId,
  };
}
