import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Code, ArrowRight, Minimize2, Settings } from 'lucide-react';

import ThreeAddressCode from './methods/ThreeAddressCode';
import DAGOptimizer from './methods/DAGOptimizer';

const CodeGenOverview = () => {
    const navigate = useNavigate();

    const methods = [
        {
            id: 'tac',
            title: 'Intermediate Code / Three-Address Code',
            desc: 'Generate machine-independent, linear intermediate representation (IR) from the syntax tree.',
            icon: <Code size={24} />
        },
        {
            id: 'dag',
            title: 'DAG & Local Optimization',
            desc: 'Optimize the intermediate code block by eliminating common subexpressions using Directed Acyclic Graphs.',
            icon: <Minimize2 size={24} />
        }
    ];

    return (
        <div className="unit-container">
            <div className="page-header">
                <h1 className="page-title">Unit VI: Optimization & Code Generation</h1>
                <p className="page-description">
                    The final stages of compilation involving intermediate representation synthesis, instruction optimization, and target assembly output.
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
                                onClick={() => navigate(`/unit6/${method.id}`)}
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

const CodeGenHome = () => {
    return (
        <Routes>
            <Route path="/" element={<CodeGenOverview />} />
            <Route path="/tac" element={<ThreeAddressCode />} />
            <Route path="/dag" element={<DAGOptimizer />} />
        </Routes>
    );
};

export default CodeGenHome;
