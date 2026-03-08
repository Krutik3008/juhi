import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Type, ArrowLeft, Eraser, Dices } from 'lucide-react';
import { Link } from 'react-router-dom';
import './TokenRecognizer.css';

const TokenRecognizer = () => {
    const [inputCode, setInputCode] = useState('int count = 10;\nif (count > 0) {\n  count = count - 1;\n}');
    const [tokens, setTokens] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);

    const examples = [
        'int count = 10;\nif (count > 0) {\n  count = count - 1;\n}',
        'float total = 0.0;\nfor(int i=0; i<5; i++) {\n  total = total + i;\n}',
        'int a = 5;\nif (a >= 3) {\n  a = a + 2;\n}',
        'char grade = "A";\nreturn grade;'
    ];

    const loadExample = () => {
        const randomIdx = Math.floor(Math.random() * examples.length);
        setInputCode(examples[randomIdx]);
    };

    // Simple Lexer logic for demonstration
    const analyzeTokens = (code) => {
        const tokenList = [];
        // Regex patterns for different token types
        const patterns = [
            { type: 'KEYWORD', regex: /^(int|float|char|void|if|else|while|for|return|break|continue)\b/ },
            { type: 'IDENTIFIER', regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
            { type: 'NUMBER', regex: /^\d+(\.\d+)?/ },
            { type: 'STRING', regex: /^"([^"\\]|\\.)*"/ },
            { type: 'OPERATOR', regex: /^(==|!=|<=|>=|&&|\|\||[+\-*/=<>])/ },
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
            case 'STRING': return '#a5d6ff'; // Light blue for strings
            case 'OPERATOR': return '#d2a8ff'; // Purple for operators
            case 'PUNCTUATION': return '#8b949e'; // Gray
            case 'UNKNOWN': return '#f85149'; // Error red
            default: return 'var(--text-primary)';
        }
    };

    return (
        <div className="unit-container">
            <div className="workspace-header">

                <h2>
                    <Link to="/unit1" className="back-link" title="Back to Unit I">
                        <ArrowLeft size={24} />
                    </Link>
                    <Type size={28} className="header-icon" />
                    Token, Pattern & Lexeme Recognition
                </h2>
                <p>Watch as the lexer scans the character stream and groups them into meaningful tokens.</p>
            </div>

            <div className="token-grid">
                <div className="glass-panel panel-col">
                    <div className="panel-header mb-4">
                        <h3>Source Code</h3>
                        {!isAnalyzing && (
                            <button className="btn-secondary action-btn header-btn" onClick={loadExample} title="Load different example">
                                <Dices size={16} /> Example Change
                            </button>
                        )}
                    </div>
                    <textarea
                        className="source-textarea"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        disabled={isAnalyzing}
                    />
                    <div className="action-row">
                        {!isAnalyzing ? (
                            <>
                                <button className="btn-primary action-btn" onClick={handleAnalyze}>
                                    <Play size={18} /> Analyze
                                </button>
                                <button className="btn-secondary action-btn" onClick={() => setInputCode('')}>
                                    <Eraser size={18} /> Input Clear
                                </button>
                            </>
                        ) : (
                            <button className="btn-secondary action-btn" onClick={handleReset}>
                                <RotateCcw size={18} /> Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="glass-panel panel-col">
                    <div className="panel-header mb-4">
                        <h3>Token Stream</h3>
                        {tokens.length > 0 && (
                            <span className="token-count">
                                {Math.min(currentIndex + 1, tokens.length)} / {tokens.length} tokens
                            </span>
                        )}
                    </div>

                    <div className="token-stream-container">
                        {!isAnalyzing && (
                            <div className="empty-state">
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
                                        style={{ borderColor: `${getTokenColor(token.type)}30` }}
                                    >
                                        <span className="token-chip-value" style={{ color: getTokenColor(token.type) }}>
                                            {token.value}
                                        </span>
                                        <span className="token-chip-type">
                                            {token.type}
                                        </span>
                                    </motion.div>
                                )
                            ))}
                        </AnimatePresence>
                    </div>

                    {isAnalyzing && (
                        <div className="legend-container">
                            <div className="legend-items">
                                <span style={{ color: getTokenColor('KEYWORD') }}>● Keyword</span>
                                <span style={{ color: getTokenColor('IDENTIFIER') }}>● Identifier</span>
                                <span style={{ color: getTokenColor('NUMBER') }}>● Number</span>
                                <span style={{ color: getTokenColor('STRING') }}>● String</span>
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
