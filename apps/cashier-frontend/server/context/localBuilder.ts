import { ContextBuilder, ContextSeed, isProductSeed } from "./types";

export class LocalContextBuilder implements ContextBuilder {
  async build(seed: ContextSeed): Promise<string> {
    if (isProductSeed(seed)) {
      return JSON.stringify(
        {
          summary: "Product context",
          product: seed.product,
          prompt: seed.prompt,
        },
        null,
        2,
      );
    }

    return JSON.stringify(
      {
        summary: "Local fallback context",
        user: seed.user,
        recent_posts: seed.posts.slice(0, 5),
        prompt: seed.question,
      },
      null,
      2,
    );
  }
}
