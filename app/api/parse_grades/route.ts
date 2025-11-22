import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import authOptions from "../../../lib/nextauth";

interface ParsedItem {
  name: string;
  category: string;
  grade: number;
  max: number;
  type: string;
}

export function parse_grades(text: string): ParsedItem[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const items: ParsedItem[] = [];
  let currentCategory = "Uncategorized";

  // Find start
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Grade Item") && lines[i].includes("Points")) {
      startIndex = i + 1;
      break;
    }
  }

  // Pre-scan for weights to determine the file format
  // If we see Points (X / Y) followed immediately by another X / Y, it implies the file has Weight columns.
  let hasWeights = false;
  for (let i = startIndex; i < lines.length - 1; i++) {
    if (
      lines[i].match(/^[\d\.]+\s*\/\s*[\d\.]+$/) &&
      lines[i + 1].match(/^[\d\.]+\s*\/\s*[\d\.]+$/)
    ) {
      hasWeights = true;
      break;
    }
  }

  let i = startIndex;
  while (i < lines.length) {
    // Assume lines[i] is the Name
    const name = lines[i].replace(/View statistics for .*$/, "").trim();

    if (name === "View Quiz Attempts") {
      i++;
      continue;
    }

    // Look ahead
    const j = i + 1;
    if (j >= lines.length) break;

    // Check if lines[j] is Points "X / Y"
    if (lines[j].match(/^[\d\.]+\s*\/\s*[\d\.]+$/)) {
      const pointsStr = lines[j];
      const [grade, max] = pointsStr
        .split("/")
        .map((s) => parseFloat(s.trim()));

      // Check next line for Weight
      let k = j + 1;
      let hasWeightHere = false;
      if (k < lines.length && lines[k].match(/^[\d\.]+\s*\/\s*[\d\.]+$/)) {
        hasWeightHere = true;
        k++; // Consume weight
      }

      // Check next line for Percentage
      if (
        k < lines.length &&
        (lines[k].match(/^[\d\.]+\s*%\s*$/) || lines[k].match(/^-\s*%\s*$/))
      ) {
        k++; // Consume percentage
      }

      if (hasWeightHere) {
        // It has explicit weight, so it's an item
        items.push({
          name: name,
          category: currentCategory,
          grade: grade,
          max: max,
          type: "Item",
        });
      } else {
        // No weight found for this entry
        if (hasWeights) {
          // If the file generally has weights, but this entry doesn't, it's likely a Category summary
          currentCategory = name;
        } else {
          // If the file doesn't have weights (or at least we didn't detect them), then this is an Item

          // Special handling for major exams to ensure they don't get merged into previous categories
          const lowerName = name.toLowerCase();
          if (
            lowerName.includes("midterm") ||
            lowerName.includes("final") ||
            lowerName.includes("exam")
          ) {
            currentCategory = name;
          }

          items.push({
            name: name,
            category: currentCategory,
            grade: grade,
            max: max,
            type: "Item",
          });
        }
      }

      i = k; // Continue from after the consumed lines
      continue;
    }

    // Check if lines[j] is Percentage (without Points)
    // This usually indicates a Category in files that don't show points for categories
    if (lines[j].match(/^[\d\.]+\s*%\s*$/) || lines[j].match(/^-\s*%\s*$/)) {
      currentCategory = name;
      i = j + 1;
      continue;
    }

    // Check if lines[j] is likely an Item (followed by Points), which implies lines[i] is a Category
    if (
      j + 1 < lines.length &&
      lines[j + 1].match(/^[\d\.]+\s*\/\s*[\d\.]+$/)
    ) {
      currentCategory = name;
      i = j; // Move to the item line, so it gets processed in the next iteration
      continue;
    }

    // If neither, skip this line (it might be a category with no data, or just noise)
    i++;
  }
  return items;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.text) {
      return NextResponse.json(
        { error: "Missing text field" },
        { status: 400 },
      );
    }

    const items = parse_grades(body.text);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error processing request:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal Server Error: ${errorMessage}` },
      { status: 500 },
    );
  }
}
