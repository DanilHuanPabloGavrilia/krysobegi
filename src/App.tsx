import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PlayScreen from './screens/PlayScreen'
import SetupScreen from './screens/SetupScreen'
import GameScreen from './screens/GameScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/play"  element={<PlayScreen />} />
        <Route path="/setup" element={<SetupScreen />} />
        <Route path="/game"  element={<GameScreen />} />
        <Route path="*"      element={<Navigate to="/play" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
