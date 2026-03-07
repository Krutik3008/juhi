import React, { useState } from 'react';
import { Code, Play, RotateCcw, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ThreeAddressCode = () => {
    const [expression, setExpression] = useState('position = initial + rate * 60');
    const [isGenerating, setIsGenerating] = useState(false);
    const [step, setStep] = useState(0);

    const steps = [
        { op: '*', arg1: 'rate', arg2: '60', result: 't1', desc: 'Multiply rate by 60' },
        { op: '+', arg1: 'initial', arg2: 't1', result: 't2', desc: 'Add initial to t1' },
        { op: '=', arg1: 't2', arg2: '', result: 'position', desc: 'Assign t2 to position' }
    ];

    const handleGenerate = () => {
        setIsGenerating(true);
        setStep(0);
        const interval = setInterval(() => {
            setStep(s => {
                if (s >= steps.length - 1) {
                    clearInterval(interval);
                    return steps.length;
                }
                return s + 1;
            });
        }, 1000);
    };

    const handleReset = () => {
        setIsGenerating(false);
        setStep(0);
    };

    return (
        <div className="simulation-workspace">
            <div className="workspace-header">
                <h2><Code size={24} className="inline-block mr-2" />Three-Address Code (TAC) Generation</h2>
                <p>Convert the syntax tree into a linear sequence of abstract machine instructions.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="glass-panel p-6 h-[600px] flex flex-col">
                    <h3>Source Expression</h3>
                    <p className="text-sm text-muted mb-6">Enter an arithmetic assignment statement.</p>

                    <div className="bg-gray-900 border border-gray-700 rounded p-4 mb-6">
                        <input
                            type="text"
                            className="w-full bg-transparent text-white font-mono text-lg border-none focus:outline-none placeholder-gray-600"
                            value={expression}
                            onChange={e => setExpression(e.target.value)}
                            disabled={isGenerating}
                            placeholder="e.g. x = y + z * w"
                        />
                    </div>

                    <div className="flex gap-4 mb-8">
                        {!isGenerating ? (
                            <button className="btn-primary flex-1 flex justify-center items-center gap-2" onClick={handleGenerate}>
                                <Play size={18} /> Generate TAC
                            </button>
                        ) : (
                            <button className="btn-secondary flex-1 flex justify-center items-center gap-2" onClick={handleReset}>
                                <RotateCcw size={18} /> Reset Generator
                            </button>
                        )}
                    </div>


                    {step > 0 && (
                        <>
                            <h4 className="mb-4">Quadruple Representation</h4>
                            <div className="flex-1 overflow-y-auto">
                                <table className="data-table font-mono text-sm">
                                    <thead>
                                        <tr>
                                            <th>Op</th>
                                            <th>Arg1</th>
                                            <th>Arg2</th>
                                            <th>Result</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {steps.slice(0, step).map((s, i) => (
                                                <motion.tr
                                                    key={i}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                >
                                                    <td className="text-accent font-bold text-center">{s.op}</td>
                                                    <td className="text-gray-300 text-center">{s.arg1}</td>
                                                    <td className="text-gray-300 text-center">{s.arg2 || '-'}</td>
                                                    <td className="text-success font-bold text-center">{s.result}</td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                <div className="glass-panel p-6 h-[600px] flex flex-col relative overflow-hidden">
                    <h3 className="mb-6 border-b border-gray-700 pb-2">Generated Instructions</h3>

                    {!isGenerating ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted opacity-40">
                            <Box size={48} className="mb-4" />
                            <p>TAC instructions will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1">
                            <AnimatePresence>
                                {steps.slice(0, step).map((s, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-[#0d1117] border border-gray-700 p-4 rounded-lg font-mono text-lg flex items-center shadow-md relative"
                                    >
                                        {/* Line number */}
                                        <span className="text-gray-600 mr-4 text-sm w-6">{(i + 1).toString().padStart(2, '0')}</span>

                                        {/* Instruction */}
                                        {s.op === '=' ? (
                                            <span>
                                                <span className="text-success">{s.result}</span> <span className="text-accent">=</span> <span className="text-white">{s.arg1}</span>
                                            </span>
                                        ) : (
                                            <span>
                                                <span className="text-success">{s.result}</span> <span className="text-accent">=</span> <span className="text-white">{s.arg1}</span> <span className="text-accent">{s.op}</span> <span className="text-white">{s.arg2}</span>
                                            </span>
                                        )}

                                        {/* Description Tooltip-esque Note */}
                                        <div className="absolute right-4 text-xs font-sans text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                            {s.desc}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThreeAddressCode;
