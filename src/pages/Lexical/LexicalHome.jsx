import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Type, ArrowRight, Hexagon, Hash, Share2, SplitSquareHorizontal, Layers } from 'lucide-react';

// Method Components
import TokenRecognizer from './methods/TokenRecognizer';
import InputBuffering from './methods/InputBuffering';
import ThompsonConstruction from './methods/ThompsonConstruction';
import SubsetConstruction from './methods/SubsetConstruction';
import DFAMinimization from './methods/DFAMinimization';
import SyntaxTreeDFA from './methods/SyntaxTreeDFA';

const LexicalOverview = () => {
    const navigate = useNavigate();

    const methods = [
        {
            id: 'token-recognizer',
            title: 'Token, Pattern & Lexeme Recognition',
            desc: 'Simulate the scanning process turning raw input into a stream of categorized tokens.',
            icon: <Type size={24} />
        },
        {
            id: 'input-buffering',
            title: 'Input Buffering',
            desc: 'Visualize buffer pairs and sentinel methods for efficient character reading.',
            icon: <SplitSquareHorizontal size={24} />
        },
        {
            id: 'thompson',
            title: 'Thompson Construction (RE to NFA)',
            desc: 'Convert Regular Expressions to NFA using standard structural templates with ε-transitions.',
            icon: <Share2 size={24} />
        },
        {
            id: 'subset',
            title: 'Subset Construction (NFA to DFA)',
            desc: 'Compute ε-closures and build DFA transition tables from an NFA.',
            icon: <Layers size={24} />
        },
        {
            id: 'minimization',
            title: 'DFA Minimization',
            desc: 'Optimize a DFA by merging equivalent states using partition algorithms.',
            icon: <Hexagon size={24} />
        },
        {
            id: 'syntax-tree',
            title: 'Direct RE to DFA (Syntax Tree)',
            desc: 'Compute nullable, firstpos, lastpos, and followpos to build a DFA directly.',
            icon: <Hash size={24} />
        }
    ];

    return (
        <div className="unit-container">
            <div className="page-header">
                <h1 className="page-title">Unit I: Lexical Analysis</h1>
                <p className="page-description">
                    The first phase of a compiler reads the source program as a sequence of characters and converts it into a sequence of tokens.
                </p>
            </div>

            <div className="content-section">
                <h2 className="section-title mb-6">Interactive Methods</h2>
                <div className="grid-cards">
                    {methods.map((method) => (
                        <div key={method.id} className="glass-panel method-card">
                            <div className="method-icon">{method.icon}</div>
                            <h3 className="method-title">{method.title}</h3>
                            <p className="method-desc">{method.desc}</p>
                            <button
                                className="btn-secondary w-full flex items-center justify-between mt-4"
                                onClick={() => navigate(`/unit1/${method.id}`)}
                            >
                                <span>Start Simulation</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const LexicalHome = () => {
    return (
        <Routes>
            <Route path="/" element={<LexicalOverview />} />
            <Route path="/token-recognizer" element={<TokenRecognizer />} />
            <Route path="/input-buffering" element={<InputBuffering />} />
            <Route path="/thompson" element={<ThompsonConstruction />} />
            <Route path="/subset" element={<SubsetConstruction />} />
            <Route path="/minimization" element={<DFAMinimization />} />
            <Route path="/syntax-tree" element={<SyntaxTreeDFA />} />
        </Routes>
    );
};

export default LexicalHome;
