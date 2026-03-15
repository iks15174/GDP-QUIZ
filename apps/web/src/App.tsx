import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import IndexPage from './pages/IndexPage';
import QuizPage from './pages/QuizPage';
import EncyclopediaPage from './pages/EncyclopediaPage';
import ResultPage from './pages/ResultPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/encyclopedia" element={<EncyclopediaPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="*" element={<div style={{ padding: 20, textAlign: 'center' }}>페이지를 찾을 수 없어요</div>} />
      </Routes>
    </BrowserRouter>
  );
}
