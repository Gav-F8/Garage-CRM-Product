import { useEffect, useMemo, useState } from "react";

const STATUS_OPTIONS = [
  { value: "green", label: "Green", colorClass: "bg-green-500" },
  { value: "yellow", label: "Yellow", colorClass: "bg-yellow-400" },
  { value: "red", label: "Red", colorClass: "bg-red-500" },
  { value: "blue", label: "Blue", colorClass: "bg-blue-500" },
];

function formatElapsedTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

export default function MechanicJobView({
  registrationPlate = "Unknown Plate",
  chassisNumber = "Unknown Chassis",
  initialStatus = "green",
  initialTechNotes = "",
  onTechNotesChange,
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [status, setStatus] = useState(initialStatus);
  const [techNotes, setTechNotes] = useState(initialTechNotes);

  useEffect(() => {
    if (!isRunning) return undefined;

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  const elapsedTimeLabel = useMemo(
    () => formatElapsedTime(elapsedSeconds),
    [elapsedSeconds],
  );

  const activeStatus = STATUS_OPTIONS.find((option) => option.value === status);

  const handleNotesChange = (event) => {
    const value = event.target.value;
    setTechNotes(value);
    onTechNotesChange?.(value);
  };

  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl border border-[#E0E0E0] bg-white p-6 shadow-sm sm:p-8">
      <header className="mb-8 rounded-xl border border-[#E0E0E0] bg-[#F7F6F3] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#787774]">
          Active Vehicle
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#37352F] sm:text-3xl">
          Plate: {registrationPlate}
        </h2>
        <p className="mt-2 text-sm font-medium text-[#787774] sm:text-base">
          Chassis: {chassisNumber}
        </p>
      </header>

      <div className="mb-8 flex flex-col items-center justify-center gap-4 rounded-xl border border-[#E0E0E0] bg-gradient-to-b from-white to-[#F7F6F3] p-6 sm:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-[#787774]">
          Stopwatch
        </p>
        <p className="text-4xl font-bold tabular-nums text-[#37352F] sm:text-5xl">
          {elapsedTimeLabel}
        </p>

        <button
          type="button"
          onClick={() => setIsRunning((prev) => !prev)}
          className={`mt-2 h-28 w-28 rounded-full text-lg font-semibold text-white shadow-lg transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 sm:h-36 sm:w-36 sm:text-xl ${
            isRunning
              ? "bg-red-500 hover:bg-red-600 focus:ring-red-400"
              : "bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400"
          }`}
          aria-label={isRunning ? "Stop stopwatch" : "Start stopwatch"}
        >
          {isRunning ? "Stop" : "Start"}
        </button>
      </div>

      <div className="mb-8 rounded-xl border border-[#E0E0E0] bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#37352F]">
            Status Indicator
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${activeStatus?.colorClass || "bg-green-500"}`}
              aria-hidden="true"
            />
            <span className="text-sm text-[#787774]">
              {activeStatus?.label || "Green"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
                status === option.value
                  ? "border-[#37352F] bg-[#37352F] text-white"
                  : "border-[#E0E0E0] bg-white text-[#37352F] hover:bg-[#F7F6F3]"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${option.colorClass}`}
                aria-hidden="true"
              />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="tech-notes"
          className="text-sm font-semibold text-[#37352F]"
        >
          Tech Notes
        </label>
        <textarea
          id="tech-notes"
          rows={6}
          value={techNotes}
          onChange={handleNotesChange}
          placeholder="Add diagnosis details, repair steps, or handover notes..."
          className="w-full rounded-lg border border-[#E0E0E0] bg-[#F7F6F3] px-3 py-2 text-sm text-[#37352F] outline-none transition-all focus:border-[#37352F] focus:bg-white"
        />
      </div>
    </section>
  );
}
