import { NavigationBar } from "../components/NavigationBar";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <NavigationBar />
      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 mt-10">
        <div className="max-w-md w-full space-y-8 bg-zinc-900 border border-zinc-800 p-8 rounded-lg shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-emerald-400">
              Sign in to your account
            </h2>
          </div>
          <form className="mt-8 space-y-6">
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input id="email-address" name="email" type="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 placeholder-zinc-500 text-white rounded-t-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm" placeholder="Email address" />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input id="password" name="password" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 placeholder-zinc-500 text-white rounded-b-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm" placeholder="Password" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-emerald-500 focus:ring-emerald-500 border-zinc-600 rounded bg-zinc-800" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-emerald-400 hover:text-emerald-300">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button type="button" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-zinc-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                Sign in
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
