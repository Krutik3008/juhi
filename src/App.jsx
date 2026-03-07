import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Layout/Navigation';

import Home from './pages/Home/Home';
import LexicalHome from './pages/Lexical/LexicalHome';
import SyntaxHome from './pages/Syntax/SyntaxHome';
import SemanticHome from './pages/Semantic/SemanticHome';
import RunTimeHome from './pages/RunTime/RunTimeHome';
import CodeGenHome from './pages/CodeGen/CodeGenHome';

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
            <Route path="/unit4/*" element={<SemanticHome />} />
            <Route path="/unit5/*" element={<RunTimeHome />} />
            <Route path="/unit6/*" element={<CodeGenHome />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
