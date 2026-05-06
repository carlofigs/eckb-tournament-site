import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Home } from '@/pages/Home'
import { Schedule } from '@/pages/Schedule'
import { Bracket } from '@/pages/Bracket'
import { Standings } from '@/pages/Standings'
import { Teams } from '@/pages/Teams'
import { Refs } from '@/pages/Refs'
import { MyGames } from '@/pages/MyGames'
import { Account } from '@/pages/Account'
import { useInitialSync } from '@/hooks/useInitialSync'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

// `basename` matches `vite.config.ts` -> `base`. Both are
// "/eckb-tournament-site/" so links resolve identically in dev and on
// GitHub Pages.
const BASENAME = '/eckb-tournament-site'

export default function App() {
  // One-shot fetch on mount, then subscribe to realtime row-level
  // changes for this tournament. Both no-op when Supabase isn't
  // configured (env vars missing) → pure localStorage mode.
  useInitialSync()
  useRealtimeSync()

  return (
    <>
      <BrowserRouter basename={BASENAME}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="bracket" element={<Bracket />} />
            <Route path="standings" element={<Standings />} />
            <Route path="teams" element={<Teams />} />
            <Route path="refs" element={<Refs />} />
            <Route path="my-games" element={<MyGames />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </>
  )
}
