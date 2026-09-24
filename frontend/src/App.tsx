import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell.tsx'
import { LoginPage } from './features/auth/LoginPage.tsx'
import { RequireAuth } from './features/auth/RequireAuth.tsx'
import { AssetsPage } from './features/assets/AssetsPage.tsx'
import { BrandPage } from './features/brand/BrandPage.tsx'
import { TrashPage } from './features/trash/TrashPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/library" replace />} />
        <Route path="/brand" element={<BrandPage />} />
        <Route path="/library" element={<AssetsPage />} />
        <Route path="/trash" element={<TrashPage />} />
      </Route>
    </Routes>
  )
}
