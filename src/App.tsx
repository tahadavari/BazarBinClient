import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import CreateDatasetPage from "./pages/CreateDatasetPage"
import DatasetListPage from "./pages/DatasetListPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DatasetListPage />} />
        <Route path="/create" element={<CreateDatasetPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
