#!/usr/bin/env python3
"""
Read an HTML file path from argv[1], parse headings (h1..h6) into a lightweight outline
and print a JSON array to stdout. Imports langchain to ensure the environment has it available.

This script is intentionally minimal: it will not call any LLMs, it only ensures the
`langchain` package can be imported and then performs deterministic HTML parsing.
"""
import json
import sys
from pathlib import Path

try:
    # Ensure langchain is available. We don't require an API key here; importing is enough
    # to verify the dependency is installed for the environment where this script runs.
    import langchain  # noqa: F401
except Exception as e:
    print(json.dumps({"error": "langchain import failed", "detail": str(e)}))
    sys.exit(2)

try:
    from bs4 import BeautifulSoup
except Exception as e:
    print(json.dumps({"error": "bs4 import failed", "detail": str(e)}))
    sys.exit(2)


def parse_headings(html_text: str):
    soup = BeautifulSoup(html_text, "lxml")
    outline = []
    for level in range(1, 7):
        for tag in soup.find_all(f"h{level}"):
            text = tag.get_text(strip=True)
            outline.append({"level": level, "text": text})
    return outline


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing file path argument"}))
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(json.dumps({"error": "file not found", "path": str(path)}))
        sys.exit(1)

    try:
        html = path.read_text(encoding="utf-8")
    except Exception as e:
        print(json.dumps({"error": "could not read file", "detail": str(e)}))
        sys.exit(1)

    outline = parse_headings(html)

    # Print a stable JSON structure to stdout for the Node server to consume
    print(json.dumps({"outline": outline}, ensure_ascii=False))


if __name__ == "__main__":
    main()
