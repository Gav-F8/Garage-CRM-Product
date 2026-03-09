const statusStyle = (status) => {
  switch (status) {
    case 0: return { label: "Pending",     style: "bg-yellow-100 text-yellow-700 border border-yellow-200" };
    case 1: return { label: "In Progress", style: "bg-green-100 text-green-700 border border-green-200"   };
    case 2: return { label: "Complete",    style: "bg-red-100 text-red-700 border border-red-200"         };
    default: return { label: "Unknown",   style: "bg-gray-100 text-gray-700 border border-gray-200"      };
  }
};

const Job = ({ job }) => {
  const { label, style } = statusStyle(job.status);

  return (
    <div className="flex items-center w-full px-6 py-3.5 border-b border-[#E0E0E0] last:border-b-0 hover:bg-[#F7F7F5] transition-colors cursor-pointer">
      
      {/* Car Reg */}
      <span className="font-mono font-semibold text-sm w-32 shrink-0 text-[#37352F]">
        {job.carReg}
      </span>

      {/* Job Title */}
      <span className="flex-1 text-sm font-medium text-[#37352F]">
        {job.title}
      </span>

      {/* Status Pill */}
      <div className="w-40 shrink-0">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${style}`}>
          {label}
        </span>
      </div>

      {/* Location Indicator */}
      <div className="flex items-center gap-2 w-36 shrink-0">
        <div
          className={`w-3.5 h-3.5 rounded-sm border border-[#E0E0E0] ${job.inHouse ? "bg-[#37352F]" : "bg-white"}`}
          title={job.inHouse ? "In-House" : "Out-House"}
        />
        <span className="text-sm text-[#787774]">
          {job.inHouse ? "In-House" : "Out-House"}
        </span>
      </div>

    </div>
  );
};

export default Job;