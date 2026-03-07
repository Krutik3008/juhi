import React, { useState } from 'react';
import { Settings, Database, Server } from 'lucide-react';
import { motion } from 'framer-motion';

const RunTimeHome = () => {
    return (
        <div className="unit-container">
            <div className="page-header">
                <h1 className="page-title">Unit V: Run-Time Environment</h1>
                <p className="page-description">
                    Managing memory allocation, managing data spaces during execution, and symbol table management.
                </p>
            </div>

            <div className="content-section">
                <div className="glass-panel mt-6 p-8 text-center flex flex-col items-center justify-center max-w-4xl mx-auto" style={{ height: '500px' }}>

                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center mb-8 relative shadow-lg">
                        <Database size={48} className="text-gray-400" />
                        <motion.div
                            animate={{ y: [-5, 5, -5] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-4 -right-4 bg-gray-800 border border-gray-700 rounded-full p-2 text-accent"
                        >
                            <Settings size={20} />
                        </motion.div>
                    </div>

                    <h3 className="text-2xl mb-4 font-bold text-white">Storage Allocation & Symbol Table</h3>
                    <p className="text-muted max-w-2xl mb-8 leading-relaxed">
                        To execute generated target code, the compiler specifies how storage should be allocated for variables. This involves dividing memory into areas for target code, static data, a heap, and a stack.
                    </p>

                    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="flex flex-col gap-4">
                            <div className="glass-panel p-4 border-[var(--accent-primary)] bg-[rgba(88,166,255,0.05)] text-left">
                                <h4 className="text-[var(--accent-primary)] font-bold mb-2">Static Allocation</h4>
                                <p className="text-sm text-gray-400">Memory determined at compile time. No recursion.</p>
                            </div>
                            <div className="glass-panel p-4 border-success bg-[rgba(63,185,80,0.05)] text-left">
                                <h4 className="text-success font-bold mb-2">Stack Allocation</h4>
                                <p className="text-sm text-gray-400">LIFO storage for activation records (function calls).</p>
                            </div>
                            <div className="glass-panel p-4 border-warning bg-[rgba(210,153,34,0.05)] text-left">
                                <h4 className="text-warning font-bold mb-2">Heap Allocation</h4>
                                <p className="text-sm text-gray-400">Dynamic allocation / deallocation at runtime.</p>
                            </div>
                        </div>

                        <div className="glass-panel p-6 flex flex-col h-full">
                            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Server size={18} className="text-accent" />
                                Interactive Symbol Table
                            </h4>
                            <div className="overflow-hidden rounded-lg border border-gray-700">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Scope</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>position</td>
                                            <td className="text-accent">float</td>
                                            <td>global</td>
                                        </tr>
                                        <tr>
                                            <td>initial</td>
                                            <td className="text-accent">float</td>
                                            <td>global</td>
                                        </tr>
                                        <tr>
                                            <td>rate</td>
                                            <td className="text-accent">float</td>
                                            <td>global</td>
                                        </tr>
                                        <tr>
                                            <td>i</td>
                                            <td className="text-success">int</td>
                                            <td>local</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-muted mt-4">
                                * The symbol table keeps track of variable names, their types, and scopes during execution.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RunTimeHome;
