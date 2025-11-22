export function formatTime(time: { hours: number; minutes: number } | string) {
  if (!time) return "";
  if (typeof time === "string") return time;

  console.log("Formatting time object:", time);

  let h = time.hours;
  const m = time.minutes.toString().padStart(2, "0");

  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;

  return `${h}:${m} ${ampm}`;
}

export function formatDates(dates: string[]) {
  if (!dates || dates.length === 0) return "";
  return dates
    .map((d) => {
      const date = new Date(d);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    })
    .join(", ");
}
