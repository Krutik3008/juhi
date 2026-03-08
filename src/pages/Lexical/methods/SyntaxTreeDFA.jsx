import React, { useState } from 'react';
import { Hash, GitMerge, Network, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './SyntaxTreeDFA.css';

const SyntaxTreeDFA = () => {
    return (
        <div className="unit-container">
            <div className="workspace-header">
                <h2>
                    <Link to="/unit1" className="back-link" title="Back to Unit I">
                        <ArrowLeft size={24} />
                    </Link>
                    <Hash size={28} className="header-icon" />
                    Direct RE to DFA (Syntax Tree)
                </h2>
                <p>Compute nullable, firstpos, lastpos, and followpos directly from an augmented Regular Expression.</p>
            </div>

            <div className="glass-panel syntax-panel">
                <div className="icon-container">
                    <Network size={40} />
                </div>
                <h3 className="syntax-title">Syntax Tree Computation Engine</h3>
                <p className="syntax-desc">
                    This module directly constructs a DFA without the intermediate NFA step by building a syntax tree for the augmented regular expression `(r)#` and computing positional functions.
                </p>
                <div className="functions-list">
                    <span className="function-tag">nullable()</span>
                    <span className="function-tag">firstpos()</span>
                    <span className="function-tag">lastpos()</span>
                    <span className="function-tag">followpos()</span>
                </div>

                <div className="notice-box">
                    <GitMerge size={16} className="notice-icon" />
                    The visual tree builder is currently being integrated with the global React Flow engine.
                </div>
            </div>
        </div>
    );
};

export default SyntaxTreeDFA;
