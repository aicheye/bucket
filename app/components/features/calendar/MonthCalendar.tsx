"use client";

import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { formatTime, FULL_DAYS, getEventsForDateRange, getMonthDays, isSameDay } from "../../../../lib/calendar-utils";
import { useCourses } from "../../../contexts/CourseContext";

export function MonthlyCalendar() {
  const { courses, items } = useCourses();
  const [currentDate, setCurrentDate] = useState(new Date());

  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  const events = getEventsForDateRange(courses, items, days[0], days[days.length - 1]);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="join flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="join-item btn btn-sm btn-soft"
            title="Previous month"
            aria-label="Previous month"
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
            onClick={nextMonth}
            className="join-item btn btn-sm btn-soft"
            title="Next month"
            aria-label="Next month"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-base-300 border border-base-300 rounded-lg overflow-hidden">
        {FULL_DAYS.map(day => (
          <div key={day} className="bg-base-100 p-2 text-center font-semibold text-sm">
            {day.slice(0, 3)}
          </div>
        ))}

        {days.map((day, idx) => {
          const dayEvents = events.filter(e => isSameDay(e.date, day));
          // Sort: Deliverables first, then by time
          dayEvents.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'deliverable' ? -1 : 1;
            if (a.startTime && b.startTime) {
              return (a.startTime.hours * 60 + a.startTime.minutes) - (b.startTime.hours * 60 + b.startTime.minutes);
            }
            return 0;
          });

          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, new Date());

          return (
            <div key={idx} className={`bg-base-100 min-h-[120px] p-2 flex flex-col gap-1 ${!isCurrentMonth ? 'opacity-50' : ''}`}>
              <div className={`text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center ${isToday ? 'bg-primary text-primary-content rounded-full' : ''}`}>
                {day.getDate()}
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px]">
                {dayEvents.map(event => (
                  <div key={event.id} className={`text-xs p-1 rounded truncate min-h-[26px] ${event.type === 'deliverable' ? event.color + ' text-white' : 'bg-base-200 text-base-content border border-base-300'}`}>
                    {event.type === 'class' && event.startTime && (
                      <span className="opacity-75 mr-1">{formatTime(event.startTime)}</span>
                    )}
                    <span className="font-semibold">{event.courseCode}</span> {(event.title || '').replace(event.courseCode || '', '').trim() || 'Event'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
