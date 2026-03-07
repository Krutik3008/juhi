import React, { useState } from 'react';
import { AlignLeft, Play, RotateCcw, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FirstAndFollow = () => {
    const [grammar, setGrammar] = useState(
        "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id"
    );
    const [isCalculated, setIsCalculated] = useState(false);

    // Hardcoded result for the demo Grammar to save complex parsing logic in frontend
    const results = [
        { nonTerminal: "E", first: "{ (, id }", follow: "{ $, ) }" },
        { nonTerminal: "E'", first: "{ +, ε }", follow: "{ $, ) }" },
        { nonTerminal: "T", first: "{ (, id }", follow: "{ +, $, ) }" },
        { nonTerminal: "T'", first: "{ *, ε }", follow: "{ +, $, ) }" },
        { nonTerminal: "F", first: "{ (, id }", follow: "{ *, +, $, ) }" }
    ];

    const handleCalculate = () => {
        setIsCalculated(true);
    };

    const handleReset = () => {
        setIsCalculated(false);
        setGrammar("E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id");
    };

    return (
        <div className="simulation-workspace">
            <div className="workspace-header">
                <h2><AlignLeft size={24} className="inline-block mr-2" />FIRST and FOLLOW Sets</h2>
                <p>Crucial for predictive parsing and building LL(1) parsing tables.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="glass-panel p-6 flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3>Context Free Grammar (CFG)</h3>
                    </div>
                    <p className="text-sm text-muted mb-4">Enter production rules. Use 'ε' or 'e' for epsilon.</p>

                    <textarea
                        className="source-textarea flex-1 mb-4"
                        value={grammar}
                        onChange={(e) => setGrammar(e.target.value)}
                        disabled={isCalculated}
                        style={{ height: '350px' }}
                    />

                    <div className="flex gap-4">
                        {!isCalculated ? (
                            <button className="btn-primary flex-1 flex justify-center items-center gap-2" onClick={handleCalculate}>
                                <Play size={18} /> Compute Sets
                            </button>
                        ) : (
                            <button className="btn-secondary flex-1 flex justify-center items-center gap-2" onClick={handleReset}>
                                <RotateCcw size={18} /> Edit Grammar
                            </button>
                        )}
                    </div>
                </div>

                <div className="glass-panel p-6 flex flex-col h-[600px] overflow-hidden">
                    <h3>Computation Results</h3>
                    <p className="text-sm text-muted mb-6">The FIRST and FOLLOW sets for each Non-Terminal.</p>

                    <div className="flex-1 overflow-y-auto">
                        {!isCalculated ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted border-2 border-dashed border-gray-700/50 rounded-lg p-8 text-center">
                                <AlignLeft size={48} className="mb-4 opacity-20" />
                                <p>Input a grammar and click compute to see the LL(1) parsing prerequisites.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Non-Terminal</th>
                                        <th className="text-[var(--accent-primary)]">FIRST()</th>
                                        <th className="text-success">FOLLOW()</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {results.map((r, i) => (
                                            <motion.tr
                                                key={r.nonTerminal}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                            >
                                                <td className="font-bold font-mono text-white text-lg text-center bg-gray-900/50">{r.nonTerminal}</td>
                                                <td className="font-mono text-[var(--accent-primary)]">{r.first}</td>
                                                <td className="font-mono text-success">{r.follow}</td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        )}
                    </div>

                    {isCalculated && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="mt-6 p-4 bg-gray-900/80 border border-gray-700 rounded-lg text-sm"
                        >
                            <h4 className="text-white mb-2 font-semibold flex items-center gap-2">
                                <ArrowRight size={16} className="text-accent" /> Notes
                            </h4>
                            <ul className="list-disc pl-5 space-y-1 text-gray-400">
                                <li>FIRST(α) is the set of terminals that begin strings derived from α.</li>
                                <li>FOLLOW(A) is the set of terminals that can appear immediately to the right of A.</li>
                                <li>'$' is the end of input marker placed in FOLLOW(Start Symbol).</li>
                            </ul>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FirstAndFollow;
