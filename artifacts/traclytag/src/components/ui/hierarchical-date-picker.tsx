import React, { useState, useMemo } from "react";
import { format, setYear, setMonth, setDate, getDaysInMonth, startOfMonth, getDay, isSameDay, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HierarchicalDatePickerProps {
  value?: Date;
  onSelect: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
}

type ViewStep = "range" | "year" | "month" | "day";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function HierarchicalDatePicker({
  value,
  onSelect,
  disabled,
  className,
}: HierarchicalDatePickerProps) {
  const initialDate = value || new Date();
  const initialYear = initialDate.getFullYear();
  const initialMonth = initialDate.getMonth();

  // State
  const [step, setStep] = useState<ViewStep>("day");
  
  // Decade range start (e.g., 2020 for 2020-2029)
  const [rangeStart, setRangeStart] = useState<number>(() => Math.floor(initialYear / 10) * 10);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

  // Decade list generator
  // Generates 6 ranges around rangeStart (e.g. 1990-1999, 2000-2009, 2010-2019, 2020-2029, 2030-2039, 2040-2049)
  const decadeBaseYear = Math.floor(rangeStart / 60) * 60;
  const decadeRanges = useMemo(() => {
    const startDecade = Math.floor(rangeStart / 10) * 10 - 20;
    const ranges = [];
    for (let i = 0; i < 6; i++) {
      const start = startDecade + i * 10;
      ranges.push({ start, end: start + 9 });
    }
    return ranges;
  }, [rangeStart]);

  // Years in selected range
  const yearsInRange = useMemo(() => {
    const start = Math.floor(rangeStart / 10) * 10;
    return Array.from({ length: 10 }, (_, i) => start + i);
  }, [rangeStart]);

  // Days matrix for selected year & month
  const calendarDays = useMemo(() => {
    const currentMonthDate = new Date(selectedYear, selectedMonth, 1);
    const totalDays = getDaysInMonth(currentMonthDate);
    const startDayOfWeek = getDay(startOfMonth(currentMonthDate)); // 0 = Sun, 1 = Mon ...

    const days: Array<{ date: Date; currentMonth: boolean }> = [];

    // Prev month padding
    const prevMonthLastDate = getDaysInMonth(new Date(selectedYear, selectedMonth - 1, 1));
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(selectedYear, selectedMonth - 1, prevMonthLastDate - i),
        currentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      days.push({
        date: new Date(selectedYear, selectedMonth, d),
        currentMonth: true,
      });
    }

    // Next month padding to fill grid to multiple of 7 (up to 35 or 42)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: new Date(selectedYear, selectedMonth + 1, d),
        currentMonth: false,
      });
    }

    return days;
  }, [selectedYear, selectedMonth]);

  // Handlers
  const handleRangeSelect = (startYear: number) => {
    setRangeStart(startYear);
    setStep("year");
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setStep("month");
  };

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setStep("day");
  };

  const handleDaySelect = (d: Date) => {
    if (disabled && disabled(d)) return;
    onSelect(d);
  };

  const handleHeaderTitleClick = () => {
    if (step === "day") setStep("month");
    else if (step === "month") setStep("year");
    else if (step === "year") setStep("range");
    else setStep("range");
  };

  const handlePrev = () => {
    if (step === "range") setRangeStart((prev) => prev - 60);
    else if (step === "year") setRangeStart((prev) => prev - 10);
    else if (step === "month") setSelectedYear((prev) => prev - 1);
    else if (step === "day") {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear((prev) => prev - 1);
      } else {
        setSelectedMonth((prev) => prev - 1);
      }
    }
  };

  const handleNext = () => {
    if (step === "range") setRangeStart((prev) => prev + 60);
    else if (step === "year") setRangeStart((prev) => prev + 10);
    else if (step === "month") setSelectedYear((prev) => prev + 1);
    else if (step === "day") {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear((prev) => prev + 1);
      } else {
        setSelectedMonth((prev) => prev + 1);
      }
    }
  };

  return (
    <div className={cn("w-[320px] p-4 bg-white rounded-xl border border-slate-200 shadow-xl select-none font-sans", className)}>
      {/* Step Breadcrumbs */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
          <button
            type="button"
            onClick={() => setStep("range")}
            className={cn(
              "px-1.5 py-0.5 rounded transition-colors hover:text-[#2563EB]",
              step === "range" ? "bg-blue-50 text-[#2563EB] font-bold" : "text-slate-500"
            )}
          >
            Range
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => setStep("year")}
            className={cn(
              "px-1.5 py-0.5 rounded transition-colors hover:text-[#2563EB]",
              step === "year" ? "bg-blue-50 text-[#2563EB] font-bold" : "text-slate-500"
            )}
          >
            {selectedYear}
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => setStep("month")}
            className={cn(
              "px-1.5 py-0.5 rounded transition-colors hover:text-[#2563EB]",
              step === "month" ? "bg-blue-50 text-[#2563EB] font-bold" : "text-slate-500"
            )}
          >
            {MONTH_NAMES[selectedMonth]}
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => setStep("day")}
            className={cn(
              "px-1.5 py-0.5 rounded transition-colors hover:text-[#2563EB]",
              step === "day" ? "bg-blue-50 text-[#2563EB] font-bold" : "text-slate-500"
            )}
          >
            Day
          </button>
        </div>
      </div>

      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          type="button"
          onClick={handlePrev}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          title="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleHeaderTitleClick}
          className="font-bold text-sm text-slate-900 hover:text-[#2563EB] px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer"
        >
          {step === "range" && `${decadeRanges[0].start} - ${decadeRanges[decadeRanges.length - 1].end}`}
          {step === "year" && `${rangeStart} - ${rangeStart + 9}`}
          {step === "month" && `${selectedYear}`}
          {step === "day" && `${FULL_MONTH_NAMES[selectedMonth]} ${selectedYear}`}
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          title="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* View 1: Range View */}
      {step === "range" && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Step 1: Select Year Range</p>
          <div className="grid grid-cols-2 gap-2">
            {decadeRanges.map((r) => {
              const isCurrentRange = selectedYear >= r.start && selectedYear <= r.end;
              return (
                <button
                  key={r.start}
                  type="button"
                  onClick={() => handleRangeSelect(r.start)}
                  className={cn(
                    "py-3 px-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer",
                    isCurrentRange
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-md shadow-blue-500/20"
                      : "bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border-slate-200 text-slate-700"
                  )}
                >
                  {r.start} - {r.end}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: Year View */}
      {step === "year" && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Step 2: Select Year ({rangeStart} - {rangeStart + 9})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {yearsInRange.map((y) => {
              const isSelected = selectedYear === y;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => handleYearSelect(y)}
                  className={cn(
                    "py-2.5 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer",
                    isSelected
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-md shadow-blue-500/20"
                      : "bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border-slate-200 text-slate-700"
                  )}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View 3: Month View */}
      {step === "month" && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Step 3: Select Month ({selectedYear})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((m, idx) => {
              const isSelected = selectedMonth === idx;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMonthSelect(idx)}
                  className={cn(
                    "py-2.5 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer",
                    isSelected
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-md shadow-blue-500/20"
                      : "bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border-slate-200 text-slate-700"
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View 4: Day View */}
      {step === "day" && (
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Step 4: Select Date
          </p>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="text-[10px] font-bold text-slate-400 uppercase">
                {wd}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, currentMonth }, idx) => {
              const isDisabled = disabled ? disabled(date) : false;
              const isSelected = value ? isSameDay(date, value) : false;
              const isToday = isSameDay(date, new Date());

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDaySelect(date)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer mx-auto",
                    !currentMonth && "text-slate-300",
                    currentMonth && !isSelected && !isToday && "text-slate-700 hover:bg-blue-50 hover:text-[#2563EB]",
                    isToday && !isSelected && "border border-blue-500 text-[#2563EB] font-bold",
                    isSelected && "bg-[#2563EB] text-white font-bold shadow-md shadow-blue-500/20",
                    isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-slate-400"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
