import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SplitSquareHorizontal, Play, RotateCcw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './InputBuffering.css';

const InputBuffering = () => {
    const [inputCode, setInputCode] = useState('position = initial + rate * 60;');
    const [isSimulating, setIsSimulating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // Buffer sizing
    const BUFFER_SIZE = 10;
    const EOF = 'eof';

    // State for visualization
    const [buffer1, setBuffer1] = useState(Array(BUFFER_SIZE).fill(''));
    const [buffer2, setBuffer2] = useState(Array(BUFFER_SIZE).fill(''));
    const [lexemeBegin, setLexemeBegin] = useState(0);
    const [forward, setForward] = useState(0);
    const [activeBuffer, setActiveBuffer] = useState(1);

    const handleSimulate = () => {
        setIsSimulating(true);
        setIsComplete(false);
        setLexemeBegin(0);
        setForward(0);

        // Initialize buffers with first chunk of code
        loadBuffer(1, 0);
    };

    const loadBuffer = (bufferNum, startIndex) => {
        const newBuffer = Array(BUFFER_SIZE).fill('');
        for (let i = 0; i < BUFFER_SIZE - 1; i++) {
            if (startIndex + i < inputCode.length) {
                newBuffer[i] = inputCode[startIndex + i];
            } else {
                // End of physical input, won't fill EOF yet unless it's the exact end
                break;
            }
        }
        // Sentinel character at the end of buffer
        newBuffer[BUFFER_SIZE - 1] = EOF;

        if (bufferNum === 1) setBuffer1(newBuffer);
        else setBuffer2(newBuffer);
    };

    const handleReset = () => {
        setIsSimulating(false);
        setIsComplete(false); // Reset completion state
        setBuffer1(Array(BUFFER_SIZE).fill(''));
        setBuffer2(Array(BUFFER_SIZE).fill(''));
        setLexemeBegin(0);
        setForward(0);
        setActiveBuffer(1);
    };

    // Step forward simulation
    useEffect(() => {
        if (!isSimulating) return;

        const timer = setTimeout(() => {
            // Determine active pointer position visually
            let visualForward = forward % (BUFFER_SIZE * 2);
            let nextForward = forward + 1;

            // Reached sentinels
            if (visualForward === BUFFER_SIZE - 1) { // End of Buffer 1
                loadBuffer(2, forward + 1);
                setActiveBuffer(2);
                nextForward++; // skip sentinel visually
            } else if (visualForward === (BUFFER_SIZE * 2) - 1) { // End of Buffer 2
                loadBuffer(1, forward + 1);
                setActiveBuffer(1);
                nextForward++; // skip sentinel visually
            }

            // Check if we reached the actual end of string
            if (forward >= inputCode.length) {
                setIsComplete(true);
                setIsSimulating(false);
                return;
            }

            // Simple boundary crossing logic: when we hit whitespace, advance lexemeBegin
            if (inputCode[forward] === ' ' || inputCode[forward] === ';') {
                setLexemeBegin(nextForward);
            }

            setForward(nextForward);

        }, 800);

        return () => clearTimeout(timer);
    }, [isSimulating, forward, inputCode]);

    return (
        <div className="unit-container">
            <div className="workspace-header centered">
                <h2>
                    <Link to="/unit1" className="back-link" title="Back to Unit I">
                        <ArrowLeft size={24} />
                    </Link>
                    <SplitSquareHorizontal size={28} className="header-icon" />
                    Input Buffering
                </h2>
                <p>Visualize the two-buffer scheme with sentinels used to read source programs efficiently.</p>
            </div>

            <div className="buffering-grid">
                <div className="glass-panel panel-col">
                    <div className="panel-header mb-4">
                        <h3>Input Configuration</h3>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Lexer Character Stream</label>
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            className="code-input"
                            disabled={isSimulating}
                            placeholder="Type your code here..."
                        />
                    </div>
                    <div className="actions-row">
                        {!isSimulating ? (
                            <button className="btn-primary action-btn" onClick={handleSimulate}>
                                <Play size={18} /> Run Buffer Simulation
                            </button>
                        ) : (
                            <button className="btn-secondary action-btn" onClick={handleReset}>
                                <RotateCcw size={18} /> Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="glass-panel panel-col">
                    <div className="panel-header mb-4">
                        <h3>Buffer Visualization</h3>
                        {isSimulating && (
                            <span className="status-tag">
                                Active: Buffer {activeBuffer}
                            </span>
                        )}
                    </div>
                    <div className="buffers-container">

                        {/* Buffer Arrays Visualization */}
                        <div className="buffers-row">
                            {/* Buffer 1 */}
                            <div className="buffer-section">
                                <h4 className={`buffer-title ${activeBuffer === 1 ? 'active-title' : 'inactive-title'}`}>
                                    {activeBuffer === 1 && <span className="active-dot"></span>}
                                    Buffer 1
                                </h4>
                                <div className="buffer-cells">
                                    {buffer1.map((char, index) => {
                                        const globalIndex = index;
                                        const isSentinel = index === BUFFER_SIZE - 1;
                                        const isLexemeBegin = !isSentinel && globalIndex === (lexemeBegin % (BUFFER_SIZE * 2));
                                        const isForward = !isSentinel && globalIndex === (forward % (BUFFER_SIZE * 2));

                                        return (
                                            <div key={index} className="cell-wrapper">
                                                <motion.div
                                                    className={`buffer-cell
                                                        ${isSentinel ? 'sentinel-cell' : 'normal-cell'}
                                                        ${char ? 'cell-filled' : 'cell-empty'}
                                                    `}
                                                    animate={{
                                                        borderColor: isForward ? 'var(--accent-primary)' : isSentinel ? 'rgba(239, 68, 68, 0.5)' : 'rgba(75, 85, 99, 0.5)',
                                                    }}
                                                >
                                                    {char === ' ' ? '␣' : char === EOF ? 'eof' : char}
                                                </motion.div>

                                                {/* Pointers */}
                                                {isSimulating && activeBuffer === 1 && (
                                                    <div className="pointers-container">
                                                        {isLexemeBegin && <div className="pointer pointer-lb">lb↑</div>}
                                                        {isForward && <div className="pointer pointer-fwd">fwd↑</div>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Buffer 2 */}
                            <div className="buffer-section">
                                <h4 className={`buffer-title ${activeBuffer === 2 ? 'active-title' : 'inactive-title'}`}>
                                    {activeBuffer === 2 && <span className="active-dot"></span>}
                                    Buffer 2
                                </h4>
                                <div className="buffer-cells">
                                    {buffer2.map((char, index) => {
                                        const globalIndex = index + BUFFER_SIZE;
                                        const isSentinel = index === BUFFER_SIZE - 1;
                                        const isLexemeBegin = !isSentinel && globalIndex === (lexemeBegin % (BUFFER_SIZE * 2));
                                        const isForward = !isSentinel && globalIndex === (forward % (BUFFER_SIZE * 2));

                                        return (
                                            <div key={index} className="cell-wrapper">
                                                <motion.div
                                                    className={`buffer-cell
                                                        ${isSentinel ? 'sentinel-cell' : 'normal-cell'}
                                                        ${char ? 'cell-filled' : 'cell-empty'}
                                                    `}
                                                    animate={{
                                                        borderColor: isForward ? 'var(--accent-primary)' : isSentinel ? 'rgba(239, 68, 68, 0.5)' : 'rgba(75, 85, 99, 0.5)',
                                                    }}
                                                >
                                                    {char === ' ' ? '␣' : char === EOF ? 'eof' : char}
                                                </motion.div>
                                                {/* Pointers */}
                                                {isSimulating && activeBuffer === 2 && (
                                                    <div className="pointers-container">
                                                        {isLexemeBegin && <div className="pointer pointer-lb">lb↑</div>}
                                                        {isForward && <div className="pointer pointer-fwd">fwd↑</div>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="legend-box">
                            <p className="legend-item"><span className="legend-lb">lb (lexemeBegin):</span> Points to the start of the current lexeme being discovered.</p>
                            <p className="legend-item"><span className="legend-fwd">fwd (forward):</span> Scans ahead until a pattern match occurs. If it hits 'eof', the next buffer is loaded.</p>
                        </div>

                        {isComplete && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="completion-summary"
                            >
                                <h4>🎉 Simulation Complete</h4>
                                <p>The lexer has successfully scanned the entire input stream using the two-buffer scheme.</p>
                                <ul className="summary-list">
                                    <li><strong>Sentinels used:</strong> The `eof` tokens allowed the lexer to detect buffer boundaries without extra checks.</li>
                                    <li><strong>Memory Efficiency:</strong> Only 20 characters were in RAM at any time, regardless of input length.</li>
                                    <li><strong>Lexemes Discovered:</strong> The `lb` and `fwd` pointers successfully isolated each meaningful token.</li>
                                </ul>
                                <button className="btn-secondary mt-4" onClick={handleReset}>
                                    <RotateCcw size={16} /> Run Again
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InputBuffering;
