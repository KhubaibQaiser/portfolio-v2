#!/usr/bin/env python3
"""Regenerate seed/content.json from CSV exports in seed/export/."""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXPORT_DIR = ROOT / "seed" / "export"
OUT_PATH = ROOT / "seed" / "content.json"


def read_csv(name: str) -> list[dict[str, str]]:
    with (EXPORT_DIR / name).open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def parse_json_field(val: str | None):
    if val is None or val == "":
        return None
    return json.loads(val)


def to_bool(val: str | None) -> bool:
    return str(val).lower() == "true"


def to_int(val: str | None) -> int:
    return int(val) if val not in (None, "") else 0


def to_nullable_str(val: str | None) -> str | None:
    if val in (None, ""):
        return None
    return val


def normalize_timestamp(val: str) -> str:
    if "T" in val:
        return val.replace("+00", "Z")
    return val.replace(" ", "T").replace("+00", "Z")


def main() -> None:
    hero = read_csv("hero_rows.csv")[0]
    about = read_csv("about_rows.csv")[0]
    site = read_csv("site_config_rows.csv")[0]
    resume = read_csv("resume_rows.csv")[0]

    content: dict = {
        "hero": {
            "greeting": hero["greeting"],
            "headline": hero["headline"],
            "subtitle": parse_json_field(hero["subtitle"]),
            "value_proposition": hero["value_proposition"].replace("6 companies", "7 companies"),
            "cta_primary_text": hero["cta_primary_text"],
            "cta_secondary_text": hero["cta_secondary_text"],
        },
        "about": {
            "bio": about["bio"],
            "photo_url": to_nullable_str(about["photo_url"]),
            "status": about["status"],
            "timezone": about["timezone"],
            "years_experience": to_int(about["years_experience"]),
            "countries_count": to_int(about["countries_count"]),
            "projects_count": to_int(about["projects_count"]),
            "users_impacted": about["users_impacted"],
            "industries": parse_json_field(about["industries"]),
            "languages": parse_json_field(about["languages"]),
            "highlights": [
                {
                    "title": "I Ship End-to-End",
                    "description": "From AWS CDK infrastructure to pixel-perfect React UIs. No handoff friction.",
                },
                {
                    "title": "AI-Augmented, Not AI-Dependent",
                    "description": "I use AI to ship 3x faster while writing code I can defend in any review.",
                },
                {
                    "title": "Battle-Tested Globally",
                    "description": "11 years across Ad-Tech, E-Commerce, SaaS, and EdTech. Teams across SF, Austin, Jakarta, and more.",
                },
                {
                    "title": "I Elevate Teams",
                    "description": "Created design systems used by 40+ engineers. Mentored juniors into mid-levels.",
                },
            ],
        },
        "siteConfig": {
            "name": site["name"],
            "email": site["email"],
            "location": site["location"],
            "title": site["title"],
            "description": site["description"],
            "social_links": parse_json_field(site["social_links"]),
            "nav_links": parse_json_field(site["nav_links"]),
            "tech_stack": [
                "Next.js 16",
                "React 19",
                "TypeScript",
                "Tailwind CSS v4",
                "Turborepo",
                "pnpm",
                "AWS CDK",
                "AWS Lambda",
                "Amazon DynamoDB",
                "Amazon S3 + CloudFront",
                "Amazon Cognito",
                "OpenNext",
                "Vercel AI SDK",
                "Groq",
                "PostHog",
            ],
        },
        "resume": {
            "default_summary": resume["default_summary"],
            "education": parse_json_field(resume["education"]),
            "certifications": parse_json_field(resume["certifications"]),
            "visible_sections": parse_json_field(resume["visible_sections"]),
            "is_projects_visible": to_bool(resume["is_projects_visible"]),
            "voice_sample": to_nullable_str(resume.get("voice_sample")),
        },
        "experience": [],
        "projects": [],
        "skills": [],
        "testimonials": [],
        "media": [],
    }

    for row in read_csv("experience_rows.csv"):
        end = row["end_date"].strip() if row["end_date"] else None
        if end == "":
            end = None
        content["experience"].append(
            {
                "id": row["id"],
                "company": row["company"],
                "role": row["role"],
                "location": row["location"],
                "location_type": row["location_type"],
                "contract_type": row["contract_type"],
                "start_date": row["start_date"],
                "end_date": end,
                "description": row["description"],
                "tech_tags": parse_json_field(row["tech_tags"]),
                "logo_url": to_nullable_str(row["logo_url"]),
                "company_url": to_nullable_str(row["company_url"]),
                "sort_order": to_int(row["sort_order"]),
            }
        )

    for row in read_csv("projects_rows.csv"):
        content["projects"].append(
            {
                "id": row["id"],
                "title": row["title"],
                "slug": row["slug"],
                "description": row["description"],
                "summary": row["summary"],
                "cover_url": to_nullable_str(row["cover_url"]),
                "tech_tags": parse_json_field(row["tech_tags"]),
                "role": row["role"],
                "type": row["type"],
                "github_url": to_nullable_str(row["github_url"]),
                "live_url": to_nullable_str(row["live_url"]),
                "playstore_url": to_nullable_str(row["playstore_url"]),
                "appstore_url": to_nullable_str(row["appstore_url"]),
                "is_featured": to_bool(row["is_featured"]),
                "sort_order": to_int(row["sort_order"]),
            }
        )

    for row in read_csv("skills_rows.csv"):
        content["skills"].append(
            {
                "id": row["id"],
                "name": row["name"],
                "category": row["category"],
                "proficiency": to_int(row["proficiency"]),
                "icon": to_nullable_str(row["icon"]),
                "years": to_int(row["years"]),
                "sort_order": to_int(row["sort_order"]),
            }
        )

    for row in read_csv("testimonials_rows.csv"):
        content["testimonials"].append(
            {
                "id": row["id"],
                "quote": row["quote"],
                "author_name": row["author_name"],
                "author_title": row["author_title"],
                "company": row["company"],
                "avatar_url": to_nullable_str(row["avatar_url"]),
                "sort_order": to_int(row["sort_order"]),
            }
        )

    for row in read_csv("media_rows.csv"):
        content["media"].append(
            {
                "id": row["id"],
                "filename": row["filename"],
                "url": row["url"],
                "alt_text": to_nullable_str(row["alt_text"]),
                "size": to_int(row["size"]),
                "mime_type": row["mime_type"],
                "uploaded_at": normalize_timestamp(row["uploaded_at"]),
            }
        )

    for key in ("experience", "projects", "testimonials"):
        content[key].sort(key=lambda r: r["sort_order"])
    content["skills"].sort(key=lambda r: (r["category"], r["sort_order"]))

    OUT_PATH.write_text(json.dumps(content, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({len(content['experience'])} experience rows)")


if __name__ == "__main__":
    main()
