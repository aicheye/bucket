import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { formatDateParam } from "../../../lib/date-utils";
import { logger } from "../../../lib/logger";
import authOptions from "../../../lib/nextauth";

async function parse_html(content: string) {
  const { JSDOM } = await import("jsdom");
  const doc = new JSDOM(content).window.document;

  const code: string =
    doc.getElementsByClassName("outline-courses")[0]?.textContent.trim() ||
    "Unknown Code";
  const term: string =
    doc.getElementsByClassName("outline-term")[0]?.textContent.trim() ||
    "Unknown Term";

  const data = {};

  data["description"] =
    doc.getElementsByClassName("outline-title-full")[0]?.textContent.trim() ||
    "Unknown Description";

  const firstAnchor = doc.getElementsByTagName("a")[0];
  if (firstAnchor) {
    data["outline_url"] = firstAnchor.getAttribute("href");
  }

  const tables = doc.getElementsByTagName("table");

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const headers = table
      .getElementsByTagName("thead")[0]
      ?.getElementsByTagName("th");

    if (!headers) continue;

    let sectionType =
      tables[i].className.trim() ||
      tables[i].parentElement?.className.trim() ||
      `section_${i}`;

    if (headers[0]?.textContent.trim() === "Component / Activity") {
      data["marking-schemes"] = [];
      sectionType = "marking-scheme";
    }

    if (sectionType === "multitable") {
      continue;
    }

    const temp = [];

    const rows = table.getElementsByTagName("tr");
    let rowspans: { col: number; rowspan: number; cell: HTMLElement }[] = [];
    for (let j = 1; j < rows.length; j++) {
      const row = rows[j];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rowData: { [key: string]: any } = {};

      const rowHeaders = Array.from(row.getElementsByTagName("th"));
      const cells: HTMLElement[] = Array.from(row.getElementsByTagName("td"));

      cells.unshift(...rowHeaders);

      // Handle rowspan from previous rows
      for (const rs of rowspans) {
        if (rs.rowspan > 1) {
          cells.splice(rs.col, 0, rs.cell);
          rs.rowspan -= 1;
        }
      }

      for (let k = 0; k < cells.length; k++) {
        const cell = cells[k];

        if (cell.hasAttribute("rowspan")) {
          let dup: boolean = false;
          for (const rs of rowspans) {
            if (rs.col === k) dup = true;
          }
          if (!dup)
            rowspans.push({
              col: k,
              rowspan: parseInt(cell.getAttribute("rowspan") || "1", 10),
              cell,
            });
        }

        const header = headers[k]?.textContent.trim() || `column_${k}`;

        if (sectionType === "schedule-info") {
          if (header === "Course") {
            const sectionEl = cell.getElementsByClassName("section")[0];
            const classTypeEl = cell.getElementsByClassName("class-type")[0];

            rowData["Section"] = sectionEl
              ? sectionEl.textContent.split(" ")[0].trim()
              : "Unknown Section";
            rowData["Component"] = classTypeEl
              ? classTypeEl.textContent.replace(/\]|\[/g, "").trim()
              : "Unknown Component";
            continue;
          } else if (header === "Meet Days") {
            rowData["Meet Dates"] = [];
            rowData["Days of Week"] = [];
            const year = parseInt(term.split(" ")[1], 10);
            const daysOfWeek = [
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ];
            const months = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];

            const daysVisualEl = cell.getElementsByClassName("days-visual")[0];
            if (!daysVisualEl) continue;

            const days = daysVisualEl.textContent
              .replace(/\s+/g, "")
              .split(",");
            const daysActive = [];

            for (const day of days) {
              rowData["Days of Week"].push(day.substring(0, 3));
              daysActive.push(daysOfWeek.indexOf(day.substring(0, 3)));
            }

            if (daysActive.length === 0) {
              // If no days are active, skip processing dates
              continue;
            }

            const dateRangeEl = cell.getElementsByClassName("date-range")[0];
            if (!dateRangeEl) continue;

            const dateRanges = dateRangeEl.children;

            for (const range of dateRanges) {
              const startEnd = range.textContent.split(" - ");

              const start = startEnd[0].split(" ");
              const currentDate = new Date(
                year,
                months.indexOf(start[0]),
                parseInt(start[1], 10),
              );

              if (startEnd.length == 1) {
                // Store date-only strings to avoid timezone shifts when serializing
                rowData["Meet Dates"].push(formatDateParam(currentDate));
                continue;
              }

              const end = startEnd[1].split(" ");
              const endDate = new Date(
                year,
                months.indexOf(end[0]),
                parseInt(end[1], 10),
              );

              while (currentDate <= endDate) {
                if (daysActive.includes(currentDate.getDay())) {
                  // Store date-only strings to avoid timezone shifts when serializing
                  rowData["Meet Dates"].push(formatDateParam(currentDate));
                }
                currentDate.setDate(currentDate.getDate() + 1);
              }
            }

            continue;
          } else if (header === "Meet Time") {
            const timeText = cell.textContent.replace(/\s+/g, " ").trim();
            if (timeText === "TBA" || timeText === "ARR") {
              rowData["Start Time"] = timeText;
              rowData["End Time"] = timeText;
            } else {
              const times = timeText.split(" - ");
              const startStr = times[0].trim();
              const endStr = times[1]?.trim() || startStr;

              const sParts = startStr.split(":");
              let sH = parseInt(sParts[0], 10);
              const sM = parseInt(sParts[1]?.substring(0, 2) || "0", 10);

              const eParts = endStr.split(":");
              let eH = parseInt(eParts[0], 10);
              const eM = parseInt(eParts[1]?.substring(0, 2) || "0", 10);

              const sAm = startStr.toLowerCase().includes("am");
              const sPm = startStr.toLowerCase().includes("pm");
              const eAm = endStr.toLowerCase().includes("am");
              const ePm = endStr.toLowerCase().includes("pm");

              if (sH === 12) sH = 0;
              if (eH === 12) eH = 0;

              // Apply explicit AM/PM
              if (sPm) sH += 12;
              if (ePm) eH += 12;

              // Infer missing AM/PM
              if (!sAm && !sPm) {
                // If end is PM, and start < 7, assume PM (e.g. 2:30 - 3:30 PM)
                if (ePm && sH < 7) sH += 12;
                // General heuristic: classes don't start before 7 AM usually
                else if (sH < 7) sH += 12;
              }

              if (!eAm && !ePm) {
                if (eH < 7) eH += 12;
                // If end is earlier than start, assume it wraps to PM (e.g. 11 - 1)
                if (eH < sH) eH += 12;
              }

              rowData["Start Time"] = { hours: sH, minutes: sM };
              rowData["End Time"] = { hours: eH, minutes: eM };
            }

            continue;
          } else if (header === "Instructor(s)") {
            rowData["Instructors"] = [];

            for (const instructor of cell.getElementsByClassName(
              "instructor-info",
            )) {
              rowData["Instructors"].push({
                Name:
                  instructor
                    .getElementsByTagName("span")[0]
                    ?.textContent.trim() || "Unknown Name",
                Email:
                  instructor.getElementsByTagName("a")[0]?.textContent.trim() ||
                  "Unknown Email",
              });
            }

            continue;
          }
        } else if (sectionType === "marking-scheme") {
          if (header === "Weight (%)") {
            rowData["Weight"] = cell.textContent.replace(/%/, "").trim();
            continue;
          } else if (header === "Component / Activity") {
            rowData["Component"] = cell.textContent.trim();
            continue;
          } else {
            continue;
          }
        }

        rowData[header] = cell.textContent.replace(/\s+/g, " ").trim();
      }

      rowspans = rowspans.filter((rs) => rs.rowspan > 1);

      temp.push(rowData);
    }

    if (sectionType === "marking-scheme") {
      data["marking-schemes"].push(temp);
      continue;
    }

    data[sectionType] = temp;
  }

  return { code, term, data };
}

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}

export async function POST(request: Request) {
  try {
    // Optional: block if not signed in
    const session = await getServerSession(authOptions);
    if (!session) {
      logger.warn("Unauthorized parse_outline request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const data = await parse_html(body.html_text);
    logger.info("Parsed outline successfully", {
      userId: session.user?.id,
      courseCode: data.code,
    });

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error processing parse_outline request:", { error });
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal Server Error: ${errorMessage}` },
      { status: 500 },
    );
  }
}
