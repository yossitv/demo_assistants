import { z } from 'zod';
export declare const knowledgeCreateSchema: z.ZodObject<{
    name: z.ZodString;
    sourceUrls: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "atleastone">;
}, "strip", z.ZodTypeAny, {
    name: string;
    sourceUrls: [string, ...string[]];
}, {
    name: string;
    sourceUrls: [string, ...string[]];
}>;
export declare const agentCreateSchema: z.ZodObject<{
    name: z.ZodString;
    knowledgeSpaceIds: z.ZodArray<z.ZodString, "atleastone">;
    description: z.ZodOptional<z.ZodString>;
    strictRAG: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    knowledgeSpaceIds: [string, ...string[]];
    strictRAG: boolean;
    description?: string | undefined;
}, {
    name: string;
    knowledgeSpaceIds: [string, ...string[]];
    description?: string | undefined;
    strictRAG?: boolean | undefined;
}>;
export declare const chatRequestSchema: z.ZodObject<{
    model: z.ZodString;
    messages: z.ZodEffects<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "system" | "user" | "assistant";
        content: string;
    }, {
        role: "system" | "user" | "assistant";
        content: string;
    }>, "atleastone">, [{
        role: "system" | "user" | "assistant";
        content: string;
    }, ...{
        role: "system" | "user" | "assistant";
        content: string;
    }[]], [{
        role: "system" | "user" | "assistant";
        content: string;
    }, ...{
        role: "system" | "user" | "assistant";
        content: string;
    }[]]>;
}, "strip", z.ZodTypeAny, {
    model: string;
    messages: [{
        role: "system" | "user" | "assistant";
        content: string;
    }, ...{
        role: "system" | "user" | "assistant";
        content: string;
    }[]];
}, {
    model: string;
    messages: [{
        role: "system" | "user" | "assistant";
        content: string;
    }, ...{
        role: "system" | "user" | "assistant";
        content: string;
    }[]];
}>;
export type KnowledgeCreateBody = z.infer<typeof knowledgeCreateSchema>;
export type AgentCreateBody = z.infer<typeof agentCreateSchema>;
export type ChatRequestBody = z.infer<typeof chatRequestSchema>;
export declare const validateKnowledgeCreateBody: (body: string | null) => KnowledgeCreateBody;
export declare const validateAgentCreateBody: (body: string | null) => AgentCreateBody;
export declare const validateChatRequestBody: (body: string | null) => ChatRequestBody;
//# sourceMappingURL=validation.d.ts.map