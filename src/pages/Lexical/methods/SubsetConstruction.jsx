import React, { useState } from 'react';
import { Layers, Play, ArrowRight, CornerDownRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './SubsetConstruction.css';
import { motion, AnimatePresence } from 'framer-motion';

const SubsetConstruction = () => {
    const [step, setStep] = useState(0);
    const [isSimulating, setIsSimulating] = useState(false);

    // Mock steps for computing (a|b)*abb subset construction
    const steps = [
        {
            title: "1. Compute ε-closure of start state",
            desc: "Find all NFA states reachable from the start state (1) using only ε-transitions.",
            action: "ε-closure({1})",
            result: "{1, 2, 3, 4, 7} = A"
        },
        {
            title: "2. Compute transitions from state A for input 'a'",
            desc: "Move(A, a) -> {5, 8}. Then compute ε-closure({5, 8}).",
            action: "ε-closure(Move(A, a))",
            result: "{5, 8, 7, 2, 3, 4, 9} = B"
        },
        {
            title: "3. Compute transitions from state A for input 'b'",
            desc: "Move(A, b) -> {6}. Then compute ε-closure({6}).",
            action: "ε-closure(Move(A, b))",
            result: "{6, 7, 2, 3, 4} = C"
        },
        {
            title: "4. Compute transitions from state B for input 'a'",
            desc: "Move(B, a) -> {5, 8}. Then compute ε-closure({5, 8}).",
            action: "ε-closure(Move(B, a))",
            result: "{5, 8, 7, 2, 3, 4, 9} = B (Already exists)"
        },
        {
            title: "5. Compute transitions from state B for input 'b'",
            desc: "Move(B, b) -> {6, 9}. Then compute ε-closure({6, 9}).",
            action: "ε-closure(Move(B, b))",
            result: "{6, 9, 7, 2, 3, 4, 10} = D (Contains Accept State)"
        },
        { // Fast forward mock
            title: "6. Compilation Complete",
            desc: "Continue processing until no new states are generated. Mark D as an accepting state because it contains NFA accepting state {10}.",
            action: "D-States = {A, B, C, D}",
            result: "Transition Table Generated"
        }
    ];

    const handleNext = () => {
        if (!isSimulating) setIsSimulating(true);
        if (step < steps.length) {
            setStep(prev => prev + 1);
        }
    };

    const handleReset = () => {
        setIsSimulating(false);
        setStep(0);
    };

    return (
        <div className="unit-container">
            <div className="workspace-header">
                <h2>
                    <Link to="/unit1" className="back-link" title="Back to Unit I">
                        <ArrowLeft size={24} />
                    </Link>
                    <Layers size={28} className="header-icon" />
                    Subset Construction (NFA to DFA)
                </h2>
                <p>Transform a Non-Deterministic Finite Automaton into its equivalent Deterministic form.</p>
            </div>

            <div className="subset-content">

                {/* Simulation Controls & Steps */}
                <div className="glass-panel subset-panel">
                    <div className="panel-header">
                        <h3>computations for (a|b)*abb</h3>
                        <div className="panel-controls">
                            <button
                                className="btn-secondary control-btn"
                                onClick={handleReset}
                                disabled={step === 0}
                            >
                                Reset
                            </button>
                            <button
                                className="btn-primary control-btn"
                                onClick={handleNext}
                                disabled={step === steps.length}
                            >
                                {step === 0 ? <><Play size={14} /> Start</> : 'Next Step'} <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="steps-container">
                        {step === 0 && (
                            <div className="text-muted empty-steps">
                                Click Start to begin calculating ε-closures.
                            </div>
                        )}
                        <AnimatePresence>
                            {steps.slice(0, step).map((s, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`step-card ${idx === step - 1 ? 'active-step' : 'inactive-step'}`}
                                >
                                    <h4 className={`step-title ${idx === step - 1 ? 'active-title' : 'inactive-title'}`}>{s.title}</h4>
                                    <p className="step-desc">{s.desc}</p>

                                    <div className="step-computation">
                                        <div className="action-row">
                                            <span className="action-text">{s.action}</span>
                                        </div>
                                        <div className="result-row">
                                            <CornerDownRight size={14} className="result-icon" />
                                            {s.result}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Transition Table Result */}
                <div className="glass-panel subset-panel">
                    <h3>DFA Transition Table (D-Tran)</h3>
                    <p className="text-muted table-subtitle">The resulting deterministic transitions mapped from our subsets.</p>

                    <div className="table-wrapper">
                        <table className="data-table subset-table">
                            <thead>
                                <tr>
                                    <th>DFA State</th>
                                    <th>NFA States grouped</th>
                                    <th className="th-accent">Input 'a'</th>
                                    <th className="th-success">Input 'b'</th>
                                </tr>
                            </thead>
                            <tbody>
                                <motion.tr animate={{ opacity: step > 0 ? 1 : 0.2 }} className={step === 1 ? 'tr-computing' : ''}>
                                    <td className="td-state-col">A (Start)</td>
                                    <td className="td-nfa-col">1,2,3,4,7</td>
                                    <td>{step > 1 ? 'B' : '-'}</td>
                                    <td>{step > 2 ? 'C' : '-'}</td>
                                </motion.tr>
                                <motion.tr animate={{ opacity: step > 1 ? 1 : 0.2 }} className={step === 4 || step === 5 ? 'tr-computing' : ''}>
                                    <td className="td-state-col">B</td>
                                    <td className="td-nfa-col">5,8,7,2,3,4,9</td>
                                    <td>{step > 3 ? 'B' : '-'}</td>
                                    <td>{step > 4 ? 'D' : '-'}</td>
                                </motion.tr>
                                <motion.tr animate={{ opacity: step > 2 ? 1 : 0.2 }}>
                                    <td className="td-state-col">C</td>
                                    <td className="td-nfa-col">6,7,2,3,4</td>
                                    <td>{step > 5 ? 'B' : '-'}</td>
                                    <td>{step > 5 ? 'C' : '-'}</td>
                                </motion.tr>
                                <motion.tr animate={{ opacity: step > 4 ? 1 : 0.2 }} className={step === 6 ? 'tr-accepting' : ''}>
                                    <td className="td-accept-state">*D (Accept)</td>
                                    <td className="td-nfa-col">6,9,7,2,3,4,10</td>
                                    <td>{step > 5 ? 'B' : '-'}</td>
                                    <td>{step > 5 ? 'C' : '-'}</td>
                                </motion.tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SubsetConstruction;
