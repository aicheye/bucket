
import { getCategoryColor } from "../app/contexts/CourseContext";
import { utcToLocalDate } from "./date-utils";
import { Course, Item, ScheduleItem, TimeObject } from "./types";

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'class' | 'deliverable';
  date: Date;
  startTime?: TimeObject;
  endTime?: TimeObject;
  color: string;
  courseCode: string;
  data?: any;
}

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function getMonthDays(year: number, month: number): Date[] {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  
  // Add padding days from previous month to start on Sunday
  const firstDay = date.getDay();
  for (let i = firstDay; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    days.push(d);
  }

  // Add days of current month
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  // Add padding days for next month to complete the grid (optional, but good for UI)
  const lastDay = days[days.length - 1];
  const remaining = 6 - lastDay.getDay();
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(lastDay);
    d.setDate(lastDay.getDate() + i);
    days.push(d);
  }

  return days;
}

export function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay()); // Start on Sunday
  start.setHours(0, 0, 0, 0);
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function parseTime(time: string | TimeObject): TimeObject {
  if (typeof time === 'object') return time;
  if (!time) return { hours: 0, minutes: 0 };
  
  // Handle "HH:MM" or "HH:MM AM/PM"
  const [timePart, modifier] = time.split(' ');
  let [h, m] = timePart.split(':').map(Number);
  
  if (modifier) {
    if (modifier.toLowerCase() === 'pm' && h < 12) h += 12;
    if (modifier.toLowerCase() === 'am' && h === 12) h = 0;
  }
  
  if (isNaN(h)) h = 0;
  if (isNaN(m)) m = 0;

  return { hours: h, minutes: m };
}

export function formatTime(time: TimeObject): string {
  const h = time.hours % 12 || 12;
  const m = time.minutes.toString().padStart(2, '0');
  const ampm = time.hours >= 12 ? 'PM' : 'AM';
  return `${h}:${m} ${ampm}`;
}

function getDayIndex(day: string): number {
  const d = day.toLowerCase();
  if (d.startsWith("su")) return 0;
  if (d.startsWith("mo")) return 1;
  if (d.startsWith("tu")) return 2;
  if (d.startsWith("we")) return 3;
  if (d.startsWith("th")) return 4;
  if (d.startsWith("fr")) return 5;
  if (d.startsWith("sa")) return 6;
  return -1;
}

export function getEventsForDateRange(
  courses: Course[],
  items: Item[],
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // Normalize range to start of day / end of day
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Process Items (Deliverables)
  items.forEach(item => {
    if (item.data.due_date) {
      const dueDate = utcToLocalDate(item.data.due_date);
      // Check if within range
      if (dueDate >= start && dueDate <= end) {
        const course = courses.find(c => c.id === item.course_id);
        events.push({
          id: item.id,
          title: item.data.name,
          type: 'deliverable',
          date: dueDate,
          color: getCategoryColor(item.data.type, [item.data.type]), 
          courseCode: course?.code || 'Unknown',
          data: item
        });
      }
    }
  });

  // Process Courses (Schedule)
  courses.forEach(course => {
    const schedule = course.data["schedule-info"];
    if (schedule) {
      schedule.forEach((item: ScheduleItem, itemIndex: number) => {
        // Filter by section
        if (course.sections && item.Component && item.Section) {
           const enrolledSection = course.sections[item.Component];
           if (enrolledSection && enrolledSection !== item.Section) {
             return;
           }
        }

        const tStart = parseTime(item["Start Time"]);
        const tEnd = parseTime(item["End Time"]);
        
        // Clone to avoid mutating the original course data
        const startTime = { ...tStart };
        const endTime = { ...tEnd };

        // Heuristic: If class starts before 7 AM, assume it's PM (parsing error)
        if (startTime.hours < 7) startTime.hours += 12;
        if (endTime.hours < 7) endTime.hours += 12;
        // Also fix if end time is before start time (e.g. 11 AM - 1 PM parsed as 1 AM)
        if (endTime.hours < startTime.hours) endTime.hours += 12;

        // Use Meet Dates if available. Meet Dates may be stored as:
        // - date-only strings 'YYYY-MM-DD' (preferred), or
        // - ISO datetimes produced by Date.toISOString() (legacy). Handle both.
        if (item["Meet Dates"] && Array.isArray(item["Meet Dates"]) && item["Meet Dates"].length > 0) {
           item["Meet Dates"].forEach((dateStr: string | Date) => {
             if (!dateStr) return;

             let date: Date;

             if (typeof dateStr === 'string') {
               // YYYY-MM-DD -> construct local-midnight Date
               const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
               if (dateOnlyMatch) {
                 const parts = dateStr.split('-').map(Number);
                 date = new Date(parts[0], parts[1] - 1, parts[2]);
               } else {
                 // ISO datetime string: interpret as UTC date and convert to local date
                 const parsed = new Date(dateStr);
                 if (isNaN(parsed.getTime())) return;
                 date = new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
               }
             } else {
               date = new Date(dateStr);
             }

             if (isNaN(date.getTime())) return;

             if (date >= start && date <= end) {
               events.push({
                 id: `${course.id}-${item.Component}-${item.Section}-${date.toISOString()}-${itemIndex}`,
                 title: `${course.code || 'Unknown'} ${item.Component}`,
                 type: 'class',
                 date: date,
                 startTime: startTime,
                 endTime: endTime,
                 color: 'bg-base-300',
                 courseCode: course.code || 'Unknown',
                 data: item
               });
             }
           });
        } else if (item["Days of Week"]) {
           // Fallback to Days of Week logic
           const daysIndices = item["Days of Week"].map(getDayIndex).filter(i => i !== -1);
           
           const current = new Date(start);
           while (current <= end) {
             if (daysIndices.includes(current.getDay())) {
               events.push({
                 id: `${course.id}-${item.Component}-${item.Section}-${current.toISOString()}-${itemIndex}`,
                 title: `${course.code || 'Unknown'} ${item.Component}`,
                 type: 'class',
                 date: new Date(current),
                 startTime: startTime,
                 endTime: endTime,
                 color: 'bg-base-300',
                 courseCode: course.code || 'Unknown',
                 data: item
               });
             }
             current.setDate(current.getDate() + 1);
           }
        }
      });
    }
  });

  return events;
}
