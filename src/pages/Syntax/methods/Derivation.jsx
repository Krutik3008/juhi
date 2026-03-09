import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, ArrowRight, Eraser, Zap, Network, Sparkles, ArrowLeft, AlignLeft, AlignRight, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import './Derivation.css';

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 40, nodesep: 30 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 60, height: 60 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodePosition = dagreGraph.node(node.id);
        node.position = {
            x: nodePosition.x - 30,
            y: nodePosition.y - 30,
        };
    });

    return { nodes, edges };
};

// Helper to tokenize inputs
const tokenizeItem = (str) => str.match(/([a-zA-Z_]\w*|\d+|[^\s\w])/g) || [];

function parseGrammar(grammarText) {
    const rules = {};
    let startSymbol = null;
    let nonTerminals = new Set();

    grammarText.split('\n').filter(line => line.includes('->')).forEach(line => {
        const [leftRaw, rightRaw] = line.split('->');
        const left = leftRaw.trim();
        if (!startSymbol) startSymbol = left;
        nonTerminals.add(left);
        if (!rules[left]) rules[left] = [];

        rightRaw.split('|').forEach(alt => {
            const tokens = tokenizeItem(alt);
            rules[left].push(tokens);
        });
    });
    return { rules, startSymbol, nonTerminals };
}

function computeDerivationSequence(grammarText, targetText, strategy = 'leftmost') {
    const { rules, startSymbol, nonTerminals } = parseGrammar(grammarText);
    const targetTokens = tokenizeItem(targetText);

    if (!startSymbol) return null;

    let queue = [{
        tokens: [{ id: '1', label: startSymbol }],
        history: [startSymbol],
        edges: [],
        nodes: [{ id: '1', data: { label: startSymbol }, className: 'tree-node non-terminal' }],
        nextId: 2
    }];

    let iterations = 0;
    while (queue.length > 0 && iterations < 50000) {
        iterations++;
        const current = queue.shift();

        let expandIdx = -1;
        if (strategy === 'leftmost') {
            expandIdx = current.tokens.findIndex(t => nonTerminals.has(t.label));
        } else {
            for (let i = current.tokens.length - 1; i >= 0; i--) {
                if (nonTerminals.has(current.tokens[i].label)) {
                    expandIdx = i;
                    break;
                }
            }
        }

        if (expandIdx === -1) {
            if (current.tokens.map(t => t.label).join('') === targetTokens.join('')) {
                return current;
            }
            continue;
        }

        if (current.tokens.length > targetTokens.length + 3) continue;

        if (strategy === 'leftmost') {
            let prefixMatch = true;
            for (let i = 0; i < expandIdx; i++) {
                if (i >= targetTokens.length || current.tokens[i].label !== targetTokens[i]) {
                    prefixMatch = false; break;
                }
            }
            if (!prefixMatch) continue;
        } else {
            let suffixMatch = true;
            const termCount = current.tokens.length - 1 - expandIdx;
            for (let i = 0; i < termCount; i++) {
                const curIdx = current.tokens.length - 1 - i;
                const tgtIdx = targetTokens.length - 1 - i;
                if (tgtIdx < 0 || current.tokens[curIdx].label !== targetTokens[tgtIdx]) {
                    suffixMatch = false; break;
                }
            }
            if (!suffixMatch) continue;
        }

        const tokenToExpand = current.tokens[expandIdx];
        const ruleAlts = rules[tokenToExpand.label] || [];

        for (const alt of ruleAlts) {
            let newNextId = current.nextId;
            let newExpandedTokens = [];
            let newNodes = [...current.nodes];
            let newEdges = [...current.edges];

            for (const sym of alt) {
                const isNonTerm = nonTerminals.has(sym);
                const nid = (newNextId++).toString();
                newExpandedTokens.push({ id: nid, label: sym });
                newNodes.push({
                    id: nid,
                    data: { label: sym },
                    className: `tree-node ${isNonTerm ? 'non-terminal' : (sym.match(/^[a-zA-Z]/) ? 'lexeme' : 'operator')}`
                });
                newEdges.push({
                    id: `e${tokenToExpand.id}-${nid}`,
                    source: tokenToExpand.id,
                    target: nid,
                    type: 'smoothstep',
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' },
                    style: { stroke: '#8b949e', strokeWidth: 2 }
                });
            }

            const nextTokens = [
                ...current.tokens.slice(0, expandIdx),
                ...newExpandedTokens,
                ...current.tokens.slice(expandIdx + 1)
            ];

            let displayTokens = [];
            for (const t of nextTokens) {
                if (t.label !== 'ε') displayTokens.push(t.label);
            }
            const nextStr = displayTokens.length > 0 ? displayTokens.join(' ') : 'ε';

            queue.push({
                tokens: nextTokens,
                history: [...current.history, nextStr],
                nodes: newNodes,
                edges: newEdges,
                nextId: newNextId
            });
        }
    }
    return null;
}

const Derivation = () => {
    const defaultGrammar = "E -> E + E\nE -> E * E\nE -> (E)\nE -> id";
    const defaultInput = "id + id * id";

    const [grammar, setGrammar] = useState(defaultGrammar);
    const [inputString, setInputString] = useState(defaultInput);
    const [activeStage, setActiveStage] = useState('config'); // 'config', 'leftmost', 'rightmost'
    const [exampleIndex, setExampleIndex] = useState(0);

    const examples = [
        { g: "E -> E + E\nE -> E * E\nE -> (E)\nE -> id", i: "id + id * id" },
        { g: "S -> a S a\nS -> b S b\nS -> c", i: "a b c b a" },
        { g: "S -> A B\nA -> a A | a\nB -> b B | b", i: "a a b" }
    ];

    const [leftDerivation, setLeftDerivation] = useState([]);
    const [rightDerivation, setRightDerivation] = useState([]);
    const [leftNodes, setLeftNodes] = useState([]);
    const [leftEdges, setLeftEdges] = useState([]);
    const [rightNodes, setRightNodes] = useState([]);
    const [rightEdges, setRightEdges] = useState([]);
    const [errorMsg, setErrorMsg] = useState("");

    const generateDerivation = () => {
        setErrorMsg("");

        try {
            const leftResult = computeDerivationSequence(grammar, inputString, 'leftmost');
            const rightResult = computeDerivationSequence(grammar, inputString, 'rightmost');

            if (leftResult && rightResult) {
                setLeftDerivation(leftResult.history);
                setRightDerivation(rightResult.history);

                const { nodes: lNodes, edges: lEdges } = getLayoutedElements(leftResult.nodes, leftResult.edges);
                setLeftNodes(lNodes);
                setLeftEdges(lEdges);

                const { nodes: rNodes, edges: rEdges } = getLayoutedElements(rightResult.nodes, rightResult.edges);
                setRightNodes(rNodes);
                setRightEdges(rEdges);

                setActiveStage('leftmost');
            } else {
                setErrorMsg("Derivation could not be found for the given target string. Depth limit reached or grammatically invalid.");
            }
        } catch (e) {
            setErrorMsg("Error parsing grammar or finding derivation.");
        }
    };

    useEffect(() => {
        let timer;
        if (activeStage === 'leftmost') {
            timer = setTimeout(() => {
                setActiveStage('rightmost');
            }, 2500); // Wait 2.5s before showing the Rightmost derivation box
        }
        return () => clearTimeout(timer);
    }, [activeStage]);

    const handleReset = () => {
        setActiveStage('config');
    };

    const handleClear = () => {
        setGrammar('');
        setInputString('');
        setActiveStage('config');
    };

    const setExample = () => {
        const nextIndex = (exampleIndex + 1) % examples.length;
        setExampleIndex(nextIndex);
        setGrammar(examples[nextIndex].g);
        setInputString(examples[nextIndex].i);
    };

    return (
        <div className="derivation-unit-container">
            <div className="derivation-workspace-header">
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Link to="/unit2-3" className="derivation-back-link" title="Back to Syntax Unit">
                        <ArrowLeft size={24} />
                    </Link>
                    <Network size={28} className="derivation-header-icon" />
                    Leftmost & Rightmost Derivation
                </motion.h2>
                <p>Visualize the sequence of rule applications that replace non-terminals to yield the target string.</p>
            </div>

            <div className="derivation-main-grid">
                {/* Configuration Panel */}
                <div className="derivation-rc-panel mb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="derivation-rc-input-group">
                            <div className="derivation-panel-header mb-4">
                                <h3><Zap size={20} className="derivation-header-icon" /> Context Free Grammar</h3>
                                <div className="flex gap-2 items-center">
                                    {activeStage === 'config' && (
                                        <button
                                            className="derivation-btn-secondary derivation-btn-sm"
                                            onClick={setExample}
                                        >
                                            Example Change
                                        </button>
                                    )}
                                </div>
                            </div>
                            <textarea
                                className="derivation-main-input"
                                value={grammar}
                                onChange={(e) => setGrammar(e.target.value)}
                                disabled={activeStage !== 'config'}
                                placeholder="Enter CFG Rules..."
                            />
                        </div>

                        <div className="derivation-rc-input-group">
                            <div className="derivation-panel-header mb-4">
                                <h3><Network size={20} className="derivation-header-icon" /> Target String</h3>
                            </div>
                            <input
                                type="text"
                                className="derivation-main-input"
                                value={inputString}
                                onChange={(e) => setInputString(e.target.value)}
                                disabled={activeStage !== 'config'}
                                placeholder="Target String W (e.g. id + id * id)"
                            />
                            {errorMsg && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                                    {errorMsg}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="derivation-actions-row mt-6">
                        {activeStage === 'config' ? (
                            <button className="derivation-btn derivation-btn-primary" onClick={generateDerivation}>
                                <Play size={18} /> Compute Derivations
                            </button>
                        ) : (
                            <button className="derivation-btn derivation-btn-secondary" onClick={handleReset}>
                                <RotateCcw size={18} /> Edit Inputs
                            </button>
                        )}
                        <button className="derivation-btn derivation-btn-secondary" onClick={handleClear}>
                            <Eraser size={18} /> Clear Inputs
                        </button>
                    </div>
                </div>

                {/* Journey Tracker */}
                <div className="derivation-journey-tracker mb-12">
                    <div className="derivation-phases-container">
                        {[
                            { id: 1, title: 'Grammar & Target', desc: 'Rules & String', stage: 'config' },
                            { id: 2, title: 'Leftmost Derivation', desc: 'Leftmost steps', stage: 'leftmost' },
                            { id: 3, title: 'Rightmost Derivation', desc: 'Rightmost verification', stage: 'rightmost' }
                        ].map((phase, idx, arr) => {
                            const isCompleted = (phase.id === 1 && activeStage !== 'config') ||
                                (phase.id === 2 && activeStage === 'rightmost');
                            const isActive = (phase.id === 1 && activeStage === 'config') ||
                                (phase.id === 2 && activeStage === 'leftmost') ||
                                (phase.id === 3 && activeStage === 'rightmost');

                            return (
                                <React.Fragment key={phase.id}>
                                    <div
                                        className={`derivation-phase-box ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                    >
                                        <div className="derivation-phase-num">{phase.id}</div>
                                        <div className="derivation-phase-info">
                                            <h4>{phase.title}</h4>
                                            <p>{phase.desc}</p>
                                        </div>
                                    </div>
                                    {idx < arr.length - 1 && (
                                        <ArrowRight className={`derivation-phase-arrow ${isCompleted ? 'active' : ''}`} size={20} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence>
                    {activeStage !== 'config' && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="derivation-journey-stack"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="derivation-stage-card"
                            >
                                <div className="derivation-stage-header mb-8">
                                    <div className="derivation-stage-title">
                                        <AlignLeft size={24} className="text-indigo-400" />
                                        <h3>Leftmost Derivation</h3>
                                    </div>
                                    <div className="derivation-badge success">Complete</div>
                                </div>

                                <div className="derivation-split-layout">
                                    <div className="derivation-steps-column">
                                        {leftDerivation.map((step, index) => {
                                            return (
                                                <React.Fragment key={`lm-${index}`}>
                                                    <motion.div
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.15 }}
                                                        className="derivation-step-wrapper"
                                                    >
                                                        <div className="derivation-step-arrow-prefix text-indigo-400">→</div>
                                                        <div className="derivation-step-item-vertical">
                                                            <span>{step}</span>
                                                        </div>
                                                    </motion.div>
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                    <div className="derivation-tree-column">
                                        <div className="derivation-flow-canvas">
                                            <ReactFlow
                                                nodes={leftNodes}
                                                edges={leftEdges}
                                                fitView
                                                attributionPosition="bottom-right"
                                                nodesDraggable={true}
                                                zoomOnScroll={true}
                                                panOnDrag={true}
                                            >
                                                <Background color="#1e293b" gap={16} />
                                                <Controls showInteractive={false} />
                                            </ReactFlow>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <AnimatePresence>
                                {activeStage === 'rightmost' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className="derivation-stage-card mt-8"
                                    >
                                        <div className="derivation-stage-header mb-8">
                                            <div className="derivation-stage-title">
                                                <AlignRight size={24} className="text-emerald-400" />
                                                <h3>Rightmost Derivation</h3>
                                            </div>
                                            <div className="derivation-badge success" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}>Complete</div>
                                        </div>

                                        <div className="derivation-split-layout">
                                            <div className="derivation-steps-column">
                                                {rightDerivation.map((step, index) => (
                                                    <React.Fragment key={`rm-${index}`}>
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.15 }}
                                                            className="derivation-step-wrapper"
                                                        >
                                                            <div className="derivation-step-arrow-prefix" style={{ color: '#10b981' }}>→</div>
                                                            <div className="derivation-step-item-vertical" style={{ borderLeftColor: '#10b981' }}>
                                                                <span>{step}</span>
                                                            </div>
                                                        </motion.div>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            <div className="derivation-tree-column">
                                                <div className="derivation-flow-canvas">
                                                    <ReactFlow
                                                        nodes={rightNodes}
                                                        edges={rightEdges}
                                                        fitView
                                                        attributionPosition="bottom-right"
                                                        nodesDraggable={true}
                                                        zoomOnScroll={true}
                                                        panOnDrag={true}
                                                    >
                                                        <Background color="#1e293b" gap={16} />
                                                        <Controls showInteractive={false} />
                                                    </ReactFlow>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Final Comparison Result */}
                            <AnimatePresence>
                                {activeStage === 'rightmost' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="derivation-stage-card result-summary mt-8"
                                        style={{
                                            background: 'rgba(99, 102, 241, 0.05)',
                                            borderColor: 'rgba(99, 102, 241, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '24px',
                                            textAlign: 'center',
                                            marginBottom: '50px'
                                        }}
                                    >
                                        <div>
                                            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                <span style={{ color: '#4f46e5' }}>✨</span> Derivation Complete
                                            </h3>
                                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', margin: 0 }}>
                                                {leftDerivation[leftDerivation.length - 1] === rightDerivation[rightDerivation.length - 1]
                                                    ? "Both Leftmost and Rightmost derivations successfully generated the same target string, confirming the grammar can parse the input."
                                                    : "The Leftmost and Rightmost derivations produced different outcomes or failed to parse the exact target string."}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Derivation;
