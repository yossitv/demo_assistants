export type TavusMode = "default" | "halloween";

export interface ModeConfig {
  replicaId?: string;
  personaId?: string;
}

const sanitize = (value?: string | null) => value?.trim() || undefined;

const envMode = process.env.NEXT_PUBLIC_TAVUS_MODE;
export const DEFAULT_TAVUS_MODE: TavusMode =
  envMode === "halloween" ? "halloween" : "default";

export const MODE_CONFIGS: Record<TavusMode, ModeConfig> = {
  default: {
    replicaId: sanitize(
      process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID ??
        process.env.NEXT_PUBLIC_REPLICA_ID,
    ),
    personaId: sanitize(
      process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID ??
        process.env.NEXT_PUBLIC_PERSONA_ID,
    ),
  },
  halloween: {
    replicaId: sanitize(process.env.NEXT_PUBLIC_TAVUS_HALLOWEEN_REPLICA_ID),
    personaId: sanitize(process.env.NEXT_PUBLIC_TAVUS_HALLOWEEN_PERSONA_ID),
  },
};
