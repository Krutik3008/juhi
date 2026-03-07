import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Code, ArrowRight, RotateCcw } from 'lucide-react';
import { compile } from './compilerEngine';
import './Home.css';

const Home = () => {
    const [sourceCode, setSourceCode] = useState('');
    const [isSimulating, setIsSimulating] = useState(false);
    const [activePhase, setActivePhase] = useState(0);
    const [compileResult, setCompileResult] = useState(null);

    const phases = [
        { id: 1, title: 'Lexical Analysis', desc: 'Tokenizing input string' },
        { id: 2, title: 'Syntax Analysis', desc: 'Building Parse Tree' },
        { id: 3, title: 'Semantic Analysis', desc: 'Type checking & Annotated Tree' },
        { id: 4, title: 'Intermediate Code', desc: 'Three-Address Code Generation' },
        { id: 5, title: 'Code Optimization', desc: 'Improving Intermediate Code' },
        { id: 6, title: 'Code Generation', desc: 'Target Assembly Output' }
    ];

    const handleSimulate = () => {
        const result = compile(sourceCode);
        setCompileResult(result);
        setIsSimulating(true);
        setActivePhase(1);

        let currentPhase = 1;
        const interval = setInterval(() => {
            currentPhase += 1;
            if (currentPhase <= 6) {
                setActivePhase(currentPhase);
            } else {
                clearInterval(interval);
            }
        }, 1200);
    };

    const handleReset = () => {
        setSourceCode('');
        setIsSimulating(false);
        setActivePhase(0);
        setCompileResult(null);
    };

    return (
        <div className="home-container">
            <div className="page-header">
                <h1 className="page-title">Compiler Pipeline Simulation</h1>
                <p className="page-description">
                    Enter a source statement and watch the magic of compilation unfold through all 6 phases automatically.
                </p>
            </div>

            <div className="content-section">
                <div className="glass-panel input-panel">
                    <div className="panel-header">
                        <Code size={20} className="panel-icon" />
                        <h3>Source Code Input</h3>
                        <button className="btn-reset" onClick={handleReset}>
                            <RotateCcw size={14} />
                            Reset
                        </button>
                    </div>
                    <div className="preset-examples-container">
                        <span className="preset-label">
                            <Code size={14} /> Try an example:
                        </span>
                        <div className="preset-buttons">
                            {[
                                { label: "Standard Assignment", code: "position = initial + rate * 60" },
                                { label: "Type Coercion", code: "float rate = 60 * 1.5;" },
                                { label: "Common Subexpression", code: "t1 = a + b\nt2 = a + b\nt3 = t1 + t2" }
                            ].map((preset, idx) => (
                                <button
                                    key={idx}
                                    className="preset-btn"
                                    onClick={() => setSourceCode(preset.code)}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Statement to Compile</label>
                        <textarea
                            className="source-textarea"
                            value={sourceCode}
                            onChange={(e) => setSourceCode(e.target.value)}
                            placeholder="Enter an expression like: position = initial + rate * 60"
                        />
                    </div>
                    <button className="btn-primary simulate-btn" onClick={handleSimulate}>
                        <Play size={18} />
                        Start Full Pipeline Simulation
                    </button>
                </div>

                <div className="pipeline-visualizer">
                    <div className="simulation-linear-view mt-4">
                        <h3 className="section-title">Compilation Progress</h3>
                        <div className="phases-container">
                            {phases.map((phase, index) => (
                                <React.Fragment key={phase.id}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`phase-card ${activePhase >= phase.id ? 'completed' : ''} ${activePhase === phase.id ? 'active' : ''}`}
                                    >
                                        <div className="phase-number">{phase.id}</div>
                                        <div className="phase-content">
                                            <h4>{phase.title}</h4>
                                            <p>{phase.desc}</p>
                                        </div>
                                    </motion.div>
                                    {index < phases.length - 1 && (
                                        <ArrowRight className={`phase-arrow ${activePhase > phase.id ? 'active' : ''}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {isSimulating && (
                            <div className="results-container mt-12">
                                <h3 className="section-title mb-6">Step-by-Step Compilation Process</h3>
                                <div className="results-stack">
                                    {phases.map((phase) => (
                                        activePhase >= phase.id && (
                                            <motion.div
                                                key={phase.id}
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="glass-panel result-card full-width"
                                            >
                                                <div className="result-header p-4 border-b border-gray-800 flex items-center gap-3">
                                                    <div className="phase-pill">Phase {phase.id}</div>
                                                    <h4 className="text-xl font-bold text-white">{phase.title}</h4>
                                                </div>
                                                <div className="result-body p-6 bg-black/20">
                                                    {phase.id === 1 && compileResult && (
                                                        <div className="phase-code-section">
                                                            <p className="phase-label"><strong>Tokens produced:</strong></p>
                                                            <div className="phase-table-wrapper">
                                                                <table className="phase-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Lexeme</th>
                                                                            <th>Token Type</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {compileResult.tokens.map((token, i) => (
                                                                            <tr key={i}>
                                                                                <td>{token.lexeme}</td>
                                                                                <td>{token.type}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            <p className="phase-label">So the <strong>token stream</strong> becomes:</p>
                                                            <pre className="phase-code-block">{compileResult.tokenStream}</pre>
                                                        </div>
                                                    )}
                                                    {phase.id === 2 && compileResult && (
                                                        <div className="phase-code-wrapper">
                                                            <pre className="phase-code-block">{compileResult.parseTree}</pre>
                                                        </div>
                                                    )}
                                                    {phase.id === 3 && compileResult && (
                                                        <div className="phase-table-wrapper">
                                                            <table className="phase-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Identifier</th>
                                                                        <th>Type</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {compileResult.symbolTable.map((sym, i) => (
                                                                        <tr key={i}>
                                                                            <td>{sym.name}</td>
                                                                            <td>{sym.type}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                    {phase.id === 4 && compileResult && (
                                                        <div className="phase-code-section">
                                                            <p className="phase-label">Three-address code:</p>
                                                            <pre className="phase-code-block">{compileResult.tac}</pre>
                                                        </div>
                                                    )}
                                                    {phase.id === 5 && compileResult && (
                                                        <div className="phase-code-section">
                                                            <p className="phase-label">Optimized code:</p>
                                                            <pre className="phase-code-block">{compileResult.optimized}</pre>
                                                        </div>
                                                    )}
                                                    {phase.id === 6 && compileResult && (
                                                        <div className="phase-code-section">
                                                            <p className="phase-label">Assembly output:</p>
                                                            <pre className="phase-code-block">{compileResult.assembly}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
