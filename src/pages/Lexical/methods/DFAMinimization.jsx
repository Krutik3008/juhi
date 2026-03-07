import React, { useState } from 'react';
import { Hexagon, ArrowRight, Play, CheckCircle } from 'lucide-react';
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
        <div className="simulation-workspace">
            <div className="workspace-header">
                <h2><Hexagon size={24} className="inline-block mr-2" />DFA Minimization</h2>
                <p>Optimize a DFA by finding and merging equivalent states using the Partition Method.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

                {/* Partition Steps */}
                <div className="glass-panel p-6 flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3>Partition Algorithm execution</h3>
                        <div className="flex gap-2">
                            <button className="btn-secondary px-3 py-1 text-sm" onClick={handleReset} disabled={step === 0}>Reset</button>
                            <button className="btn-primary px-3 py-1 flex items-center gap-1 text-sm" onClick={handleNext} disabled={step === steps.length}>
                                {step === 0 ? <><Play size={14} /> Start</> : 'Next Step'} <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {step === 0 && (
                            <div className="text-center text-muted mt-20">Click Start to begin partitioning.</div>
                        )}
                        <AnimatePresence>
                            {steps.slice(0, step).map((s, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`p-4 rounded border border-gray-700 ${idx === step - 1 ? 'bg-purple-900/10 border-purple-500/50' : 'bg-gray-800/30'}`}
                                >
                                    <h4 className={`font-bold ${idx === step - 1 ? 'text-[var(--accent-primary)]' : 'text-gray-300'}`}>{s.title}</h4>
                                    <p className="text-sm text-gray-400 mt-1 mb-2">{s.desc}</p>

                                    {s.analysis && (
                                        <div className="text-sm bg-gray-900 p-2 rounded mb-2 font-mono text-gray-400 border border-gray-800">
                                            {s.analysis}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-3">
                                        <span className="font-mono text-white font-bold tracking-wide">{s.group}</span>
                                        <span className={`text-xs px-2 py-1 rounded bg-gray-800 ${idx === step - 1 ? 'text-accent' : 'text-gray-500'}`}>{s.note}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Visual state representation */}
                <div className="glass-panel p-6 h-[600px] flex flex-col">
                    <h3>State Optimization Visualizer</h3>
                    <p className="text-sm text-muted mb-6 mt-1">Watch states merge as the algorithm finds equivalences.</p>

                    <div className="flex-1 border border-gray-700 bg-gray-900/50 rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden">

                        {step === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-muted">Awaiting Simulation...</div>
                        )}

                        <AnimatePresence mode="wait">
                            {/* Stage 1: All 4 states (Step 1-4) */}
                            {(step > 0 && step < 5) && (
                                <motion.div
                                    key="stage1"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex flex-col items-center gap-8 w-full"
                                >
                                    <h4 className="text-center text-[var(--accent-primary)] font-mono mb-4">Current Partition States</h4>
                                    <div className="flex justify-center gap-8 w-full flex-wrap">
                                        <div className="w-16 h-16 rounded-full border-2 border-gray-500 flex items-center justify-center text-xl font-bold bg-gray-800">A</div>
                                        <div className="w-16 h-16 rounded-full border-2 border-gray-500 flex items-center justify-center text-xl font-bold bg-gray-800">B</div>
                                        <div className="w-16 h-16 rounded-full border-2 border-gray-500 flex items-center justify-center text-xl font-bold bg-gray-800">C</div>
                                        <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center text-xl font-bold bg-gray-800 shadow-[0_0_15px_rgba(34,197,94,0.3)]">D</div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Stage 2: Merge A & C (Step 5-6) */}
                            {step >= 5 && (
                                <motion.div
                                    key="stage2"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center gap-8 w-full"
                                >
                                    <h4 className="text-center text-success font-mono mb-4 flex items-center gap-2">
                                        <CheckCircle size={18} /> Minimized States
                                    </h4>
                                    <div className="flex justify-center gap-12 w-full">
                                        {/* Merged State */}
                                        <motion.div
                                            initial={{ width: 64, height: 64 }}
                                            animate={{ width: 80, height: 80 }}
                                            className="rounded-full border-2 border-purple-500 flex flex-col items-center justify-center font-bold bg-purple-900/30 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                                        >
                                            <span className="text-xl text-white">AC</span>
                                            <span className="text-[10px] text-gray-400">Merged</span>
                                        </motion.div>

                                        <div className="w-[80px] h-[80px] rounded-full border-2 border-gray-500 flex items-center justify-center text-xl font-bold bg-gray-800 text-white">B</div>
                                        <div className="w-[80px] h-[80px] rounded-full border-4 border-green-500 flex flex-col items-center justify-center font-bold bg-gray-800 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                            <span className="text-xl text-white">D</span>
                                            <span className="text-[10px] text-gray-400">Accept</span>
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
