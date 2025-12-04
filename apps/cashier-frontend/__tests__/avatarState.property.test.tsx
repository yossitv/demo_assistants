/**
 * **Feature: casher-3-avatar-kiosk, Property 5: Connect function sets isConnected on success**
 * **Feature: casher-3-avatar-kiosk, Property 2: Connection persistence during collapse**
 */

import React from "react";
import * as fc from "fast-check";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AvatarStateProvider, useAvatarState } from "../app/providers/AvatarStateProvider";
import { Language } from "../app/types";

const Providers = ({ children }: { children: React.ReactNode }) => (
  <AvatarStateProvider>{children}</AvatarStateProvider>
);

describe("**Feature: casher-3-avatar-kiosk, Property 5: Connect function sets isConnected on success**", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it("Property: connect() marks the avatar as connected and stores conversation data on success", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ validSchemes: ["http", "https"] }),
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.constantFrom<Language>("ja", "en"),
        fc.string({ minLength: 1, maxLength: 80 }),
        async (conversationUrl, conversationId, language, cartContext) => {
          const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              conversation_url: conversationUrl,
              conversation_id: conversationId,
            }),
          });

          (global as any).fetch = fetchMock;

          const { result } = renderHook(() => useAvatarState(), { wrapper: Providers });

          await act(async () => {
            await result.current.connect(language, cartContext);
          });

          await waitFor(() => expect(result.current.state.isConnecting).toBe(false));

          expect(result.current.state.isConnected).toBe(true);
          expect(result.current.state.isExpanded).toBe(true);
          expect(result.current.state.conversationUrl).toBe(conversationUrl);
          expect(result.current.state.conversationId).toBe(conversationId);
          expect(result.current.state.error).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("**Feature: casher-3-avatar-kiosk, Property 2: Connection persistence during collapse**", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it("Property: collapse keeps the Tavus connection active", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ validSchemes: ["http", "https"] }),
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.constantFrom<Language>("ja", "en"),
        fc.integer({ min: 1, max: 3 }),
        async (conversationUrl, conversationId, language, collapseCount) => {
          const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              conversation_url: conversationUrl,
              conversation_id: conversationId,
            }),
          });

          (global as any).fetch = fetchMock;

          const { result } = renderHook(() => useAvatarState(), { wrapper: Providers });

          await act(async () => {
            await result.current.connect(language, "Generated cart context for property test");
          });

          await waitFor(() => expect(result.current.state.isConnected).toBe(true));

          for (let i = 0; i < collapseCount; i += 1) {
            await act(async () => {
              result.current.collapse();
            });
          }

          expect(result.current.state.isConnected).toBe(true);
          expect(result.current.state.conversationUrl).toBe(conversationUrl);
          expect(result.current.state.conversationId).toBe(conversationId);
          expect(result.current.state.isExpanded).toBe(false);
          expect(result.current.state.error).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
