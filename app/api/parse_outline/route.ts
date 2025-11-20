import { JSDOM } from "jsdom";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import authOptions from "../../../lib/nextauth";

function parse_html(content: string) {
  const doc = new JSDOM(content).window.document;

  const code: string = doc.getElementsByClassName("outline-courses")[0]?.textContent.trim() || "Unknown Code";
  const term: string = doc.getElementsByClassName("outline-term")[0]?.textContent.trim() || "Unknown Term";

  const data = {};

  data["description"] = doc.getElementsByClassName("outline-title-full")[0]?.textContent.trim() || "Unknown Description";

  const firstAnchor = doc.getElementsByTagName("a")[0];
  if (firstAnchor) {
    data["outline_url"] = firstAnchor.getAttribute("href");
  }

  const tables = doc.getElementsByTagName("table");

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const headers = table.getElementsByTagName("thead")[0]?.getElementsByTagName("th");

    if (!headers) continue;

    let sectionType = tables[i].className.trim() || tables[i].parentElement?.className.trim() || `section_${i}`;

    if (headers[0]?.textContent.trim() === "Component / Activity") {
      data["marking-schemes"] = [];
      sectionType = "marking-scheme";
    }

    if (sectionType === "multitable") {
      continue;
    }

    let temp = [];

    const rows = table.getElementsByTagName("tr");
    var rowspans: { col: number; rowspan: number; cell: HTMLElement }[] = [];
    for (let j = 1; j < rows.length; j++) {
      const row = rows[j];
      const rowData: { [key: string]: any } = {};

      const rowHeaders = Array.from(row.getElementsByTagName("th"));
      const cells: HTMLElement[] = Array.from(row.getElementsByTagName("td"));

      cells.unshift(...rowHeaders);

      // Handle rowspan from previous rows
      for (let rs of rowspans) {
        if (rs.rowspan > 1) {
          cells.splice(rs.col, 0, rs.cell);
          rs.rowspan -= 1;
        }
      }

      for (let k = 0; k < cells.length; k++) {
        const cell = cells[k];

        if (cell.hasAttribute("rowspan")) {
          let dup: Boolean = false;
          for (let rs of rowspans) {
            if (rs.col === k) dup = true;
          }
          if (!dup) rowspans.push({ col: k, rowspan: parseInt(cell.getAttribute("rowspan") || "1", 10), cell });
        }

        const header = headers[k]?.textContent.trim() || `column_${k}`;

        if (sectionType === "schedule-info") {
          if (header === "Course") {
            rowData["Section"] = cell.getElementsByClassName("section")[0].textContent.split(" ")[0].trim() || "Unknown Section";
            rowData["Component"] = cell.getElementsByClassName("class-type")[0].textContent.replace(/\]|\[/g, "").trim();
            continue;
          } else if (header === "Meet Days") {
            rowData["Meet Dates"] = [];
            rowData["Days of Week"] = [];
            const year = parseInt(term.split(" ")[1], 10);
            const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const days = cell.getElementsByClassName("days-visual")[0].textContent.replace(/\s+/g, "").split(",");
            let daysActive = [];

            for (let day of days) {
              rowData["Days of Week"].push(day.substring(0, 3));
              daysActive.push(daysOfWeek.indexOf(day.substring(0, 3)));
            }

            if (daysActive.length === 0) {
              // If no days are active, skip processing dates
              continue;
            }

            const dateRanges = cell.getElementsByClassName("date-range")[0].children;

            for (let range of dateRanges) {
              const startEnd = range.textContent.split(" - ");

              const start = startEnd[0].split(" ");
              const currentDate = new Date(year, months.indexOf(start[0]), parseInt(start[1], 10));

              if (startEnd.length == 1) {
                rowData["Meet Dates"].push(new Date(currentDate));
                continue;
              }

              const end = startEnd[1].split(" ");
              const endDate = new Date(year, months.indexOf(end[0]), parseInt(end[1], 10));

              while (currentDate <= endDate) {
                if (daysActive.includes(currentDate.getDay())) {
                  rowData["Meet Dates"].push(new Date(currentDate));
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

              const startTime: string[] = times[0].trim().split(":");
              const startAM: boolean = times[0].trim().toLowerCase().includes("am") || (!times[0].trim().toLowerCase().includes("pm") && parseInt(startTime[0], 10) < 12);

              const endTime: string[] = (times[1]?.trim() || times[0].trim()).split(":");
              const endAM: boolean = times[1]?.trim().toLowerCase().includes("am") || (!times[1]?.trim().toLowerCase().includes("pm") && parseInt(endTime[0], 10) < 12);

              rowData["Start Time"] = {
                hours: parseInt(startTime[0], 10) + (startAM ? 0 : 12),
                minutes: parseInt(startTime[1].substring(0, 2), 10) || 0,
              };
              rowData["End Time"] = {
                hours: parseInt(endTime[0], 10) + (endAM ? 0 : 12),
                minutes: parseInt(endTime[1].substring(0, 2), 10) || 0,
              };
            }

            continue;
          } else if (header === "Instructor(s)") {
            rowData["Instructors"] = [];

            for (let instructor of cell.getElementsByClassName("instructor-info")) {
              rowData["Instructors"].push({
                Name: instructor.getElementsByTagName("span")[0]?.textContent.trim() || "Unknown Name",
                Email: instructor.getElementsByTagName("a")[0]?.textContent.trim() || "Unknown Email",
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
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    const data = parse_html(body.html_text);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
