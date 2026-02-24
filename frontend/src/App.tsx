import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { Home } from './pages/Home'
import { Health } from './pages/Health'
import { Listen } from './pages/Listen'
import { Insights } from './pages/Insights'
import { Daily } from './pages/Daily'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/health" element={<Health />} />
          <Route path="/listen" element={<Listen />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/daily" element={<Daily />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
