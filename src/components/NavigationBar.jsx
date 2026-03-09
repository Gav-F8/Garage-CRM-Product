import { Link, useLocation } from 'react-router-dom';

export function NavigationBar() {
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Customer', path: '/customer' },
    { name: 'Storage', path: '/storage' },
    { name: 'Jobs', path: '/jobs' },
    { name: 'Contact', path: '/contact' },
  ];

  const linkClass = (path) => {
    const isActive = location.pathname === path;
    return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-[#F7F7F5] text-[#37352F] font-semibold'
        : 'text-[#787774] hover:bg-[#F7F7F5] hover:text-[#37352F]'
    }`;
  };

  return (
    <nav className="w-full bg-white border-b border-[#E0E0E0] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Left: brand + main links */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="font-bold text-lg tracking-tight text-[#37352F]">Garage CRM</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-1">
                {navLinks.map((link) => (
                  <Link key={link.name} to={link.path} className={linkClass(link.path)}>
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Login */}
          <div className="hidden md:block">
            <Link to="/login" className={linkClass('/login')}>
              Login
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}

export default NavigationBar;
