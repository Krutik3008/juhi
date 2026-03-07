import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Code, ArrowRight } from 'lucide-react';
import './Home.css';

const Home = () => {
    const [sourceCode, setSourceCode] = useState('position = initial + rate * 60');
    const [isSimulating, setIsSimulating] = useState(false);
    const [activePhase, setActivePhase] = useState(0);

    const phases = [
        { id: 1, title: 'Lexical Analysis', desc: 'Tokenizing input string' },
        { id: 2, title: 'Syntax Analysis', desc: 'Building Parse Tree' },
        { id: 3, title: 'Semantic Analysis', desc: 'Type checking & Annotated Tree' },
        { id: 4, title: 'Intermediate Code', desc: 'Three-Address Code Generation' },
        { id: 5, title: 'Code Optimization', desc: 'Improving Intermediate Code' },
        { id: 6, title: 'Code Generation', desc: 'Target Assembly Output' }
    ];

    const handleSimulate = () => {
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

                {isSimulating && (
                    <div className="pipeline-visualizer">
                        <div className="simulation-linear-view mt-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="section-title mb-0">Step-by-Step Compilation Process</h3>
                                <div className="step-badge">{activePhase} / 6 Phases Complete</div>
                            </div>
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
                                                {phase.id === 1 && (
                                                    <div className="detailed-tokens">
                                                        <div className="token-list flex flex-wrap gap-3">
                                                            {[
                                                                { t: 'ID', v: 'position' }, { t: 'ASN', v: '=' },
                                                                { t: 'ID', v: 'initial' }, { t: 'PLS', v: '+' },
                                                                { t: 'ID', v: 'rate' }, { t: 'STR', v: '*' },
                                                                { t: 'NUM', v: '60' }
                                                            ].map((token, i) => (
                                                                <div key={i} className="token-item">
                                                                    <span className="token-type">{token.t}</span>
                                                                    <span className="token-value">{token.v}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {phase.id === 2 && (
                                                    <div className="detailed-syntax">
                                                        <pre className="code-block large">
{`[Statement]
└── [Assignment]
    ├── ID: position
    ├── OP: =
    └── [Expression]
        ├── ID: initial
        ├── OP: +
        └── [Term]
            ├── ID: rate
            ├── OP: *
            └── NUM: 60`}
                                                        </pre>
                                                    </div>
                                                )}
                                                {phase.id === 3 && (
                                                    <div className="detailed-semantic">
                                                        <div className="semantic-check-list flex flex-col gap-2">
                                                            <div className="check-item success">✓ Symbol Check: OK</div>
                                                            <div className="check-item success">✓ Type Check: (float) = (float) + (float) * (float) OK</div>
                                                            <div className="annotated-code p-4 bg-blue-900/10 border border-blue-500/20 rounded mt-2">
                                                                <code className="text-accent underline">float position = (float)initial + (float)rate * (float)60;</code>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {phase.id === 4 && (
                                                    <div className="detailed-tac">
                                                        <pre className="code-block tac-style font-bold">
                                                            {`t1 = rate * 60
t2 = initial + t1
position = t2`}
                                                        </pre>
                                                    </div>
                                                )}
                                                {phase.id === 5 && (
                                                    <div className="detailed-opt">
                                                        <div className="opt-box bg-green-900/10 border border-green-500/20 p-4 rounded">
                                                            <pre className="text-success font-bold">
                                                                {`t1 = rate * 60.0
position = initial + t1`}
                                                            </pre>
                                                            <p className="text-xs text-muted mt-2">Optimization: Copy propagation & Constant folding applied.</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {phase.id === 6 && (
                                                    <div className="detailed-asm">
                                                        <pre className="code-block assembly text-blue-400">
                                                            {`LDF   R2, rate
MULF  R2, R2, #60.0
ADDF  R1, R1, R2
STF   position, R1`}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
