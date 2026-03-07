import React, { useState } from 'react';
import { Layers, Play, ArrowRight, CornerDownRight } from 'lucide-react';
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
        <div className="simulation-workspace">
            <div className="workspace-header">
                <h2><Layers size={24} className="inline-block mr-2" />Subset Construction (NFA to DFA)</h2>
                <p>Compute ε-closures to group NFA states into single discrete DFA states.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

                {/* Simulation Controls & Steps */}
                <div className="glass-panel p-6 flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3>computations for (a|b)*abb</h3>
                        <div className="flex gap-2">
                            <button
                                className="btn-secondary px-3 py-1 text-sm"
                                onClick={handleReset}
                                disabled={step === 0}
                            >
                                Reset
                            </button>
                            <button
                                className="btn-primary px-3 py-1 flex items-center gap-1 text-sm"
                                onClick={handleNext}
                                disabled={step === steps.length}
                            >
                                {step === 0 ? <><Play size={14} /> Start</> : 'Next Step'} <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {step === 0 && (
                            <div className="text-center text-muted mt-20">
                                Click Start to begin calculating ε-closures.
                            </div>
                        )}
                        <AnimatePresence>
                            {steps.slice(0, step).map((s, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`p-4 rounded border border-gray-700 ${idx === step - 1 ? 'bg-blue-900/10 border-blue-500/50' : 'bg-gray-800/30'}`}
                                >
                                    <h4 className={`font-bold ${idx === step - 1 ? 'text-accent' : 'text-gray-300'}`}>{s.title}</h4>
                                    <p className="text-sm text-gray-400 mt-1 mb-3">{s.desc}</p>

                                    <div className="bg-gray-900 rounded p-3 font-mono text-sm border border-gray-800">
                                        <div className="flex items-center text-gray-300">
                                            <span className="text-purple-400 font-bold mr-2">{s.action}</span>
                                        </div>
                                        <div className="flex items-center mt-2 pl-4 text-green-400 font-bold">
                                            <CornerDownRight size={14} className="mr-2 opacity-50" />
                                            {s.result}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Transition Table Result */}
                <div className="glass-panel p-6 flex flex-col h-[600px]">
                    <h3>DFA Transition Table (D-Tran)</h3>
                    <p className="text-sm text-muted mb-6">The resulting deterministic transitions mapped from our subsets.</p>

                    <div className="flex-1">
                        <table className="data-table w-full text-center">
                            <thead>
                                <tr>
                                    <th className="text-center">DFA State</th>
                                    <th className="text-center">NFA States grouped</th>
                                    <th className="text-center text-accent">Input 'a'</th>
                                    <th className="text-center text-success">Input 'b'</th>
                                </tr>
                            </thead>
                            <tbody>
                                <motion.tr animate={{ opacity: step > 0 ? 1 : 0.2 }} className={step === 1 ? 'bg-blue-900/20' : ''}>
                                    <td className="font-bold text-white">A (Start)</td>
                                    <td className="text-xs text-gray-400 font-mono">1,2,3,4,7</td>
                                    <td>{step > 1 ? 'B' : '-'}</td>
                                    <td>{step > 2 ? 'C' : '-'}</td>
                                </motion.tr>
                                <motion.tr animate={{ opacity: step > 1 ? 1 : 0.2 }} className={step === 4 || step === 5 ? 'bg-blue-900/20' : ''}>
                                    <td className="font-bold text-white">B</td>
                                    <td className="text-xs text-gray-400 font-mono">5,8,7,2,3,4,9</td>
                                    <td>{step > 3 ? 'B' : '-'}</td>
                                    <td>{step > 4 ? 'D' : '-'}</td>
                                </motion.tr>
                                <motion.tr animate={{ opacity: step > 2 ? 1 : 0.2 }}>
                                    <td className="font-bold text-white">C</td>
                                    <td className="text-xs text-gray-400 font-mono">6,7,2,3,4</td>
                                    <td>{step > 5 ? 'B' : '-'}</td>
                                    <td>{step > 5 ? 'C' : '-'}</td>
                                </motion.tr>
                                <motion.tr animate={{ opacity: step > 4 ? 1 : 0.2 }} className={step === 6 ? 'bg-green-900/20 border-green-500/30' : ''}>
                                    <td className="font-bold text-green-400">*D (Accept)</td>
                                    <td className="text-xs text-gray-400 font-mono">6,9,7,2,3,4,10</td>
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
