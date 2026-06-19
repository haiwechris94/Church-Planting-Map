import { Outlet, useLocation } from 'react-router-dom'
import TopNavbar from './TopNavbar'

const FULLSCREEN_ROUTES = ['/map', '/geojson-map', '/voronoi-map']

const Layout = () => {
  const location = useLocation()
  const isFullscreen = FULLSCREEN_ROUTES.some(r => location.pathname.startsWith(r))
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <TopNavbar />
      <main className={isFullscreen
        ? 'flex-1 overflow-hidden'
        : 'flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6'
      }>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
