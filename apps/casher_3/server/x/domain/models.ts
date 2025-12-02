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
