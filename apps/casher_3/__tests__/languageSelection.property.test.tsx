/**
 * **Feature: casher-3-avatar-kiosk, Property 1: Language selection updates all translatable text**
 */

import React from "react";
import * as fc from "fast-check";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "../app/home/page";
import { LanguageProvider } from "../app/providers/LanguageProvider";
import { Language } from "../app/types";

const copyByLanguage: Record<Language, { title: string; message: string; start: string }> = {
  ja: {
    title: "☕ ようこそ",
    message: "何かお困りのことがあれば、いつでもお声がけください",
    start: "注文を始める",
  },
  en: {
    title: "☕ Welcome",
    message: "Feel free to ask me anything if you need help",
    start: "Start Order",
  },
};

describe("**Feature: casher-3-avatar-kiosk, Property 1: Language selection updates all translatable text**", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Property: every language selection updates all visible translatable text on home screen", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom<Language>("ja", "en"), { minLength: 1, maxLength: 4 }),
        async (selections) => {
          localStorage.clear();
          const user = userEvent.setup();

          const view = render(
            <LanguageProvider>
              <HomePage />
            </LanguageProvider>
          );

          try {
            const assertCopy = (lang: Language) => {
              const copy = copyByLanguage[lang];
              expect(view.getByRole("heading", { level: 1 })).toHaveTextContent(copy.title);
              expect(view.getByText(copy.message)).toBeInTheDocument();
              expect(view.getByRole("button", { name: copy.start })).toBeInTheDocument();
            };

            // Initial render should default to Japanese
            await waitFor(() => assertCopy("ja"));

            let currentLanguage: Language = "ja";
            for (const lang of selections) {
              const buttonLabel = lang === "ja" ? "🇯🇵 日本語" : "🇺🇸 English";
              await user.click(view.getByRole("button", { name: buttonLabel }));
              currentLanguage = lang;
              await waitFor(() => assertCopy(currentLanguage));
            }
          } finally {
            view.unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
