import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShieldCheck } from 'lucide-react';

import TypeChecker from './methods/TypeChecker';

const SemanticOverview = () => {
    const navigate = useNavigate();

    const methods = [
        {
            id: 'type-checker',
            title: 'Semantic Analyzer & Type Checker',
            desc: 'Traverse the syntax tree to ensure structural rules are met (like type matching) and annotate nodes with type information.',
            icon: <ShieldCheck size={24} />
        }
    ];

    return (
        <div className="unit-container">
            <div className="page-header">
                <h1 className="page-title">Unit IV: Semantic Analysis</h1>
                <p className="page-description">
                    The semantic phase checks the source program for semantic errors and gathers type information for the subsequent code-generation phase.
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
                                onClick={() => navigate(`/unit4/${method.id}`)}
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

const SemanticHome = () => {
    return (
        <Routes>
            <Route path="/" element={<SemanticOverview />} />
            <Route path="/type-checker" element={<TypeChecker />} />
        </Routes>
    );
};

export default SemanticHome;
