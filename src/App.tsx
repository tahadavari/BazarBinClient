import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import CreateDatasetPage from "./pages/CreateDatasetPage"
import DatasetListPage from "./pages/DatasetListPage"
import DatasetPromptPage from "./pages/DatasetPromptPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DatasetListPage />} />
        <Route path="/create" element={<CreateDatasetPage />} />
        <Route path="/datasets/:datasetId" element={<DatasetPromptPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
