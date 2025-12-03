"use client";

import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { formatTime, FULL_DAYS, getEventsForDateRange, getWeekDays, isSameDay } from "../../../../lib/calendar-utils";
import { useCourses } from "../../../contexts/CourseContext";

export function WeeklyCalendar() {
  const { courses, items } = useCourses();
  const [currentDate, setCurrentDate] = useState(new Date());

  const days = getWeekDays(currentDate);
  const events = getEventsForDateRange(courses, items, days[0], days[6]);

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const startHour = 8;
  const endHour = 22;
  const hourHeight = 60;

  const hours = [];
  for (let i = startHour; i < endHour; i++) {
    hours.push(i);
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {days[0].toLocaleDateString('default', { month: 'long', day: 'numeric' })}
          {" "}&ndash;{" "}
          {days[6].toLocaleDateString('default', { month: 'long', day: 'numeric' })}
        </h2>
        <div className="join flex items-center gap-1">
          <button
            onClick={prevWeek}
            className="join-item btn btn-sm btn-soft"
            title="Previous week"
            aria-label="Previous week"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button
            onClick={goToday}
            className="join-item btn btn-sm btn-soft"
            title="Today (click to reset)"
            aria-label="Today (click to reset)"
          >
            Today
          </button>
          <button
            onClick={nextWeek}
            className="join-item btn btn-sm btn-soft"
            title="Next week"
            aria-label="Next week"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      <div className="flex flex-col border border-base-300 rounded-lg overflow-hidden bg-base-100">
        {/* Header */}
        <div className="flex border-b border-base-300">
          <div className="w-16 flex-shrink-0 border-r border-base-300 bg-base-200"></div>
          {days.map(day => (
            <div key={day.toISOString()} className="flex-1 p-2 text-center border-r border-base-300 last:border-r-0 bg-base-200">
              <div className="font-semibold text-sm">{FULL_DAYS[day.getDay()].slice(0, 3)}</div>
              <div className={`text-sm w-6 h-6 mx-auto flex items-center justify-center ${isSameDay(day, new Date()) ? 'bg-primary text-primary-content rounded-full' : ''}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* All Day / Deliverables */}
        <div className="flex border-b border-base-300 min-h-[40px]">
          <div className="w-16 flex-shrink-0 border-r border-base-300 p-2 text-xs text-center flex items-center justify-center text-base-content/70">
            Due
          </div>
          {days.map(day => {
            const dayDeliverables = events.filter(e => isSameDay(e.date, day) && e.type === 'deliverable');
            return (
              <div key={day.toISOString()} className="flex-1 p-1 border-r border-base-300 last:border-r-0 flex flex-col gap-1">
                {dayDeliverables.map(event => (
                  <div key={event.id} className={`text-xs p-1 rounded truncate ${event.color} text-white`} title={event.title}>
                    <span className="font-bold">{event.courseCode}</span> {event.title}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Time Grid */}
        <div className="flex overflow-y-auto h-[600px] relative">
          {/* Time Labels */}
          <div className="w-16 flex-shrink-0 border-r border-base-300 bg-base-100 sticky left-0 z-20">
            {hours.map(h => (
              <div key={h} className="text-xs text-right pr-2 text-base-content/70 border-b border-base-200 box-border bg-base-100" style={{ height: hourHeight }}>
                {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
              </div>
            ))}
          </div>

          {/* Days Columns */}
          <div className="flex-1 flex relative min-w-[600px]">
            {/* Grid Lines */}
            {days.map((day) => (
              <div key={day.toISOString()} className="flex-1 border-r border-base-200 last:border-r-0 relative">
                {hours.map(h => (
                  <div key={h} className="border-b border-base-200 w-full absolute" style={{ top: (h - startHour) * hourHeight, height: 1 }}></div>
                ))}
              </div>
            ))}

            {/* Events */}
            {events.filter(e => e.type === 'class').map(event => {
              if (!event.startTime || !event.endTime) return null;

              // Find column index
              const dayIndex = days.findIndex(d => isSameDay(d, event.date));
              if (dayIndex === -1) return null;

              const startMinutes = event.startTime.hours * 60 + event.startTime.minutes;
              const endMinutes = event.endTime.hours * 60 + event.endTime.minutes;
              const startOffset = startMinutes - (startHour * 60);
              const duration = endMinutes - startMinutes;

              if (startOffset < 0) return null; // Before start time

              return (
                <div
                  key={event.id}
                  className="absolute p-1 rounded text-xs bg-primary/10 border-l-4 border-primary overflow-hidden hover:z-10 hover:shadow-md transition-all"
                  style={{
                    top: (startOffset / 60) * hourHeight,
                    height: (duration / 60) * hourHeight,
                    left: `${(dayIndex / 7) * 100}%`,
                    width: `${100 / 7}%`,
                  }}
                >
                  <div className="font-bold text-primary">{event.courseCode}</div>
                  <div className="truncate">{(event.title || '').replace(event.courseCode || '', '').trim()}</div>
                  <div className="text-[10px] opacity-75">{formatTime(event.startTime)} - {formatTime(event.endTime)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
