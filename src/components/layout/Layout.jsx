import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpdateToast from '../common/UpdateToast'

// Renders nested routes via <Outlet/>, or explicit children when used as a
// plain wrapper (e.g. the signed-in view of /u/:username).
export default function Layout({ children }) {
  return (
    <div className="flex min-h-[100dvh]">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {children ?? <Outlet />}
        </div>
      </main>
      <UpdateToast />
    </div>
  )
}
