"""
Fishgold Sector Intelligence Scanner
Scans Israeli third-sector news sources daily and builds a knowledge base.
Sources: migzar3, shatil, maala, globes social, themarker, sfi, guidestar
"""

import json
import os
import re
import sys
import time
from datetime import datetime, date
from urllib.parse import urljoin

import requests
from supabase import create_client

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = "https://touqczopfjxcpmbxzdjr.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
}

# Sources to scan — each has a URL, a method to extract articles, and metadata
SOURCES = [
    {
        "name": "migzar3",
        "label": "מגזר 3",
        "url": "https://www.migzar3.co.il",
        "category_hint": "nonprofit",
    },
    {
        "name": "shatil_grants",
        "label": "שתיל — קולות קוראים",
        "url": "https://www.shatil.org.il/grants",
        "category_hint": "grant",
    },
    {
        "name": "maala",
        "label": "מעלה — CSR",
        "url": "https://www.maala.org.il/he/news/",
        "category_hint": "donation",
    },
    {
        "name": "globes_social",
        "label": "גלובס — אחריות תאגידית",
        "url": "https://www.globes.co.il/news/tag/%D7%90%D7%97%D7%A8%D7%99%D7%95%D7%AA%20%D7%AA%D7%90%D7%92%D7%99%D7%93%D7%99%D7%AA",
        "category_hint": "donation",
    },
    {
        "name": "sfi",
        "label": "Social Finance Israel",
        "url": "https://www.sfi.org.il/blog",
        "category_hint": "startup",
    },
    {
        "name": "kolzchut",
        "label": "כל זכות — זכויות וגופי סיוע",
        "url": "https://www.kolzchut.org.il/he/%D7%A2%D7%9E%D7%95%D7%93_%D7%A8%D7%90%D7%A9%D7%99",
        "category_hint": "policy",
    },
    {
        "name": "guidestar",
        "label": "GuideStar Israel",
        "url": "https://www.guidestar.org.il/blog",
        "category_hint": "nonprofit",
    },
    {
        "name": "themarker_social",
        "label": "TheMarker — חברה",
        "url": "https://www.themarker.com/labels/social",
        "category_hint": "trend",
    },
    {
        "name": "mr_gov",
        "label": "מכרזים ממשלתיים",
        "url": "https://mr.gov.il/ilgov/he/Ede_SearchMichraz.aspx",
        "category_hint": "grant",
    },
    {
        "name": "haaretz_social",
        "label": "הארץ — חברתי",
        "url": "https://www.haaretz.co.il/labels/social",
        "category_hint": "trend",
    },
]


def strip_html(html: str) -> str:
    """Remove HTML tags and clean up text."""
    text = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", "", text, flags=re.I)
    text = re.sub(r"<nav[\s\S]*?</nav>", "", text, flags=re.I)
    text = re.sub(r"<footer[\s\S]*?</footer>", "", text, flags=re.I)
    text = re.sub(r"<header[\s\S]*?</header>", "", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_links(html: str, base_url: str) -> list[dict]:
    """Extract article links from HTML page."""
    links = []
    # Match <a href="...">title</a> patterns
    pattern = r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>'
    for match in re.finditer(pattern, html, re.DOTALL | re.IGNORECASE):
        href = match.group(1)
        title = strip_html(match.group(2)).strip()

        if not title or len(title) < 10 or len(title) > 200:
            continue

        # Skip navigation/footer links
        skip_words = ["צור קשר", "אודות", "תנאי שימוש", "מדיניות", "כניסה", "הרשמה", "חיפוש"]
        if any(w in title for w in skip_words):
            continue

        # Build absolute URL
        if href.startswith("http"):
            url = href
        elif href.startswith("/"):
            url = urljoin(base_url, href)
        else:
            continue

        links.append({"url": url, "title": title})

    # Deduplicate by URL
    seen = set()
    unique = []
    for link in links:
        if link["url"] not in seen:
            seen.add(link["url"])
            unique.append(link)

    return unique[:20]  # Max 20 per source


def fetch_page(url: str, timeout: int = 15) -> str | None:
    """Fetch a web page and return its HTML."""
    try:
        res = requests.get(url, headers=HEADERS, timeout=timeout)
        res.raise_for_status()
        return res.text
    except Exception as e:
        print(f"  [!] Failed to fetch {url}: {e}")
        return None


def analyze_with_ai(items: list[dict], source_label: str) -> list[dict]:
    """Use Claude to analyze and classify scraped items."""
    if not ANTHROPIC_KEY or not items:
        return items

    # Build content for AI analysis
    items_text = "\n".join(
        f"{i+1}. [{item['title']}]({item['url']})\n{item.get('snippet', '')[:300]}"
        for i, item in enumerate(items[:15])
    )

    try:
        res = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 3000,
                "system": """אתה מנתח חדשות מגזר שלישי ישראלי. עבור כל פריט, החזר JSON:
[{
  "index": 1,
  "category": "donation|grant|startup|exit|policy|trend|nonprofit|competition",
  "summary": "סיכום של 1-2 משפטים בעברית",
  "entities": [{"name": "שם", "type": "org|person|company|fund", "role": "תורם|מקבל|שותף"}],
  "tags": ["תג1", "תג2"],
  "relevance_score": 70,
  "skip": false
}]

כללים:
- relevance_score: 1-100 כמה רלוונטי לגיוס משאבים של עמותות
- skip=true אם זה לא רלוונטי בכלל (פרסומת, ניווט, תוכן ריק)
- entities: חלץ שמות של ארגונים, אנשים, חברות, קרנות שמוזכרים
- tags: 3-5 תגיות לחיפוש (בעברית)
- category: הקטגוריה הכי מתאימה
החזר JSON בלבד, בלי טקסט נוסף.""",
                "messages": [
                    {
                        "role": "user",
                        "content": f"מקור: {source_label}\n\nפריטים:\n{items_text}",
                    }
                ],
            },
            timeout=30,
        )
        res.raise_for_status()
        data = res.json()
        raw = data["content"][0]["text"]

        # Parse JSON from response
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
        parsed = json.loads(json_match.group(1) if json_match else raw)

        # Merge AI analysis back into items
        for analysis in parsed:
            idx = analysis.get("index", 0) - 1
            if 0 <= idx < len(items) and not analysis.get("skip", False):
                items[idx]["category"] = analysis.get("category", "other")
                items[idx]["summary"] = analysis.get("summary", "")
                items[idx]["entities"] = analysis.get("entities", [])
                items[idx]["tags"] = analysis.get("tags", [])
                items[idx]["relevance_score"] = analysis.get("relevance_score", 50)
                items[idx]["analyzed"] = True

        return items

    except Exception as e:
        print(f"  [!] AI analysis failed: {e}")
        return items


def scan_source(source: dict) -> list[dict]:
    """Scan a single source and return items."""
    print(f"\n>> Scanning: {source['label']} ({source['url']})")

    html = fetch_page(source["url"])
    if not html:
        return []

    # Extract links from the page
    links = extract_links(html, source["url"])
    print(f"   Found {len(links)} links")

    if not links:
        # If no links found, treat the whole page as one item
        text = strip_html(html)
        if len(text) > 100:
            links = [{"url": source["url"], "title": source["label"], "snippet": text[:500]}]

    # Fetch snippets for each link (first 500 chars)
    for link in links[:10]:  # Limit to 10 to avoid rate limiting
        if link["url"] == source["url"]:
            continue
        page = fetch_page(link["url"])
        if page:
            link["snippet"] = strip_html(page)[:500]
            link["raw_content"] = strip_html(page)[:5000]
        time.sleep(0.5)  # Be nice to servers

    # AI analysis
    items = analyze_with_ai(links, source["label"])

    # Filter out skipped/unanalyzed items
    results = []
    for item in items:
        if item.get("analyzed") and item.get("relevance_score", 0) >= 30:
            results.append({
                "source": source["name"],
                "source_url": item["url"],
                "title": item["title"],
                "summary": item.get("summary", ""),
                "category": item.get("category", source["category_hint"]),
                "entities": item.get("entities", []),
                "tags": item.get("tags", []),
                "relevance_score": item.get("relevance_score", 50),
                "raw_content": item.get("raw_content", item.get("snippet", "")),
                "scan_date": date.today().isoformat(),
            })

    print(f"   Kept {len(results)} relevant items")
    return results


def save_to_supabase(items: list[dict]):
    """Save scanned items to Supabase."""
    if not SUPABASE_KEY:
        print("[!] No SUPABASE_ANON_KEY — saving to local JSON instead")
        with open("scanner/sector_scan_results.json", "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        return

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    saved = 0
    skipped = 0

    for item in items:
        # Check if we already have this URL
        existing = (
            sb.table("sector_intelligence")
            .select("id")
            .eq("source_url", item["source_url"])
            .execute()
        )

        if existing.data:
            skipped += 1
            continue

        sb.table("sector_intelligence").insert({
            "source": item["source"],
            "source_url": item["source_url"],
            "title": item["title"],
            "summary": item.get("summary"),
            "category": item.get("category"),
            "entities": json.dumps(item.get("entities", []), ensure_ascii=False),
            "tags": item.get("tags", []),
            "relevance_score": item.get("relevance_score", 50),
            "raw_content": item.get("raw_content"),
            "scan_date": item.get("scan_date", date.today().isoformat()),
        }).execute()
        saved += 1

    print(f"\n>> Saved {saved} new items, skipped {skipped} duplicates")


def generate_daily_digest(items: list[dict]) -> str | None:
    """Generate an AI summary of today's scan for the knowledge base."""
    if not ANTHROPIC_KEY or not items:
        return None

    items_text = "\n".join(
        f"- [{item['category']}] {item['title']}: {item.get('summary', '')}"
        for item in sorted(items, key=lambda x: x.get("relevance_score", 0), reverse=True)[:20]
    )

    try:
        res = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1000,
                "system": """אתה כותב סיכום יומי למנהל גיוס משאבים בעמותה ישראלית.
כתוב סיכום קצר וחד של החדשות החשובות מהמגזר השלישי היום.
פורמט: 3-5 נקודות עיקריות, כל אחת 1-2 משפטים.
התמקד: קולות קוראים חדשים, תרומות גדולות, מגמות, שינויי מדיניות, הזדמנויות.
כתוב בעברית, סגנון מקצועי-ידידותי.""",
                "messages": [
                    {
                        "role": "user",
                        "content": f"סריקה מ-{date.today().isoformat()}:\n{items_text}",
                    }
                ],
            },
            timeout=30,
        )
        res.raise_for_status()
        data = res.json()
        return data["content"][0]["text"]
    except Exception as e:
        print(f"[!] Digest generation failed: {e}")
        return None


def save_daily_digest(digest: str):
    """Save daily digest to sector_knowledge."""
    if not SUPABASE_KEY or not digest:
        return

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    today = date.today().isoformat()

    # Upsert today's digest
    sb.table("sector_knowledge").upsert({
        "topic": f"daily_digest_{today}",
        "content": digest,
        "source": "sector_scanner",
        "last_updated": datetime.now().isoformat(),
        "metadata": json.dumps({"date": today, "type": "daily_digest"}, ensure_ascii=False),
    }, on_conflict="topic").execute()

    print(f">> Daily digest saved for {today}")


def main():
    print(f"=== Fishgold Sector Scanner — {date.today().isoformat()} ===\n")

    if not ANTHROPIC_KEY:
        print("[!] Warning: ANTHROPIC_API_KEY not set — scanning without AI analysis")

    all_items = []

    for source in SOURCES:
        try:
            items = scan_source(source)
            all_items.extend(items)
        except Exception as e:
            print(f"  [!] Error scanning {source['name']}: {e}")
        time.sleep(1)  # Rate limit between sources

    print(f"\n=== Total: {len(all_items)} items from {len(SOURCES)} sources ===")

    # Save to Supabase
    save_to_supabase(all_items)

    # Generate and save daily digest
    digest = generate_daily_digest(all_items)
    if digest:
        print(f"\n>> Daily Digest:\n{digest}")
        save_daily_digest(digest)

    print("\n=== Scan complete ===")


if __name__ == "__main__":
    main()
