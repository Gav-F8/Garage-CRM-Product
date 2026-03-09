import { useEffect, useState } from "react";
import Job from "./JobDisplayBox";

const fetchJobs = async () => {
  return [
    { id: 1, title: "Full Service",      status: 0, inHouse: true,  carReg: "AB12 CDE" },
    { id: 2, title: "Brake Replacement", status: 1, inHouse: false, carReg: "XY34 FGH" },
    { id: 3, title: "Oil Change",        status: 2, inHouse: true,  carReg: "LM56 NOP" },
    { id: 4, title: "Tyre Rotation",     status: 3, inHouse: false, carReg: "QR78 STU" },
  ];
};

const JobDisplay = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJobs = async () => {
      const data = await fetchJobs();
      setJobs(data);
      setLoading(false);
    };
    loadJobs();
  }, []);

  if (loading) return <p className="p-6 text-[#9B9A97]">Loading jobs...</p>;
  if (jobs.length === 0) return <p className="p-6 text-[#9B9A97]">No jobs found.</p>;

  return (
    <div className="flex flex-col w-full bg-white border border-[#E0E0E0] rounded-xl shadow-sm overflow-hidden">

      {/* Header Row */}
      <div className="flex items-center w-full px-6 py-3 bg-[#F7F7F5] border-b border-[#E0E0E0] text-xs font-semibold text-[#787774] uppercase tracking-wider">
        <span className="w-32 shrink-0">Car Reg</span>
        <span className="flex-1">Job Title</span>
        <span className="w-40 shrink-0">Status</span>
        <span className="w-36 shrink-0">Location</span>
      </div>

      {/* Job Rows */}
      {jobs.map((job) => (
        <Job key={job.id} job={job} />
      ))}

    </div>
  );
};

export default JobDisplay;