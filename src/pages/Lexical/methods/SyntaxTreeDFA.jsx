import React, { useState } from 'react';
import { Hash, GitMerge, Network } from 'lucide-react';

const SyntaxTreeDFA = () => {
    return (
        <div className="simulation-workspace">
            <div className="workspace-header">
                <h2><Hash size={24} className="inline-block mr-2" />Direct RE to DFA (Syntax Tree)</h2>
                <p>Compute nullable, firstpos, lastpos, and followpos directly from an augmented Regular Expression.</p>
            </div>

            <div className="glass-panel mt-6 p-8 text-center flex flex-col items-center justify-center" style={{ height: '400px' }}>
                <div className="w-20 h-20 rounded-full bg-blue-900/20 border border-blue-500/30 flex items-center justify-center mb-6 text-[var(--accent-primary)]">
                    <Network size={40} />
                </div>
                <h3 className="text-xl mb-4 font-bold text-white">Syntax Tree Computation Engine</h3>
                <p className="text-muted max-w-xl mb-6">
                    This module directly constructs a DFA without the intermediate NFA step by building a syntax tree for the augmented regular expression `(r)#` and computing positional functions.
                </p>
                <div className="flex gap-4">
                    <span className="px-3 py-1 bg-gray-800 rounded text-sm text-gray-300 border border-gray-700 font-mono">nullable()</span>
                    <span className="px-3 py-1 bg-gray-800 rounded text-sm text-gray-300 border border-gray-700 font-mono">firstpos()</span>
                    <span className="px-3 py-1 bg-gray-800 rounded text-sm text-gray-300 border border-gray-700 font-mono">lastpos()</span>
                    <span className="px-3 py-1 bg-gray-800 rounded text-sm text-gray-300 border border-gray-700 font-mono">followpos()</span>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-800 w-full max-w-2xl text-warning bg-yellow-900/10 p-4 rounded text-sm">
                    <GitMerge size={16} className="inline mr-2" />
                    The visual tree builder is currently being integrated with the global React Flow engine.
                </div>
            </div>
        </div>
    );
};

export default SyntaxTreeDFA;
