export interface XUserMetrics {
  followersCount?: number;
  followingCount?: number;
  tweetCount?: number;
  listedCount?: number;
}

export interface XUser {
  id: string;
  username: string;
  name?: string;
  description?: string;
  location?: string;
  metrics?: XUserMetrics;
}

export interface XPost {
  id: string;
  text: string;
  createdAt: string;
}

export interface SocialContextSeed {
  user: XUser;
  posts: XPost[];
  question: string;
}

export interface ProductContextSeed {
  product: {
    name: string;
    description: string;
    image?: string;
  };
  prompt: string;
}

export type ContextSeed = SocialContextSeed | ProductContextSeed;

export interface ContextBuilder {
  build(seed: ContextSeed): Promise<string>;
}

export function isProductSeed(seed: ContextSeed): seed is ProductContextSeed {
  return "product" in seed;
}

export function isSocialSeed(seed: ContextSeed): seed is SocialContextSeed {
  return "user" in seed && "posts" in seed;
}
