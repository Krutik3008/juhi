import React, { useState, useEffect } from 'react';
import { GitMerge, Play, Minimize2 } from 'lucide-react';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import dagre from 'dagre';

// --- Value Numbering DAG Builder ---
const buildDAG = (code, isOptimized) => {
    let rNodes = [];
    let rEdges = [];
    let env = {};
    let signatureMap = {};
    let idCounter = 1;

    const lines = code.split('\n').map(l => l.trim()).filter(l => l);
    const optCode = [];
    let savedCSEs = 0;

    for (let line of lines) {
        let parts = line.split('=');
        if (parts.length < 2) {
            optCode.push({ oldLine: line, newLine: line, isCSE: false });
            continue; // ignore non-assignments
        }

        let result = parts[0].trim();
        let rhs = parts.slice(1).join('=').trim();
        let tokens = rhs.split(/\s+/);

        if (tokens.length === 3) {
            let arg1 = tokens[0];
            let op = tokens[1];
            let arg2 = tokens[2];

            // Resolve args to nodes, creating leaves if unseen
            let leftId = env[arg1];
            if (!leftId) {
                leftId = (idCounter++).toString();
                rNodes.push({ id: leftId, data: { label: arg1 }, className: `dag-node leaf ${isOptimized ? 'optimized' : ''}`, position: { x: 0, y: 0 } });
                env[arg1] = leftId;
            }

            let rightId = env[arg2];
            if (!rightId) {
                rightId = (idCounter++).toString();
                rNodes.push({ id: rightId, data: { label: arg2 }, className: `dag-node leaf ${isOptimized ? 'optimized' : ''}`, position: { x: 0, y: 0 } });
                env[arg2] = rightId;
            }

            let sig = `${op}:${leftId}:${rightId}`;
            let sig2 = null;
            if (op === '+' || op === '*') sig2 = `${op}:${rightId}:${leftId}`; // Commutative

            if (isOptimized && (signatureMap[sig] || (sig2 && signatureMap[sig2]))) {
                let existingId = signatureMap[sig] || signatureMap[sig2];
                env[result] = existingId;
                savedCSEs++;

                let originalVar = Object.keys(env).find(v => env[v] === existingId && v !== result);
                if (originalVar) {
                    optCode.push({ oldLine: line, newLine: `${result} = ${originalVar}`, isCSE: true });
                } else {
                    optCode.push({ oldLine: line, newLine: line, isCSE: false });
                }
            } else {
                let opId = (idCounter++).toString();
                rNodes.push({ id: opId, data: { label: op }, className: `dag-node op ${isOptimized ? 'optimized' : ''}`, position: { x: 0, y: 0 } });
                rEdges.push({
                    id: `e${opId}-${leftId}-L`, source: opId, target: leftId,
                    type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' }, style: { strokeWidth: 2, stroke: isOptimized ? 'var(--accent-primary)' : '#8b949e' }
                });
                rEdges.push({
                    id: `e${opId}-${rightId}-R`, source: opId, target: rightId,
                    type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' }, style: { strokeWidth: 2, stroke: isOptimized ? 'var(--accent-primary)' : '#8b949e' }
                });

                env[result] = opId;
                signatureMap[sig] = opId;
                optCode.push({ oldLine: line, newLine: line, isCSE: false });
            }
        } else if (tokens.length === 1) {
            let arg1 = tokens[0];
            let leftId = env[arg1];
            if (!leftId) {
                leftId = (idCounter++).toString();
                rNodes.push({ id: leftId, data: { label: arg1 }, className: `dag-node leaf ${isOptimized ? 'optimized' : ''}`, position: { x: 0, y: 0 } });
                env[arg1] = leftId;
            }
            env[result] = leftId;
            optCode.push({ oldLine: line, newLine: line, isCSE: false });
        } else {
            optCode.push({ oldLine: line, newLine: line, isCSE: false });
        }
    }

    // Add variable tags to nodes for visualization
    let varNodes = [];
    Object.entries(env).forEach(([vName, nId]) => {
        // ensure mapping isn't just the literal leaf
        const node = rNodes.find(n => n.id === nId);
        if (node && node.data.label !== vName) {
            if (!node.data.vars) node.data.vars = [];
            node.data.vars.push(vName);
        }
    });

    rNodes = rNodes.map(n => {
        if (n.data.vars && n.data.vars.length > 0) {
            n.data.label = `${n.data.label}\n(${n.data.vars.join(',')})`;
        }
        return n;
    });

    return { rNodes, rEdges, optCode, savedCSEs };
};

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 60, nodesep: 50 });

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

const defaultCode = `t1 = a + b\nt2 = a + b\nt3 = t1 + t2`;

const DAGOptimizer = () => {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [sourceCode, setSourceCode] = useState(defaultCode);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [results, setResults] = useState({ optCode: [], savedCSEs: 0 });

    const generateGraph = () => {
        if (!sourceCode.trim()) {
            setNodes([]); setEdges([]); setResults({ optCode: [], savedCSEs: 0 }); return;
        }

        const { rNodes, rEdges, optCode, savedCSEs } = buildDAG(sourceCode, isOptimizing);
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rNodes, rEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setResults({ optCode, savedCSEs });
    };

    useEffect(() => {
        generateGraph();
    }, [isOptimizing, sourceCode]);

    return (
        <div className="simulation-workspace">
            <div className="workspace-header">
                <h2><Minimize2 size={24} className="inline-block mr-2" />DAG Optimization</h2>
                <p>Construct a Directed Acyclic Graph (DAG) for a basic block to identify common subexpressions.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-gray-900 border border-gray-700 p-4 rounded-lg mt-6">
                <div className="w-full lg:w-1/2">
                    <label className="text-sm text-gray-400 mb-1 block">Basic Block (Three-Address Code)</label>
                    <textarea
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white font-mono min-h-[100px]"
                        value={sourceCode}
                        onChange={(e) => setSourceCode(e.target.value)}
                        placeholder="t1 = a + b&#10;t2 = a + b"
                    />
                </div>
                <div className="w-full lg:w-auto h-full flex items-center mt-4 justify-end">
                    <button
                        className={`btn-primary flex items-center gap-2 ${isOptimizing ? 'bg-success border-success text-white' : ''}`}
                        onClick={() => setIsOptimizing(!isOptimizing)}
                    >
                        {isOptimizing ? 'Show Unoptimized Tree' : 'Run DAG Optimizer'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Visualizer */}
                <div className="glass-panel p-2 relative" style={{ height: '500px', width: '100%' }}>
                    <style>
                        {`
                            .dag-node {
                                border-radius: 50%;
                                width: 60px;
                                height: 60px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-weight: bold;
                                font-size: 16px;
                                font-family: var(--font-mono);
                                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                                text-align: center;
                                white-space: pre-wrap;
                                line-height: 1.1;
                            }
                            .dag-node.op {
                                background: var(--bg-secondary);
                                border: 2px solid var(--accent-primary);
                                color: var(--accent-primary);
                            }
                            .dag-node.leaf {
                                background: var(--bg-tertiary);
                                border: 2px solid var(--success);
                                color: var(--success);
                            }
                            .dag-node.optimized {
                                border-width: 3px;
                                box-shadow: 0 0 15px rgba(88, 166, 255, 0.4);
                            }
                            .react-flow__edge-path {
                                stroke: #8b949e;
                                stroke-width: 2;
                            }
                        `}
                    </style>

                    <h4 className="absolute top-4 left-4 z-10 font-mono text-white bg-gray-900/80 px-4 py-2 rounded-lg border border-gray-700">
                        {isOptimizing ? 'Optimized DAG' : 'Unoptimized Syntax Tree'}
                    </h4>

                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        fitView
                        attributionPosition="bottom-right"
                        nodesDraggable={true}
                    >
                        <Background color="#30363d" gap={16} />
                        <Controls />
                    </ReactFlow>
                </div>

                <div className="glass-panel p-6 h-[500px] flex flex-col justify-center overflow-y-auto">
                    <h3 className="text-2xl mb-6 flex items-center gap-3">
                        <GitMerge className="text-[var(--accent-primary)]" /> Optimization Results
                    </h3>

                    {isOptimizing ? (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            {results.savedCSEs > 0 ? (
                                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6 text-green-400 mb-6">
                                    <h4 className="font-bold text-lg mb-2">Common Subexpression Eliminated!</h4>
                                    <p className="text-sm text-gray-300">The DAG identified {results.savedCSEs} identical subexpression(s) and reused the previous computation(s).</p>
                                </div>
                            ) : (
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-gray-300 mb-6">
                                    <h4 className="font-bold text-lg mb-2">No Redundancies Found</h4>
                                    <p className="text-sm text-muted">The DAG structure perfectly matches the unoptimized tree structure because all subexpressions are unique.</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <h4 className="text-white border-b border-gray-700 pb-2">Optimized Instructions:</h4>
                                <div className="font-mono text-base bg-gray-900 p-4 rounded border border-gray-800 overflow-x-auto">
                                    {results.optCode.map((line, idx) => (
                                        <div key={idx} className="my-1">
                                            {line.isCSE ? (
                                                <>
                                                    <span className="text-red-400 line-through opacity-50 block text-sm">{line.oldLine}</span>
                                                    <span className="text-success font-bold bg-green-900/40 rounded px-1">{line.newLine}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-200">{line.newLine}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="text-center text-muted">
                            <p className="text-lg mb-4">The unoptimized tree creates duplicate nodes for identical expressions across assignments.</p>
                            <p>Click "Run DAG Optimizer" to eliminate the redundancy if any exist.</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default DAGOptimizer;
