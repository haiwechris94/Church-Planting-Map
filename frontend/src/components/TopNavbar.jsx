/**
 * TopNavbar - Horizontal Navigation Bar Component
 */
import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n'
import LanguageSwitcher from './LanguageSwitcher'
import {
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
} from 'lucide-react'

const TopNavbar = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  
  // Base navigation items for all users
  const baseNavItems = [
    { path: '/dashboard', label: t('nav.dashboard') || 'Dashboard', exact: true },
    { path: '/map', label: t('nav.map') || 'Carte' },
    { path: '/unified-map', label: t('nav.unifiedMap') || 'Carte unifiée' },
    { path: '/activities', label: t('nav.activities') || 'Activités' },
    { path: '/coaching-igrow', label: t('nav.coachingIgrow') || 'Coaching iGROW' },
    { path: '/dmm-reporting', label: t('nav.dmmReporting') || 'Reporting DMM' },
    { path: '/analyse-qualitative', label: t('nav.analyseQualitative') || 'Analyse' },
    { path: '/data-management', label: t('nav.dataManagement') || 'Données' },
  ]
  
  // Add Administration link for admin users only
  const navItems = user?.role === 'admin' 
    ? [...baseNavItems, { path: '/admin/users', label: 'Administration', icon: Shield }]
    : baseNavItems
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  
  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/'
    }
    if (path === '/map') {
      return location.pathname.startsWith('/map') || location.pathname.startsWith('/geojson-map')
    }
    return location.pathname.startsWith(path)
  }
  
  return (
    <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <NavLink to="/dashboard" className="flex items-center gap-2.5">
              <img
                src="/data/Everywhere_Logo_Mark_Black.png"
                alt="EVERYWHERE"
                className="h-8 w-8"
              />
              <span className="hidden sm:block text-base font-bold text-neutral-800 uppercase tracking-widest">
                EVERYWHERE
              </span>
            </NavLink>
          </div>

          {/* Center Nav — Desktop */}
          <nav className="hidden lg:flex items-center justify-center flex-1 mx-6">
            <div className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const active = isActive(item.path)
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={() =>
                      `px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 ${
                        active
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                      }${item.path === '/admin/users' ? ' bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800' : ''}`
                    }
                  >
                    {Icon && <Icon size={14} />}
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          </nav>

          {/* Right: Language + User */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcher variant="compact" />
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-neutral-50 transition-all duration-150 border border-transparent hover:border-neutral-200"
                aria-label="User menu"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-full flex items-center justify-center">
                  <User size={14} className="text-white" />
                </div>
                <ChevronDown
                  size={14}
                  className={`hidden md:block text-neutral-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 overflow-hidden z-50">
                  <div className="px-4 py-2.5 border-b border-neutral-100">
                    <p className="text-sm font-semibold text-neutral-800">{user?.name}</p>
                    <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <NavLink
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <User size={15} />
                      <span>{t('nav.profile') || 'Profil'}</span>
                    </NavLink>
                  </div>
                  <div className="border-t border-neutral-100 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                    >
                      <LogOut size={15} />
                      <span>{t('auth.logout') || 'Déconnexion'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-200 bg-white">
          <nav className="px-4 py-2 space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item.path)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={() =>
                    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }${item.path === '/admin/users' ? ' bg-red-50 text-red-700 hover:bg-red-100' : ''}`
                  }
                >
                  {Icon && <Icon size={16} />}
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}

export default TopNavbar