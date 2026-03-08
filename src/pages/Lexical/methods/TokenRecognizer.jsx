import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Type, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TokenRecognizer = () => {
    const [inputCode, setInputCode] = useState('int count = 10;\nif (count > 0) {\n  count = count - 1;\n}');
    const [tokens, setTokens] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);

    // Simple Lexer logic for demonstration
    const analyzeTokens = (code) => {
        const tokenList = [];
        // Regex patterns for different token types
        const patterns = [
            { type: 'KEYWORD', regex: /^(int|float|char|void|if|else|while|for|return|break|continue)\b/ },
            { type: 'IDENTIFIER', regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
            { type: 'NUMBER', regex: /^\d+(\.\d+)?/ },
            { type: 'OPERATOR', regex: /^(\+|-|\*|\/|=|==|!=|<|>|<=|>=|&&|\|\|)/ },
            { type: 'PUNCTUATION', regex: /^([;,\(\)\{\}\[\]])/ },
            { type: 'WHITESPACE', regex: /^\s+/ }
        ];

        let remainingCode = code;
        let line = 1;
        let col = 1;

        while (remainingCode.length > 0) {
            let matched = false;

            for (const { type, regex } of patterns) {
                const match = remainingCode.match(regex);
                if (match) {
                    const value = match[0];
                    if (type !== 'WHITESPACE') {
                        tokenList.push({ type, value, line, col });
                    }

                    // Update position
                    for (let i = 0; i < value.length; i++) {
                        if (value[i] === '\n') {
                            line++;
                            col = 1;
                        } else {
                            col++;
                        }
                    }

                    remainingCode = remainingCode.slice(value.length);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                // Handle unknown character
                tokenList.push({ type: 'UNKNOWN', value: remainingCode[0], line, col });
                if (remainingCode[0] === '\n') {
                    line++;
                    col = 1;
                } else {
                    col++;
                }
                remainingCode = remainingCode.slice(1);
            }
        }
        return tokenList;
    };

    const handleAnalyze = () => {
        const generatedTokens = analyzeTokens(inputCode);
        setTokens(generatedTokens);
        setIsAnalyzing(true);
        setCurrentIndex(-1);
    };

    const handleReset = () => {
        setTokens([]);
        setIsAnalyzing(false);
        setCurrentIndex(-1);
    };

    // Animation loop for tokens
    useEffect(() => {
        if (isAnalyzing && currentIndex < tokens.length - 1) {
            const timer = setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 300); // Animation speed
            return () => clearTimeout(timer);
        }
    }, [isAnalyzing, currentIndex, tokens.length]);

    const getTokenColor = (type) => {
        switch (type) {
            case 'KEYWORD': return 'var(--accent-primary)';
            case 'IDENTIFIER': return 'var(--success)';
            case 'NUMBER': return '#ff7b72'; // Red-ish for numbers
            case 'OPERATOR': return '#d2a8ff'; // Purple for operators
            case 'PUNCTUATION': return '#8b949e'; // Gray
            case 'UNKNOWN': return '#f85149'; // Error red
            default: return 'var(--text-primary)';
        }
    };

    return (
        <div className="simulation-workspace" style={{ padding: '50px' }}>
            <div className="workspace-header">

                <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link to="/unit1" className="back-link inline-flex items-center text-accent hover:text-white transition-colors" title="Back to Unit I" style={{ color: 'var(--accent-primary)', display: 'inline-flex', marginRight: '4px' }}>
                        <ArrowLeft size={30} />
                    </Link>
                    <Type size={28} className="text-accent" />
                    Token, Pattern & Lexeme Recognition
                </h2>
                <p>Watch as the lexer scans the character stream and groups them into meaningful tokens.</p>
            </div>

            <div className="workspace-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                <div className="glass-panel">
                    <div className="panel-header mb-4">
                        <h3>Source Code</h3>
                    </div>
                    <textarea
                        className="source-textarea"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        disabled={isAnalyzing}
                        style={{ height: '300px', width: '100%', fontFamily: 'var(--font-mono)' }}
                    />
                    <div className="flex gap-4 mt-4">
                        {!isAnalyzing ? (
                            <button className="btn-primary" onClick={handleAnalyze}>
                                <Play size={18} /> Analyze
                            </button>
                        ) : (
                            <button className="btn-secondary" onClick={handleReset}>
                                <RotateCcw size={18} /> Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="panel-header mb-4">
                        <h3>Token Stream</h3>
                        {tokens.length > 0 && (
                            <span className="text-sm text-muted">
                                {Math.min(currentIndex + 1, tokens.length)} / {tokens.length} tokens
                            </span>
                        )}
                    </div>

                    <div className="token-stream-container flex-1 overflow-y-auto" style={{ maxHeight: '400px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start' }}>
                        {!isAnalyzing && (
                            <div className="text-center text-muted w-full mt-10">
                                Click Analyze to start scanning
                            </div>
                        )}

                        <AnimatePresence>
                            {tokens.map((token, index) => (
                                index <= currentIndex && (
                                    <motion.div
                                        key={`${index}-${token.value}`}
                                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        className="token-chip"
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '16px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${getTokenColor(token.type)}30`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <span style={{ color: getTokenColor(token.type), fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                                            {token.value}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            {token.type}
                                        </span>
                                    </motion.div>
                                )
                            ))}
                        </AnimatePresence>
                    </div>

                    {isAnalyzing && (
                        <div className="mt-4 pt-4 border-t border-gray-800">
                            <div className="flex flex-wrap gap-4 text-sm justify-center">
                                <span style={{ color: getTokenColor('KEYWORD') }}>● Keyword</span>
                                <span style={{ color: getTokenColor('IDENTIFIER') }}>● Identifier</span>
                                <span style={{ color: getTokenColor('NUMBER') }}>● Number</span>
                                <span style={{ color: getTokenColor('OPERATOR') }}>● Operator</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TokenRecognizer;
