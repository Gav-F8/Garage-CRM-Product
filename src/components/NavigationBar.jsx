import { Link, useLocation } from 'react-router-dom';

export function NavigationBar() {
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Jobs', path: '/jobs' },
    { name: 'Contact', path: '/contact' },
    { name: 'Login', path: '/login' },
  ];

  return (
    <nav className="bg-zinc-900 border-b border-emerald-900 shadow-lg shadow-emerald-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="font-bold text-xl tracking-tight text-emerald-400">Garage CRM</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-zinc-800 text-emerald-400 ring-1 ring-emerald-700'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-emerald-300'
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Mobile menu button could go here */}
        </div>
      </div>
    </nav>
  );
}
