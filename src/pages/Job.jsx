import { NavigationBar } from "../components/NavigationBar";

export default function JobPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <NavigationBar />
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-emerald-400 mb-6">Jobs Dashboard</h1>
        <div className="bg-zinc-900 border border-zinc-800 shadow-lg overflow-hidden sm:rounded-md p-6">
          <p className="text-zinc-400">This is the placeholder for the Jobs page. Here you will see a list of active repair jobs, assign mechanics, and update statuses.</p>
        </div>
      </main>
    </div>
  );
}
