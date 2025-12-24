import fs from "fs";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import os from "os";
import path from "path";
import PDFParser from "pdf2json";
import { logger } from "../../../lib/logger";
import authOptions from "../../../lib/nextauth";

interface ParsedCourse {
  code: string;
  credits: number;
  grade: string | null;
  term: string;
  title: string;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      logger.warn("Unauthorized parse_transcript request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write to temp file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(
      tempDir,
      `upload-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`,
    );
    fs.writeFileSync(tempFilePath, buffer);

    let text = "";
    try {
      text = await new Promise<string>((resolve, reject) => {
        const pdfParser = new PDFParser(this, true); // true for raw text
        pdfParser.on("pdfParser_dataError", (errData: any) =>
          reject(errData.parserError),
        );
        pdfParser.on("pdfParser_dataReady", () => {
          resolve(pdfParser.getRawTextContent());
        });
        pdfParser.loadPDF(tempFilePath);
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    const courses: ParsedCourse[] = [];
    const lines = text.split("\n");

    let currentTerm = "";
    const termRegex = /^\s*(Fall|Winter|Spring)\s+(\d{4})\s*$/;

    // Updated regex to handle pdf2json's liberal spacing
    // We expect Subject (A-Z) Space(s) Number Space(s) Title Space(s) Attempted Space(s) Earned Space(s) Grade(opt)
    // The previous regex works because \s+ handles multiple spaces.
    // We make Earned and Attempted optional for in-progress courses.
    // Format can be: SUBJECT NUMBER TITLE [ATTEMPTED [EARNED [GRADE]]]
    const courseRegex =
      /^([A-Z]+)\s+([A-Z0-9]+)\s+(.+?)(?:\s+(\d+\.\d{2})(?:\s+(\d+\.\d{2}))?(?:\s+(.*))?)?$/;

    for (const line of lines) {
      const trimmed = line.trim();

      const termMatch = trimmed.match(termRegex);
      if (termMatch) {
        currentTerm = `${termMatch[1]} ${termMatch[2]}`;
        continue;
      }

      if (
        trimmed.startsWith("Course") ||
        trimmed.startsWith("Program") ||
        trimmed.startsWith("Level")
      )
        continue;

      const match = trimmed.match(courseRegex);
      if (match) {
        const subject = match[1];
        const number = match[2];
        const title = match[3].trim();

        // match[4] is Attempted (optional)
        // match[5] is Earned (optional)
        // match[6] is Grade (optional)

        // Only include courses that have at least attempted credits or are otherwise meaningful
        // Skip lines that are just subject + number + very short text (likely headers or noise)
        if (title.length < 5 && !match[4]) continue;

        const attempted = match[4] ? parseFloat(match[4]) : 0.5; // Default to 0.5 if not specified
        const gradeRaw = match[6] ? match[6].trim() : "";

        let grade: string | null = gradeRaw;
        // pdf2json might leave extra spaces? trim() handles it.
        // Also check if gradeRaw is just empty string
        if (grade === "") grade = null;

        courses.push({
          code: `${subject} ${number}`,
          credits: attempted,
          grade: grade,
          term: currentTerm,
          title: title,
        });
      }
    }

    logger.info("Parsed transcript successfully", {
      userId: session.user?.id,
      coursesFound: courses.length,
    });

    return NextResponse.json({ courses });
  } catch (error) {
    logger.error("Error processing parse_transcript request:", { error });
    // Safe error message
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal Server Error: ${msg}` },
      { status: 500 },
    );
  }
}
