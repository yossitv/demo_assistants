/**
 * **Feature: casher-3-avatar-kiosk, Property 3: Avatar visibility on shopping screens**
 * **Feature: casher-3-avatar-kiosk, Property 4: Connection persistence during navigation**
 */

import React from "react";
import * as fc from "fast-check";
import { render, waitFor } from "@testing-library/react";
import OrderPage from "../app/order/page";
import PayPage from "../app/pay/page";
import { LanguageProvider } from "../app/providers/LanguageProvider";
import { CartProvider } from "../app/providers/CartProvider";
import { AvatarStateProvider, useAvatarState } from "../app/providers/AvatarStateProvider";
import { AvatarState } from "../app/types";
import { PRODUCTS } from "../app/data/products";

type Route = "order" | "pay";

interface StateProbeHandle {
  getState: () => AvatarState;
  collapse: () => void;
}

const StateProbe = React.forwardRef<StateProbeHandle>((_, ref) => {
  const { state, collapse } = useAvatarState();
  React.useImperativeHandle(
    ref,
    () => ({
      getState: () => state,
      collapse,
    }),
    [state, collapse]
  );
  return null;
});

StateProbe.displayName = "StateProbe";

function AppWithProviders({
  route,
  stateRef,
  initialAvatarState,
}: {
  route: Route;
  stateRef: React.Ref<StateProbeHandle>;
  initialAvatarState: AvatarState;
}) {
  return (
    <LanguageProvider>
      <CartProvider>
        <AvatarStateProvider initialState={initialAvatarState}>
          <StateProbe ref={stateRef} />
          {route === "order" ? <OrderPage /> : <PayPage />}
        </AvatarStateProvider>
      </CartProvider>
    </LanguageProvider>
  );
}

describe("**Feature: casher-3-avatar-kiosk, Property 3: Avatar visibility on shopping screens**", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("Property: Floating avatar stays visible on order and pay screens while connected", async () => {
    await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ["http", "https"] }),
          fc.string({ minLength: 1, maxLength: 40 }),
          async (conversationUrl, conversationId) => {
            localStorage.setItem(
              "casher3_cart",
              JSON.stringify([{ product: PRODUCTS[0], quantity: 1 }])
            );

            const connectedState: AvatarState = {
              isConnected: true,
              isConnecting: false,
              isExpanded: false,
              conversationUrl,
              conversationId,
              error: null,
            };

            const stateRef = React.createRef<StateProbeHandle>();
            const view = render(
              <AppWithProviders
                route="order"
                stateRef={stateRef}
                initialAvatarState={connectedState}
              />
            );

            try {
              await waitFor(() => {
                const avatar = view.container.querySelector(".sharedAvatarFloating");
                expect(avatar).toBeInTheDocument();
              });

              view.rerender(
                <AppWithProviders
                  route="pay"
                  stateRef={stateRef}
                  initialAvatarState={connectedState}
                />
              );

              await waitFor(() => {
                const avatar = view.container.querySelector(".sharedAvatarFloating");
                expect(avatar).toBeInTheDocument();
              });

              const latestState = stateRef.current?.getState();
              expect(latestState?.isConnected).toBe(true);
              expect(latestState?.isExpanded).toBe(false);
              expect(latestState?.conversationUrl).toBe(conversationUrl);
              expect(latestState?.conversationId).toBe(conversationId);
            } finally {
              view.unmount();
            }
          }
        ),
      { 
        numRuns: 50,
        timeout: 30000
      }
    );
  }, 35000);
});

describe("**Feature: casher-3-avatar-kiosk, Property 4: Connection persistence during navigation**", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("Property: avatar connection and display state persists when navigating from order to pay", async () => {
    await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ["http", "https"] }),
          fc.string({ minLength: 1, maxLength: 40 }),
          async (conversationUrl, conversationId) => {
            localStorage.setItem(
              "casher3_cart",
              JSON.stringify([{ product: PRODUCTS[1], quantity: 2 }])
            );

            const connectedState: AvatarState = {
              isConnected: true,
              isConnecting: false,
              isExpanded: false,
              conversationUrl,
              conversationId,
              error: null,
            };

            const stateRef = React.createRef<StateProbeHandle>();
            const view = render(
              <AppWithProviders
                route="order"
                stateRef={stateRef}
                initialAvatarState={connectedState}
              />
            );

            try {
              await waitFor(() => {
                const avatar = view.container.querySelector(".sharedAvatarFloating");
                expect(avatar).toBeInTheDocument();
              });

              view.rerender(
                <AppWithProviders
                  route="pay"
                  stateRef={stateRef}
                  initialAvatarState={connectedState}
                />
              );

              await waitFor(() => {
                const payState = stateRef.current?.getState();
                expect(payState?.isConnected).toBe(true);
                expect(payState?.conversationUrl).toBe(conversationUrl);
                expect(payState?.conversationId).toBe(conversationId);
                expect(payState?.isExpanded).toBe(false);
                const avatar = view.container.querySelector(".sharedAvatarFloating");
                expect(avatar).toBeInTheDocument();
              });
            } finally {
              view.unmount();
            }
          }
        ),
      { 
        numRuns: 50,
        timeout: 30000
      }
    );
  }, 35000);
});
