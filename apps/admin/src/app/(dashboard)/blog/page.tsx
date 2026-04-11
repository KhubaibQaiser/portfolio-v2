"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";

type BlogDraft = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  published_at: string | null;
};

const PLACEHOLDER_POSTS: BlogDraft[] = [
  {
    id: "1",
    title: "Building a Serverless Ad Platform with AWS CDK",
    slug: "building-serverless-ad-platform-aws-cdk",
    published: true,
    published_at: "2026-03-15",
  },
  {
    id: "2",
    title: "Migrating CRA to Vite at Scale",
    slug: "migrating-cra-to-vite-at-scale",
    published: true,
    published_at: "2026-02-20",
  },
  {
    id: "3",
    title: "Building a Private npm Design System",
    slug: "design-system-npm-package-guide",
    published: true,
    published_at: "2026-01-10",
  },
];

export default function BlogAdminPage() {
  const [posts] = useState<BlogDraft[]>(PLACEHOLDER_POSTS);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage blog articles. Connected to Supabase in production.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
          <Plus className="h-4 w-4" />
          New Post
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between rounded-lg border border-border p-4"
          >
            <div>
              <h3 className="font-medium">{post.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                /{post.slug}
                {post.published_at &&
                  ` · Published ${new Date(post.published_at).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md p-2 text-muted-foreground hover:text-foreground"
                title={post.published ? "Unpublish" : "Publish"}
              >
                {post.published ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
              <button
                className="rounded-md p-2 text-muted-foreground hover:text-foreground"
                title="Edit"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                className="rounded-md p-2 text-muted-foreground hover:text-red-500"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
