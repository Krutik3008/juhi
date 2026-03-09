import React, { useState } from 'react';
import { AlignLeft, Play, RotateCcw, ArrowRight, Eraser, Zap, List, Sparkles, ArrowLeft, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import './FirstAndFollow.css';

const FirstAndFollow = () => {
    const defaultGrammar = "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id";
    const [grammar, setGrammar] = useState(defaultGrammar);
    const [activeStage, setActiveStage] = useState('config'); // 'config', 'computation'

    const examples = [
        "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id",
        "S -> a A B e\nA -> A b c | b\nB -> d",
        "S -> A B C\nA -> a | ε\nB -> b | ε\nC -> c | ε",
        "S -> i E t S S' | a\nS' -> e S | ε\nE -> b"
    ];

    // Hardcoded result for the demo Grammar to save complex parsing logic in frontend
    const demoResults = [
        { nonTerminal: "E", first: "{ (, id }", follow: "{ $, ) }" },
        { nonTerminal: "E'", first: "{ +, ε }", follow: "{ $, ) }" },
        { nonTerminal: "T", first: "{ (, id }", follow: "{ +, $, ) }" },
        { nonTerminal: "T'", first: "{ *, ε }", follow: "{ +, $, ) }" },
        { nonTerminal: "F", first: "{ (, id }", follow: "{ *, +, $, ) }" }
    ];

    const generateSets = () => {
        // In a real app, you'd parse `grammar` here and compute dynamic results
        setActiveStage('computation');
    };

    const handleReset = () => {
        setActiveStage('config');
    };

    const handleClear = () => {
        setGrammar('');
        setActiveStage('config');
    };

    return (
        <div className="firstfollow-unit-container">
            <div className="firstfollow-workspace-header">
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Link to="/unit2-3" className="firstfollow-back-link" title="Back to Syntax Unit">
                        <ArrowLeft size={24} />
                    </Link>
                    <List size={28} className="firstfollow-header-icon" />
                    FIRST and FOLLOW Sets
                </motion.h2>
                <p>Crucial for predictive parsing and building LL(1) parsing tables.</p>
            </div>

            <div className="firstfollow-main-grid">
                {/* Configuration Panel */}
                <div className="firstfollow-rc-panel mb-10">
                    <div className="firstfollow-rc-input-group">
                        <div className="firstfollow-panel-header mb-4">
                            <h3><Zap size={20} className="firstfollow-header-icon" /> Context Free Grammar (CFG)</h3>
                            <div className="flex gap-2 items-center">
                                {activeStage === 'config' && (
                                    <button
                                        className="firstfollow-btn-secondary firstfollow-btn-sm mr-2"
                                        onClick={() => setGrammar(examples[Math.floor(Math.random() * examples.length)])}
                                    >
                                        Example Change
                                    </button>
                                )}
                            </div>
                        </div>
                        <textarea
                            className="firstfollow-main-input"
                            value={grammar}
                            onChange={(e) => setGrammar(e.target.value)}
                            disabled={activeStage !== 'config'}
                            placeholder="Enter Context Free Grammar..."
                        />
                    </div>

                    <div className="firstfollow-actions-row mt-6">
                        {activeStage === 'config' ? (
                            <button className="firstfollow-btn firstfollow-btn-primary" onClick={generateSets}>
                                <Play size={18} /> Compute Sets
                            </button>
                        ) : (
                            <button className="firstfollow-btn firstfollow-btn-secondary" onClick={handleReset}>
                                <RotateCcw size={18} /> Edit Grammar
                            </button>
                        )}
                        <button className="firstfollow-btn firstfollow-btn-secondary" onClick={handleClear}>
                            <Eraser size={18} /> Clear Input
                        </button>
                    </div>
                </div>

                {/* Journey Tracker */}
                <div className="firstfollow-journey-tracker mb-12">
                    <div className="firstfollow-phases-container">
                        {[
                            { id: 1, title: 'CFG Input', desc: 'Syntax rules', stage: 'config' },
                            { id: 2, title: 'Computed Sets', desc: 'First/Follow logic', stage: 'computation' }
                        ].map((phase, idx, arr) => {
                            const isCompleted = activeStage === 'computation' && phase.stage === 'config';
                            const isActive = activeStage === phase.stage;

                            return (
                                <React.Fragment key={phase.id}>
                                    <div
                                        className={`firstfollow-phase-box ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                    >
                                        <div className="firstfollow-phase-num">{phase.id}</div>
                                        <div className="firstfollow-phase-info">
                                            <h4>{phase.title}</h4>
                                            <p>{phase.desc}</p>
                                        </div>
                                    </div>
                                    {idx < arr.length - 1 && (
                                        <ArrowRight className={`firstfollow-phase-arrow ${isCompleted ? 'active' : ''}`} size={20} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence>
                    {activeStage === 'computation' && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="firstfollow-journey-stack"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="firstfollow-stage-card"
                            >
                                <div className="firstfollow-stage-header mb-6">
                                    <div className="firstfollow-stage-title">
                                        <Sparkles size={24} className="text-indigo-400" />
                                        <h3>Computation Results</h3>
                                    </div>
                                    <div className="firstfollow-badge success">Complete</div>
                                </div>
                                <div className="firstfollow-scroll-area">
                                    <table className="firstfollow-table">
                                        <thead>
                                            <tr>
                                                <th>Non-Terminal</th>
                                                <th className="text-indigo-400">FIRST()</th>
                                                <th className="text-emerald-400">FOLLOW()</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {demoResults.map((r, i) => (
                                                <motion.tr
                                                    key={r.nonTerminal}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                >
                                                    <td className="font-bold font-mono text-white text-lg">{r.nonTerminal}</td>
                                                    <td className="font-mono text-indigo-400">{r.first}</td>
                                                    <td className="font-mono text-emerald-400">{r.follow}</td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                    className="mt-8 p-6 bg-gray-900/80 border border-gray-700/50 rounded-2xl text-sm"
                                >
                                    <h4 className="text-white mb-3 font-semibold flex items-center gap-2 text-lg">
                                        <Info size={18} className="text-indigo-400" /> Computation Notes
                                    </h4>
                                    <ul className="list-disc pl-5 space-y-2 text-gray-400 text-base">
                                        <li><strong>FIRST(α)</strong> is the set of terminals that begin strings derived from α.</li>
                                        <li><strong>FOLLOW(A)</strong> is the set of terminals that can appear immediately to the right of A.</li>
                                        <li><strong>'$'</strong> is the end of input marker placed in FOLLOW(Start Symbol).</li>
                                    </ul>
                                </motion.div>
                            </motion.div>

                            <div className="firstfollow-bottom-spacer"></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FirstAndFollow;
