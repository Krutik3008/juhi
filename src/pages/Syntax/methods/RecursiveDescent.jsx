import React, { useState } from 'react';
import { ArrowLeft, Code2, BookOpen, Play, RotateCcw, Eraser, Zap, ListChecks, Terminal, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import './RecursiveDescent.css';

// --- Logic Helpers ---

function tokenizeRHS(rhsString) {
    if (rhsString.trim() === 'ε' || rhsString.trim() === 'epsilon') return ['ε'];
    if (rhsString.includes(' ')) return rhsString.trim().split(/\s+/);

    const tokens = [];
    let current = '';

    for (let i = 0; i < rhsString.length; i++) {
        const char = rhsString[i];
        if (/\s/.test(char)) continue;

        if (/[A-Z]/.test(char)) {
            if (current) tokens.push(current);
            current = char;
            while (i + 1 < rhsString.length && /[']/.test(rhsString[i + 1])) {
                current += rhsString[++i];
            }
            tokens.push(current);
            current = '';
        } else if (/[a-z0-9]/.test(char)) {
            current += char;
        } else {
            if (current) {
                tokens.push(current);
                current = '';
            }
            tokens.push(char);
        }
    }
    if (current) tokens.push(current);
    return tokens.length > 0 ? tokens : ['ε'];
}

function parseGrammar(text) {
    const rules = [];
    const lines = text.split('\n').filter(l => l.trim() !== '');
    lines.forEach(line => {
        const [lhs, rhsPart] = line.split('->').map(s => s.trim());
        if (!lhs || !rhsPart) return;
        const alternatives = rhsPart.split('|').map(alt => tokenizeRHS(alt));
        rules.push({ lhs, alternatives });
    });
    return rules;
}

const RecursiveDescent = () => {
    const examples = [
        {
            name: "Basic Example (Image)",
            grammar: "X -> char Y\nY -> + char Y | ε"
        },
        {
            name: "Arithmetic Subset",
            grammar: "E -> T E'\nE' -> + T E' | ε\nT -> id"
        },
        {
            name: "Balanced Parentheses",
            grammar: "S -> ( S ) | a"
        }
    ];

    const [grammarText, setGrammarText] = useState(examples[0].grammar);
    const [activeStage, setActiveStage] = useState('config'); // 'config', 'simulation'
    const [rules, setRules] = useState([]);
    const [error, setError] = useState("");

    const handleCompute = () => {
        try {
            setError("");
            const parsedRules = parseGrammar(grammarText);
            if (parsedRules.length === 0) throw new Error("Invalid grammar format. Use: A -> B | c");
            setRules(parsedRules);
            setActiveStage('simulation');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleClear = () => {
        setGrammarText("");
        setRules([]);
        setActiveStage('config');
        setError("");
    };

    const loadExample = () => {
        const nextIdx = (examples.findIndex(e => e.grammar === grammarText) + 1) % examples.length;
        setGrammarText(examples[nextIdx].grammar);
        setRules([]);
        setActiveStage('config');
    };

    const isNonTerminal = (sym) => /^[A-Z][']*$/.test(sym);

    const renderProcedureCode = (rule, isStart) => {
        const lines = [];
        lines.push(<span className="rd-line" key="open">{`{`}</span>);

        rule.alternatives.forEach((alt, idx) => {
            const isEpsilon = alt[0] === 'ε';
            const firstSym = alt[0];
            const isNT = isNonTerminal(firstSym);

            if (rule.alternatives.length > 1) {
                if (isEpsilon) {
                    lines.push(<span className="rd-line rd-indent-1" key={`else-null-${idx}`}><span className="kw">else</span></span>);
                    lines.push(<span className="rd-line rd-indent-2" key={`null-${idx}`}><span className="cmt">NULL; // ε production</span></span>);
                } else {
                    const prefix = idx === 0 ? "if" : "else if";
                    lines.push(
                        <span className="rd-line rd-indent-1" key={`if-alt-${idx}`}>
                            <span className="kw">{prefix}</span> <span className="var">lookahead</span> <span className="op">=</span> <span className="str">{isNT ? `FIRST(${firstSym})` : `'${firstSym}'`}</span>
                        </span>
                    );
                    lines.push(<span className="rd-line rd-indent-1" key={`open-alt-${idx}`}>{`{`}</span>);
                    alt.forEach((sym, sidx) => {
                        if (sym === 'ε') return;
                        if (isNonTerminal(sym)) {
                            lines.push(<span className="rd-line rd-indent-2" key={`call-${idx}-${sidx}`}><span className="fn">{sym}</span>();</span>);
                        } else {
                            lines.push(<span className="rd-line rd-indent-2" key={`match-${idx}-${sidx}`}><span className="fn">Match</span>(<span className="str">{`'${sym}'`}</span>);</span>);
                        }
                    });
                    lines.push(<span className="rd-line rd-indent-1" key={`close-alt-${idx}`}>{`}`}</span>);
                }
            } else {
                // Single alternative
                alt.forEach((sym, sidx) => {
                    if (sidx === 0) {
                        if (isNonTerminal(sym)) {
                            lines.push(<span className="rd-line rd-indent-1" key={`call-${idx}-${sidx}`}><span className="fn">{sym}</span>();</span>);
                        } else {
                            // Wrapper if for terminal
                            lines.push(<span className="rd-line rd-indent-1" key={`if-term`}><span className="kw">if</span> <span className="var">lookahead</span> <span className="op">=</span> <span className="str">{`'${sym}'`}</span></span>);
                            lines.push(<span className="rd-line rd-indent-1" key={`open-term`}>{`{`}</span>);
                            lines.push(<span className="rd-line rd-indent-2" key={`match-term`}><span className="fn">Match</span>(<span className="str">{`'${sym}'`}</span>);</span>);
                        }
                    } else {
                        if (isNonTerminal(sym)) {
                            lines.push(<span className="rd-line rd-indent-2" key={`call-${idx}-${sidx}`}><span className="fn">{sym}</span>();</span>);
                        } else {
                            lines.push(<span className="rd-line rd-indent-2" key={`match-${idx}-${sidx}`}><span className="fn">Match</span>(<span className="str">{`'${sym}'`}</span>);</span>);
                        }
                    }
                });
                if (alt.length > 0 && !isNonTerminal(alt[0])) {
                    lines.push(<span className="rd-line rd-indent-1" key={`close-term`}>{`}`}</span>);
                    lines.push(<span className="rd-line rd-indent-1" key={`else-err`}><span className="kw">else</span></span>);
                    lines.push(<span className="rd-line rd-indent-2" key={`err-err`}><span className="err">Error</span>();</span>);
                }
            }
        });

        // Error handler for multiple alternatives if no epsilon
        if (rule.alternatives.length > 1 && !rule.alternatives.some(a => a[0] === 'ε')) {
            lines.push(<span className="rd-line rd-indent-1" key="else-error"><span className="kw">else</span></span>);
            lines.push(<span className="rd-line rd-indent-2" key="call-error"><span className="err">Error</span>();</span>);
        }

        if (isStart) {
            lines.push(<span className="rd-line rd-indent-1 mt-4" key="if-eof"><span className="kw">if</span> <span className="var">lookahead</span> <span className="op">=</span> <span className="str">'$'</span></span>);
            lines.push(<span className="rd-line rd-indent-1" key="open-eof">{`{`}</span>);
            lines.push(<span className="rd-line rd-indent-2" key="success"><span className="success">Declare success;</span></span>);
            lines.push(<span className="rd-line rd-indent-1" key="close-eof">{`}`}</span>);
            lines.push(<span className="rd-line rd-indent-1" key="else-eof"><span className="kw">else</span></span>);
            lines.push(<span className="rd-line rd-indent-2" key="err-eof"><span className="err">Error</span>();</span>);
        }

        lines.push(<span className="rd-line" key="close">{`}`}</span>);
        return lines;
    };

    return (
        <div className="rd-unit-container">
            <div className="rd-workspace-header">
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Link to="/unit2-3" className="rd-back-link" title="Back to Syntax Unit">
                        <ArrowLeft size={24} />
                    </Link>
                    <Code2 size={28} className="rd-header-icon" />
                    Recursive Descent Parsing
                </motion.h2>
                <div className="flex justify-between items-end">
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                        Top-down parsing where each non-terminal has a corresponding procedure that recognizes its strings.
                    </motion.p>
                </div>
            </div>

            <div className="rd-main-grid">
                {/* Configuration Panel */}
                <div className="rd-rc-panel mb-8">
                    <div className="rd-input-header">
                        <h3><Zap size={20} className="text-indigo-400" /> Grammar Rules</h3>
                        <button className="rd-btn-sm" onClick={loadExample}>Example Change</button>
                    </div>
                    <textarea
                        className="rd-main-input"
                        value={grammarText}
                        onChange={(e) => setGrammarText(e.target.value)}
                        disabled={activeStage !== 'config'}
                        placeholder="E -> T E'&#10;E' -> + T E' | ε"
                    />
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}
                    <div className="rd-actions-row">
                        {activeStage === 'config' ? (
                            <button className="rd-btn rd-btn-primary" onClick={handleCompute}>
                                <Play size={18} /> Generate Procedures
                            </button>
                        ) : (
                            <button className="rd-btn rd-btn-secondary" onClick={() => setActiveStage('config')}>
                                <RotateCcw size={18} /> Edit Grammar
                            </button>
                        )}
                        <button className="rd-btn rd-btn-secondary" onClick={handleClear}>
                            <Eraser size={18} /> Clear Input
                        </button>
                    </div>
                </div>

                {/* Journey Tracker */}
                <div className="rd-journey-tracker">
                    <div className="rd-phases-container">
                        {[
                            { id: 1, title: 'CFG Input', desc: 'Define grammar', stage: 'config' },
                            { id: 2, title: 'Procedures', desc: 'Code generation', stage: 'simulation' },
                            { id: 3, title: 'Parsing Logic', desc: 'Final execution', stage: 'simulation' }
                        ].map((phase, idx, arr) => {
                            const isActive = activeStage === phase.stage && (idx === 0 || activeStage === 'simulation');
                            const isCompleted = activeStage === 'simulation' && phase.id < 3;
                            return (
                                <React.Fragment key={phase.id}>
                                    <div className={`rd-phase-box ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                                        <div className="rd-phase-num">{phase.id}</div>
                                        <div className="rd-phase-info">
                                            <h4>{phase.title}</h4>
                                            <p>{phase.desc}</p>
                                        </div>
                                    </div>
                                    {idx < arr.length - 1 && <span className={`rd-phase-arrow ${isCompleted ? 'active' : ''}`}>→</span>}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence>
                    {activeStage === 'simulation' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className="rd-definition-card">
                                <div className="rd-section-title">
                                    <div className="rd-section-icon"><BookOpen size={20} /></div>
                                    Grammar Overview
                                </div>
                                <div className="rd-grammar-rules">
                                    {rules.map((r, i) => (
                                        <div key={i} className="rd-grammar-rule">
                                            <span className="rd-nt">{r.lhs}</span>
                                            <span className="rd-arrow">→</span>
                                            {r.alternatives.map((alt, ai) => (
                                                <span key={ai}>
                                                    <span className={alt[0] === 'ε' ? 'rd-epsilon' : 'rd-terminal'}>{alt.join(' ')}</span>
                                                    {ai < r.alternatives.length - 1 && <span className="rd-pipe">|</span>}
                                                </span>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rd-procedures-grid">
                                {rules.map((rule, idx) => (
                                    <motion.div
                                        key={idx}
                                        className="rd-procedure-card"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                    >
                                        <div className="rd-procedure-header">
                                            <div className="rd-procedure-name">
                                                <span className="rd-keyword">Procedure</span>
                                                <span className="rd-fname">{rule.lhs}</span>
                                            </div>
                                            <span className={`rd-procedure-badge ${idx === 0 ? 'main' : 'recursive'}`}>
                                                {idx === 0 ? 'Main' : 'Sub-Routine'}
                                            </span>
                                        </div>
                                        <div className="rd-code-block">
                                            {renderProcedureCode(rule, idx === 0)}
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Helper Procedure: Match */}
                                <motion.div className="rd-procedure-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                                    <div className="rd-procedure-header">
                                        <div className="rd-procedure-name">
                                            <span className="rd-keyword">Procedure</span>
                                            <span className="rd-fname">Match</span>
                                            <span className="rd-params">(token t)</span>
                                        </div>
                                        <span className="rd-procedure-badge helper">Helper</span>
                                    </div>
                                    <div className="rd-code-block">
                                        <span className="rd-line">{`{`}</span>
                                        <span className="rd-line rd-indent-1"><span className="kw">if</span> <span className="var">lookahead</span> <span className="op">=</span> <span className="var">t</span></span>
                                        <span className="rd-line rd-indent-2"><span className="var">lookahead</span> <span className="op">=</span> <span className="fn">next_token</span>;</span>
                                        <span className="rd-line rd-indent-1"><span className="kw">else</span></span>
                                        <span className="rd-line rd-indent-2"><span className="err">Error</span>();</span>
                                        <span className="rd-line">{`}`}</span>
                                    </div>
                                </motion.div>

                                {/* Helper Procedure: Error */}
                                <motion.div className="rd-procedure-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
                                    <div className="rd-procedure-header">
                                        <div className="rd-procedure-name">
                                            <span className="rd-keyword">Procedure</span>
                                            <span className="rd-fname">Error</span>
                                        </div>
                                        <span className="rd-procedure-badge error-badge">System</span>
                                    </div>
                                    <div className="rd-code-block">
                                        <span className="rd-line">{`{`}</span>
                                        <span className="rd-line rd-indent-1"><span className="fn">print</span>(<span className="str">"Syntax Error"</span>);</span>
                                        <span className="rd-line rd-indent-1"><span className="kw">exit</span>(1);</span>
                                        <span className="rd-line">{`}`}</span>
                                    </div>
                                </motion.div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                className="rd-definition-card mt-12 bg-gray-900/80 border border-gray-700/50"
                            >
                                <h4 className="text-white mb-3 font-semibold flex items-center gap-2 text-lg">
                                    <Sparkles size={18} className="text-indigo-400" /> Computation Notes
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 text-base">
                                    <li><strong>Recursive Descent</strong> is a top-down parsing technique where each non-terminal has a procedure.</li>
                                    <li><strong>Match(t)</strong> function ensures the current lookahead token matched terminal 't' and moves to next token.</li>
                                    <li><strong>Error()</strong> is called when the current lookahead does not match any expected terminal or non-terminal start.</li>
                                    <li><strong>'$'</strong> is the end-of-input marker, check for it at the end of the start symbol procedure to ensure full string consumption.</li>
                                </ul>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="rd-bottom-spacer" />
        </div>
    );
};

export default RecursiveDescent;
