import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SplitSquareHorizontal, Play, RotateCcw } from 'lucide-react';

const InputBuffering = () => {
    const [inputCode, setInputCode] = useState('position = initial + rate * 60;');
    const [isSimulating, setIsSimulating] = useState(false);

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
                // Done
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
        <div className="simulation-workspace">
            <div className="workspace-header">
                <h2><SplitSquareHorizontal size={24} className="inline-block mr-2" />Input Buffering</h2>
                <p>Visualize the two-buffer scheme with sentinels used to read source programs efficiently.</p>
            </div>

            <div className="workspace-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '24px' }}>
                <div className="glass-panel text-center">
                    <p className="text-muted mb-4">Input String</p>
                    <input
                        type="text"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        className="bg-transparent border border-gray-700 rounded p-2 text-white text-center w-1/2 font-mono"
                        disabled={isSimulating}
                    />
                    <div className="mt-6 flex justify-center gap-4">
                        {!isSimulating ? (
                            <button className="btn-primary" onClick={handleSimulate}>
                                <Play size={18} /> Run Buffer Simulation
                            </button>
                        ) : (
                            <button className="btn-secondary" onClick={handleReset}>
                                <RotateCcw size={18} /> Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="glass-panel" style={{ overflowX: 'auto' }}>
                    <div className="flex flex-col items-center gap-8 py-8">

                        {/* Buffer Arrays Visualization */}
                        <div className="flex gap-8">
                            {/* Buffer 1 */}
                            <div className="flex flex-col items-center">
                                <h4 className={`mb-4 ${activeBuffer === 1 ? 'text-accent' : 'text-muted'}`}>Buffer 1</h4>
                                <div className="flex">
                                    {buffer1.map((char, index) => {
                                        const globalIndex = index;
                                        const isSentinel = index === BUFFER_SIZE - 1;
                                        const isLexemeBegin = !isSentinel && globalIndex === (lexemeBegin % (BUFFER_SIZE * 2));
                                        const isForward = !isSentinel && globalIndex === (forward % (BUFFER_SIZE * 2));

                                        return (
                                            <div key={index} className="relative">
                                                <motion.div
                                                    className={`w-12 h-16 border flex items-center justify-center font-mono text-xl
                                                        ${isSentinel ? 'bg-red-900/20 border-red-500/50 text-red-400' : 'border-gray-700 bg-gray-800/50'}
                                                        ${char ? 'text-white' : 'text-transparent'}
                                                    `}
                                                    animate={{
                                                        borderColor: isForward ? 'var(--accent-primary)' : isSentinel ? 'rgba(239, 68, 68, 0.5)' : 'rgba(75, 85, 99, 0.5)',
                                                    }}
                                                >
                                                    {char === ' ' ? '␣' : char === EOF ? 'eof' : char}
                                                </motion.div>

                                                {/* Pointers */}
                                                {isSimulating && activeBuffer === 1 && (
                                                    <div className="absolute top-full mt-4 flex flex-col items-center w-full">
                                                        {isLexemeBegin && <div className="text-xs text-green-400 font-bold">lb↑</div>}
                                                        {isForward && <div className="text-xs text-blue-400 font-bold">fwd↑</div>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Buffer 2 */}
                            <div className="flex flex-col items-center">
                                <h4 className={`mb-4 ${activeBuffer === 2 ? 'text-accent' : 'text-muted'}`}>Buffer 2</h4>
                                <div className="flex">
                                    {buffer2.map((char, index) => {
                                        const globalIndex = index + BUFFER_SIZE;
                                        const isSentinel = index === BUFFER_SIZE - 1;
                                        const isLexemeBegin = !isSentinel && globalIndex === (lexemeBegin % (BUFFER_SIZE * 2));
                                        const isForward = !isSentinel && globalIndex === (forward % (BUFFER_SIZE * 2));

                                        return (
                                            <div key={index} className="relative">
                                                <motion.div
                                                    className={`w-12 h-16 border flex items-center justify-center font-mono text-xl
                                                        ${isSentinel ? 'bg-red-900/20 border-red-500/50 text-red-400' : 'border-gray-700 bg-gray-800/50'}
                                                    `}
                                                    animate={{
                                                        borderColor: isForward ? 'var(--accent-primary)' : isSentinel ? 'rgba(239, 68, 68, 0.5)' : 'rgba(75, 85, 99, 0.5)',
                                                    }}
                                                >
                                                    {char === ' ' ? '␣' : char === EOF ? 'eof' : char}
                                                </motion.div>
                                                {/* Pointers */}
                                                {isSimulating && activeBuffer === 2 && (
                                                    <div className="absolute top-full mt-4 flex flex-col items-center w-full">
                                                        {isLexemeBegin && <div className="text-xs text-green-400 font-bold">lb↑</div>}
                                                        {isForward && <div className="text-xs text-blue-400 font-bold">fwd↑</div>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-12 bg-gray-900/50 p-4 rounded text-sm w-full max-w-2xl border border-gray-800">
                            <p className="mb-2"><span className="text-green-400 font-bold">lb (lexemeBegin):</span> Points to the start of the current lexeme being discovered.</p>
                            <p><span className="text-blue-400 font-bold">fwd (forward):</span> Scans ahead until a pattern match occurs. If it hits 'eof', the next buffer is loaded.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InputBuffering;
