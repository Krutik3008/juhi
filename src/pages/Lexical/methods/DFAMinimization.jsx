import React, { useState } from 'react';
import { Hexagon, ArrowRight, Play, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './DFAMinimization.css';
import { motion, AnimatePresence } from 'framer-motion';

const DFAMinimization = () => {
    const [step, setStep] = useState(0);
    const [isSimulating, setIsSimulating] = useState(false);

    const steps = [
        {
            title: "1. Initial Partition (Π0)",
            desc: "Divide DFA states into two groups: Accepting states and Non-Accepting states.",
            group: "Π0 = { {A, B, C}, {D} }",
            note: "Accepting state D is isolated."
        },
        {
            title: "2. Analyze {A, B, C} on input 'a'",
            desc: "Where do these states go when given 'a'?",
            analysis: "A(a)→B, B(a)→B, C(a)→B. All map to group {A,B,C}.",
            group: "No split needed for 'a'",
            note: "Still {A, B, C}"
        },
        {
            title: "3. Analyze {A, B, C} on input 'b'",
            desc: "Where do these states go when given 'b'?",
            analysis: "A(b)→C, C(b)→C (maps to {A,B,C}). But B(b)→D (maps to {D}).",
            group: "State B behaves differently! It must be split.",
            note: "Split B from {A, C}"
        },
        {
            title: "4. New Partition (Π1)",
            desc: "Create new partition based on the split.",
            group: "Π1 = { {A, C}, {B}, {D} }",
            note: "We now have 3 groups."
        },
        {
            title: "5. Analyze {A, C} on inputs 'a' & 'b'",
            desc: "Let's check if {A, C} needs further splitting.",
            analysis: "A(a)→B, C(a)→B (Same group). A(b)→C, C(b)→C (Same group).",
            group: "A and C are indistinguishable.",
            note: "They can be merged into state AC."
        },
        {
            title: "6. Final Minimized DFA (Π_final)",
            desc: "No more splits are possible. Π1 is the final partition.",
            group: "States: AC, B, D",
            note: "Minimized from 4 states to 3 states!"
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
            <div className="workspace-header centered text-center">
                <h2>
                    <Link to="/unit1" className="back-link" title="Back to Unit I">
                        <ArrowLeft size={24} />
                    </Link>
                    <Binary size={28} className="header-icon" />
                    DFA Minimization
                </h2>
                <p>Convert a DFA with multiple states into its equivalent minimal form using state partitioning.</p>
            </div>

            <div className="dfa-content">

                {/* Partition Steps */}
                <div className="glass-panel dfa-panel">
                    <div className="panel-header">
                        <h3>Partition Algorithm execution</h3>
                        <div className="panel-controls">
                            <button className="btn-secondary control-btn" onClick={handleReset} disabled={step === 0}>Reset</button>
                            <button className="btn-primary control-btn" onClick={handleNext} disabled={step === steps.length}>
                                {step === 0 ? <><Play size={14} /> Start</> : 'Next Step'} <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="steps-container">
                        {step === 0 && (
                            <div className="empty-steps">Click Start to begin partitioning.</div>
                        )}
                        <AnimatePresence>
                            {steps.slice(0, step).map((s, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`step-card ${idx === step - 1 ? 'active-step' : 'inactive-step'}`}
                                >
                                    <h4 className={`step-title ${idx === step - 1 ? 'active-title' : 'inactive-title'}`}>{s.title}</h4>
                                    <p className="step-desc">{s.desc}</p>

                                    {s.analysis && (
                                        <div className="analysis-box">
                                            {s.analysis}
                                        </div>
                                    )}

                                    <div className="partition-row">
                                        <span className="partition-group">{s.group}</span>
                                        <span className={`partition-note ${idx === step - 1 ? 'active-note' : 'inactive-note'}`}>{s.note}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Visual state representation */}
                <div className="glass-panel dfa-panel">
                    <h3>State Optimization Visualizer</h3>
                    <p className="visualizer-subtitle">Watch states merge as the algorithm finds equivalences.</p>

                    <div className="visualizer-canvas">

                        {step === 0 && (
                            <div className="visualizer-awaiting">Awaiting Simulation...</div>
                        )}

                        <AnimatePresence mode="wait">
                            {/* Stage 1: All 4 states (Step 1-4) */}
                            {(step > 0 && step < 5) && (
                                <motion.div
                                    key="stage1"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="stage-container"
                                >
                                    <h4 className="stage-title">Current Partition States</h4>
                                    <div className="states-row">
                                        <div className="state-circle normal-state">A</div>
                                        <div className="state-circle normal-state">B</div>
                                        <div className="state-circle normal-state">C</div>
                                        <div className="state-circle accept-state">D</div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Stage 2: Merge A & C (Step 5-6) */}
                            {step >= 5 && (
                                <motion.div
                                    key="stage2"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="stage-container"
                                >
                                    <h4 className="stage-title success-title">
                                        <CheckCircle size={18} /> Minimized States
                                    </h4>
                                    <div className="states-row wide-gap">
                                        {/* Merged State */}
                                        <motion.div
                                            initial={{ width: 64, height: 64 }}
                                            animate={{ width: 80, height: 80 }}
                                            className="state-circle merged-state"
                                        >
                                            <span className="state-label">AC</span>
                                            <span className="state-sublabel">Merged</span>
                                        </motion.div>

                                        <div className="state-circle normal-state large-circle">B</div>
                                        <div className="state-circle accept-state large-circle flex-col">
                                            <span className="state-label">D</span>
                                            <span className="state-sublabel">Accept</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default DFAMinimization;
