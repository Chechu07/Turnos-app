import { Routes, Route } from "react-router-dom"
import Client from "./pages/Client"
import Admin from "./pages/Admin"
import Login from "./pages/Login"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Client />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}