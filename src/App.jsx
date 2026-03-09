import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Layout/Navigation';

import Home from './pages/Home/Home';
import LexicalHome from './pages/Lexical/LexicalHome';
import SyntaxHome from './pages/Syntax/SyntaxHome';

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/unit1/*" element={<LexicalHome />} />
            <Route path="/unit2-3/*" element={<SyntaxHome />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
