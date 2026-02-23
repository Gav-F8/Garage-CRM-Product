import { NavigationBar } from "../components/NavigationBar";
import { Link } from "react-router-dom";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-zinc-950">
      <NavigationBar />
      
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
            <span className="block">Welcome to</span>
            <span className="block text-emerald-400">Garage CRM</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-zinc-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Manage your garage operations, track jobs, and communicate with customers all in one place.
          </p>
          
          <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center gap-4">
            <Link
              to="/jobs"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-zinc-950 bg-emerald-400 hover:bg-emerald-300 md:py-4 md:text-lg md:px-10 transition-colors"
              >
              View Jobs
            </Link>
            <Link
              to="/contact"
              className="mt-3 w-full flex items-center justify-center px-8 py-3 border border-emerald-700 text-base font-medium rounded-md text-emerald-400 bg-transparent hover:bg-emerald-900/40 md:py-4 md:text-lg md:px-10 transition-colors sm:mt-0"
              >
              Contact Support
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg rounded-lg hover:border-emerald-800 transition-colors">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-semibold text-emerald-400">Job Management</h3>
              <div className="mt-2 max-w-xl text-sm text-zinc-400">
                <p>Track ongoing repairs, assign mechanics, and update statuses in real-time.</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg rounded-lg hover:border-emerald-800 transition-colors">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-semibold text-emerald-400">Customer Portal</h3>
              <div className="mt-2 max-w-xl text-sm text-zinc-400">
                <p>Keep your customers informed with automated updates and easy communication.</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg rounded-lg hover:border-emerald-800 transition-colors">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-semibold text-emerald-400">Analytics</h3>
              <div className="mt-2 max-w-xl text-sm text-zinc-400">
                <p>View performance metrics, revenue, and mechanic efficiency at a glance.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}