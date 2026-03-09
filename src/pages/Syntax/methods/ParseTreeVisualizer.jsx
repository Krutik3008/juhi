import React, { useState, useEffect } from 'react';
import { AlignLeft, Play, RotateCcw, ArrowRight, Eraser, Zap, ListTree, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { motion, AnimatePresence } from 'framer-motion';
import './ParseTreeVisualizer.css';

// --- Dynamic Parser ---
const tokenize = (input) => {
    const tokens = [];
    const regex = /\s*([a-zA-Z_]\w*|\d+(?:\.\d+)?|==|!=|<=|>=|&&|\|\||[+\-*\/=();])\s*/g;
    let match;
    let lastIndex = 0;
    while ((match = regex.exec(input)) !== null) {
        if (match.index !== lastIndex) {
            // Unrecognized character skipped
        }
        lastIndex = regex.lastIndex;
        if (match[1]) tokens.push(match[1]);
    }
    return tokens;
};

const buildParseTree = (input) => {
    let tokens = tokenize(input);
    let current = 0;
    let rNodes = [];
    let rEdges = [];
    let idCounter = 1;

    function peek() { return tokens[current]; }
    function consume() { return tokens[current++]; }

    function makeNode(label, className) {
        let id = (idCounter++).toString();
        rNodes.push({ id, data: { label }, className: `tree-node ${className}`, position: { x: 0, y: 0 } });
        return id;
    }

    function makeEdge(source, target) {
        rEdges.push({
            id: `e${source}-${target}`,
            source,
            target,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' },
            style: { stroke: '#8b949e', strokeWidth: 2 }
        });
    }

    function parseStmt() {
        if (current >= tokens.length) return null;
        if (tokens.length > current + 1 && tokens[current + 1] === '=') {
            let idLabel = consume();
            let eq = consume();
            let expr = parseExpr();
            let S = makeNode('Stmt', 'non-terminal');
            let idNode = makeNode(idLabel, 'terminal lexeme');

            makeEdge(S, idNode);
            makeEdge(S, makeNode(eq, 'operator'));
            if (expr) makeEdge(S, expr);
            return S;
        }
        return parseExpr();
    }

    function parseExpr() {
        let left = parseTerm();
        if (!left) return null;
        while (peek() === '+' || peek() === '-') {
            let op = consume();
            let right = parseTerm();
            let root = makeNode('Expr', 'non-terminal');
            makeEdge(root, left);
            makeEdge(root, makeNode(op, 'operator'));
            if (right) makeEdge(root, right);
            left = root;
        }
        let e = makeNode('Expr', 'non-terminal');
        makeEdge(e, left);
        return e;
    }

    function parseTerm() {
        let left = parseFactor();
        if (!left) return null;
        while (peek() === '*' || peek() === '/') {
            let op = consume();
            let right = parseFactor();
            let root = makeNode('Term', 'non-terminal');
            makeEdge(root, left);
            makeEdge(root, makeNode(op, 'operator'));
            if (right) makeEdge(root, right);
            left = root;
        }
        let t = makeNode('Term', 'non-terminal');
        makeEdge(t, left);
        return t;
    }

    function parseFactor() {
        let t = peek();
        if (!t) return null;
        let f = makeNode('Factor', 'non-terminal');

        if (t === '(') {
            makeEdge(f, makeNode(consume(), 'operator'));
            let expr = parseExpr();
            if (expr) makeEdge(f, expr);
            if (peek() === ')') makeEdge(f, makeNode(consume(), 'operator'));
        } else {
            let val = consume();
            let cls = isNaN(val) ? 'terminal lexeme' : 'terminal lexeme';
            makeEdge(f, makeNode(val, cls));
        }
        return f;
    }

    parseStmt();

    return { rNodes, rEdges };
};

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 60, nodesep: 40 });

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

// --- Component ---

const ParseTreeVisualizer = () => {
    const [expression, setExpression] = useState("position = initial + rate * 60");
    const [activeStage, setActiveStage] = useState('config'); // 'config', 'generation'

    const examples = [
        "position = initial + rate * 60",
        "current = old + offset * 2",
        "x = (a + b) * (c - d)",
        "id + id * id",
        "a * b + c"
    ];

    // Graph State
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    const generateGraph = () => {
        if (!expression) {
            setNodes([]); setEdges([]); return;
        }
        const { rNodes, rEdges } = buildParseTree(expression);
        if (rNodes.length === 0) return;

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rNodes, rEdges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    };

    const handleSimulate = () => {
        generateGraph();
        setActiveStage('generation');
    };

    const handleReset = () => {
        setActiveStage('config');
        setNodes([]);
        setEdges([]);
    };

    const handleClear = () => {
        setExpression('');
        setActiveStage('config');
        setNodes([]);
        setEdges([]);
    };

    // Pre-load default state
    useEffect(() => {
        if (activeStage === 'config' && nodes.length === 0) {
            const { rNodes, rEdges } = buildParseTree("id + id * id");
            const { nodes: lNodes, edges: lEdges } = getLayoutedElements(rNodes, rEdges);
            setNodes(lNodes);
            setEdges(lEdges);
        }
    }, [activeStage, nodes.length]);

    return (
        <div className="parsetree-unit-container">
            <div className="parsetree-workspace-header">
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Link to="/unit2-3" className="parsetree-back-link" title="Back to Syntax Unit">
                        <ArrowLeft size={24} />
                    </Link>
                    <ListTree size={28} className="parsetree-header-icon" />
                    Parse Tree Construction
                </motion.h2>
                <p>Visualize how the parser derives a string using the grammar rules (Bottom-up or Top-down).</p>
            </div>

            <div className="parsetree-main-grid">
                {/* Configuration Panel */}
                <div className="parsetree-rc-panel mb-10">
                    <div className="parsetree-rc-input-group">
                        <div className="parsetree-panel-header mb-4">
                            <h3><Zap size={20} className="parsetree-header-icon" /> Expression</h3>
                            <div className="flex gap-2 items-center">
                                {activeStage === 'config' && (
                                    <button
                                        className="parsetree-btn-secondary parsetree-btn-sm mr-2"
                                        onClick={() => setExpression(examples[Math.floor(Math.random() * examples.length)])}
                                    >
                                        Example Change
                                    </button>
                                )}
                            </div>
                        </div>
                        <input
                            type="text"
                            value={expression}
                            onChange={(e) => setExpression(e.target.value)}
                            className="parsetree-main-input"
                            disabled={activeStage !== 'config'}
                            placeholder="e.g. current = old + offset * 2"
                        />
                    </div>

                    <div className="parsetree-actions-row mt-6">
                        {activeStage === 'config' ? (
                            <button className="parsetree-btn parsetree-btn-primary" onClick={handleSimulate}>
                                <Play size={18} /> Build Tree
                            </button>
                        ) : (
                            <button className="parsetree-btn parsetree-btn-secondary" onClick={handleReset}>
                                <RotateCcw size={18} /> Edit Expression
                            </button>
                        )}
                        <button className="parsetree-btn parsetree-btn-secondary" onClick={handleClear}>
                            <Eraser size={18} /> Clear Input
                        </button>
                    </div>
                </div>

                {/* Journey Tracker */}
                <div className="parsetree-journey-tracker mb-12">
                    <div className="parsetree-phases-container">
                        {[
                            { id: 1, title: 'Expression Input', desc: 'Source tokens', stage: 'config' },
                            { id: 2, title: 'Parse Tree Generation', desc: 'Derivation visualized', stage: 'generation' }
                        ].map((phase, idx, arr) => {
                            const isCompleted = activeStage === 'generation' && phase.stage === 'config';
                            const isActive = activeStage === phase.stage;

                            return (
                                <React.Fragment key={phase.id}>
                                    <div
                                        className={`parsetree-phase-box ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                    >
                                        <div className="parsetree-phase-num">{phase.id}</div>
                                        <div className="parsetree-phase-info">
                                            <h4>{phase.title}</h4>
                                            <p>{phase.desc}</p>
                                        </div>
                                    </div>
                                    {idx < arr.length - 1 && (
                                        <ArrowRight className={`parsetree-phase-arrow ${isCompleted ? 'active' : ''}`} size={20} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence>
                    {activeStage === 'generation' && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="parsetree-journey-stack"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="parsetree-stage-card"
                            >
                                <div className="parsetree-stage-header mb-6">
                                    <div className="parsetree-stage-title">
                                        <Sparkles size={24} className="text-indigo-400" />
                                        <h3>Generated Parse Tree</h3>
                                    </div>
                                    <div className="parsetree-badge success">Derivation Complete</div>
                                </div>
                                <div className="parsetree-flow-canvas">
                                    <ReactFlow
                                        nodes={nodes}
                                        edges={edges}
                                        fitView
                                        attributionPosition="bottom-right"
                                        nodesDraggable={true}
                                    >
                                        <Background color="#1e293b" gap={16} />
                                        <Controls showInteractive={false} />
                                    </ReactFlow>
                                </div>
                                <div className="flex gap-6 justify-center mt-6 p-4 bg-gray-900/50 rounded-2xl flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded border-2 border-[var(--accent-primary)] bg-[rgba(88,166,255,0.1)]"></div>
                                        <span className="text-sm text-gray-300">Non-Terminal (Stmt, Expr, Term, Factor)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#d2a8ff] bg-[rgba(210,168,255,0.1)]"></div>
                                        <span className="text-sm text-gray-300">Terminal Operator</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-[var(--success)] bg-[rgba(63,185,80,0.1)] shadow-[0_0_10px_rgba(63,185,80,0.4)]"></div>
                                        <span className="text-sm text-gray-300">Terminal Lexeme (Identifier, Number)</span>
                                    </div>
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 ml-4 border-l border-gray-700 pl-4 py-1">
                                        <span className="text-sm text-muted">Yields: <strong className="text-white font-mono ml-2">{expression}</strong></span>
                                    </motion.div>
                                </div>
                            </motion.div>

                            <div className="parsetree-bottom-spacer"></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ParseTreeVisualizer;
