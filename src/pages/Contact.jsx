import { NavigationBar } from "../components/NavigationBar";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <NavigationBar />
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-emerald-400 mb-6">Contact Us</h1>
        <div className="bg-zinc-900 border border-zinc-800 shadow-lg overflow-hidden sm:rounded-md p-6 max-w-2xl">
          <form className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300">Name</label>
              <div className="mt-1">
                <input type="text" name="name" id="name" className="bg-zinc-800 text-white placeholder-zinc-500 focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border border-zinc-700 rounded-md p-2" placeholder="John Doe" />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">Email</label>
              <div className="mt-1">
                <input type="email" name="email" id="email" className="bg-zinc-800 text-white placeholder-zinc-500 focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border border-zinc-700 rounded-md p-2" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-zinc-300">Message</label>
              <div className="mt-1">
                <textarea id="message" name="message" rows={4} className="bg-zinc-800 text-white placeholder-zinc-500 focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border border-zinc-700 rounded-md p-2" placeholder="How can we help you?"></textarea>
              </div>
            </div>
            <div>
              <button type="button" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-zinc-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                Send Message
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
