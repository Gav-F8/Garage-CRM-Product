import { NavigationBar } from "../components/NavigationBar";
import { Link } from "react-router-dom";
import JobDisplay from "../components/JobDisplay";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-[#F7F7F5]">
      <NavigationBar />
      
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#37352F]">
            <span className="block">Welcome to</span>
            <span className="block">Garage CRM</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-[#787774] sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Manage your garage operations, track jobs, and communicate with customers all in one place.
          </p>

          {/*
          <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center gap-4">
            <Link
              to="/jobs"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#37352F] hover:bg-[#474540] md:py-4 md:text-lg md:px-10 transition-colors shadow-sm"
              >
              
            </Link>
            
            <Link
              to="/contact"
              className="mt-3 w-full flex items-center justify-center px-8 py-3 border border-[#E0E0E0] text-base font-medium rounded-lg text-[#37352F] bg-white hover:bg-[#F7F7F5] md:py-4 md:text-lg md:px-10 transition-colors sm:mt-0 shadow-sm"
              >
              Contact Support
            </Link>
          </div>
          */}
        </div>

        <div className="my-10">
          <JobDisplay />
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

          <Link
              to="/customer"
              className="bg-white border border-[#E0E0E0] overflow-hidden shadow-sm rounded-xl hover:shadow-md transition-shadow"
              >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base leading-6 font-semibold text-[#37352F]">New Customer Entry</h3>
              <div className="mt-2 max-w-xl text-sm text-[#787774]">
                <p>Create a new customer entry with your business.</p>
              </div>
            </div>
         </Link>

          <Link 
              to="/storage" 
              className="bg-white border border-[#E0E0E0] overflow-hidden shadow-sm rounded-xl hover:shadow-md transition-shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base leading-6 font-semibold text-[#37352F]">New Storage Entry</h3>
              <div className="mt-2 max-w-xl text-sm text-[#787774]">
                <p>Register new automobiles in your inventory with detailed information.</p>
              </div>
            </div>
          </Link>

          <div className="bg-white border border-[#E0E0E0] overflow-hidden shadow-sm rounded-xl hover:shadow-md transition-shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base leading-6 font-semibold text-[#37352F]">New Job Entry</h3>
              <div className="mt-2 max-w-xl text-sm text-[#787774]">
                <p>Create and manage new jobs with detailed information and status updates.</p>
              </div>
            </div>
          </div>

      
      </div>
      </main>
    </div>
  );
}