import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AlignLeft, ArrowRight, ListTree, Calculator, Network, AlertTriangle } from 'lucide-react';

import FirstAndFollow from './methods/FirstAndFollow';
import ParseTreeVisualizer from './methods/ParseTreeVisualizer';
import Derivation from './methods/Derivation';
import AmbiguityChecker from './methods/AmbiguityChecker';

const SyntaxOverview = () => {
    const navigate = useNavigate();

    const methods = [
        {
            id: 'first-follow',
            title: 'FIRST & FOLLOW Sets',
            desc: 'Compute the table-building sets to determine which terminals can start a string derived from a non-terminal.',
            icon: <Calculator size={24} />
        },
        {
            id: 'parse-tree',
            title: 'Parse Tree Construction',
            desc: 'Visualize derivations showing how a start symbol derives the string according to the grammar rules.',
            icon: <ListTree size={24} />
        },
        {
            id: 'derivation',
            title: 'Leftmost & Rightmost Derivation',
            desc: 'Step-by-step token replacement of a source string following the Leftmost and Rightmost derivation logic.',
            icon: <Network size={24} />
        },
        {
            id: 'ambiguity',
            title: 'Ambiguity Checker',
            desc: 'Prove grammar ambiguity by detecting multiple valid parse trees or leftmost derivations for a single string.',
            icon: <AlertTriangle size={24} className="text-pink-400" />
        }
    ];

    return (
        <div className="unit-container">
            <div className="page-header">
                <h1 className="page-title">Unit II & III: Syntax Analysis</h1>
                <p className="page-description">
                    The parser checks the token stream against the Context Free Grammar (CFG) of the language and builds a parse tree representation.
                </p>
            </div>

            <div className="content-section">
                <h2 className="section-title mb-6">Interactive Methods</h2>
                <div className="grid-cards">
                    {methods.map((method) => (
                        <div key={method.id} className="glass-panel method-card">
                            <div className="method-icon">{method.icon}</div>
                            <h3 className="method-title">{method.title}</h3>
                            <p className="method-desc">{method.desc}</p>
                            <button
                                className="btn-secondary w-full flex items-center justify-between mt-4"
                                onClick={() => navigate(`/unit2-3/${method.id}`)}
                            >
                                <span>Start Simulation</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SyntaxHome = () => {
    return (
        <Routes>
            <Route path="/" element={<SyntaxOverview />} />
            <Route path="/first-follow" element={<FirstAndFollow />} />
            <Route path="/parse-tree" element={<ParseTreeVisualizer />} />
            <Route path="/derivation" element={<Derivation />} />
            <Route path="/ambiguity" element={<AmbiguityChecker />} />
        </Routes>
    );
};

export default SyntaxHome;
