import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Code, ArrowRight, RotateCcw } from 'lucide-react';
import { compile } from './compilerEngine';
import './Home.css';

/* ─── Graphical Parse Tree Component (SVG) ─── */
const NODE_W = 36;
const NODE_H = 20;
const H_GAP = 8;
const V_GAP = 28;

function measureTree(node) {
    if (!node) return { w: 0, h: 0, node: null };
    const children = [];
    if (node.left) children.push(measureTree(node.left));
    if (node.right) children.push(measureTree(node.right));

    if (children.length === 0) {
        return { w: NODE_W, h: NODE_H, node, children: [] };
    }
    const totalChildW = children.reduce((s, c) => s + c.w, 0) + H_GAP * (children.length - 1);
    const w = Math.max(NODE_W, totalChildW);
    const maxChildH = Math.max(...children.map(c => c.h));
    return { w, h: NODE_H + V_GAP + maxChildH, node, children };
}

function positionTree(measured, x, y) {
    const result = { val: measured.node.val, x: x + measured.w / 2, y, children: [] };
    if (measured.children.length > 0) {
        const totalChildW = measured.children.reduce((s, c) => s + c.w, 0) + H_GAP * (measured.children.length - 1);
        let cx = x + (measured.w - totalChildW) / 2;
        for (const child of measured.children) {
            result.children.push(positionTree(child, cx, y + NODE_H + V_GAP));
            cx += child.w + H_GAP;
        }
    }
    return result;
}

function renderTreeSVG(positioned, elements = { nodes: [], edges: [] }) {
    const nw = Math.max(NODE_W, positioned.val.length * 7 + 12);
    elements.nodes.push(
        <g key={`n-${positioned.x}-${positioned.y}`}>
            <rect
                x={positioned.x - nw / 2}
                y={positioned.y}
                width={nw}
                height={NODE_H}
                rx={8}
                ry={8}
                className="ptree-node-rect"
            />
            <text
                x={positioned.x}
                y={positioned.y + NODE_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="ptree-node-text"
            >
                {positioned.val}
            </text>
        </g>
    );
    for (const child of positioned.children) {
        const cnw = Math.max(NODE_W, child.val.length * 10 + 20);
        elements.edges.push(
            <path
                key={`e-${positioned.x}-${positioned.y}-${child.x}-${child.y}`}
                d={`M ${positioned.x} ${positioned.y + NODE_H}
                    C ${positioned.x} ${positioned.y + NODE_H + V_GAP * 0.5},
                      ${child.x} ${child.y - V_GAP * 0.5},
                      ${child.x} ${child.y}`}
                className="ptree-edge"
            />
        );
        renderTreeSVG(child, elements);
    }
    return elements;
}

const ParseTreeVisual = ({ treeData }) => {
    const svgContent = useMemo(() => {
        if (!treeData || treeData.length === 0) return null;
        const allTrees = treeData.map((tree, idx) => {
            const measured = measureTree(tree);
            return { positioned: positionTree(measured, 0, 0), w: measured.w, h: measured.h, idx };
        });

        const PADDING = 30;
        const TREE_GAP = 40;
        let totalW = 0;
        const offsets = [];
        for (const t of allTrees) {
            offsets.push(totalW);
            totalW += t.w + TREE_GAP;
        }
        totalW -= TREE_GAP;
        const maxH = Math.max(...allTrees.map(t => t.h));
        const svgW = totalW + PADDING * 2;
        const svgH = maxH + PADDING * 2;

        const allElements = { nodes: [], edges: [] };
        allTrees.forEach((t, i) => {
            const shifted = shiftTree(t.positioned, offsets[i] + PADDING, PADDING);
            renderTreeSVG(shifted, allElements);
        });

        return { svgW, svgH, elements: allElements };
    }, [treeData]);

    if (!svgContent) return null;

    return (
        <div className="ptree-canvas">
            <svg style={{ maxWidth: Math.min(svgContent.svgW * 1.8, 500 * treeData.length), margin: '0 auto', display: 'block' }} viewBox={`0 0 ${svgContent.svgW} ${svgContent.svgH}`} preserveAspectRatio="xMidYMid meet">
                {svgContent.elements.edges}
                {svgContent.elements.nodes}
            </svg>
        </div>
    );
};

function shiftTree(tree, dx, dy) {
    return {
        val: tree.val,
        x: tree.x + dx,
        y: tree.y + dy,
        children: tree.children.map(c => shiftTree(c, dx, dy))
    };
}

const Home = () => {
    const [sourceCode, setSourceCode] = useState('');
    const [isSimulating, setIsSimulating] = useState(false);
    const [activePhase, setActivePhase] = useState(0);
    const [compileResult, setCompileResult] = useState(null);

    const phases = [
        { id: 1, title: 'Lexical Analysis', desc: 'Tokenizing input string' },
        { id: 2, title: 'Syntax Analysis', desc: 'Building Parse Tree' },
        { id: 3, title: 'Semantic Analysis', desc: 'Type checking & Annotated Tree' },
        { id: 4, title: 'Intermediate Code', desc: 'Three-Address Code Generation' },
        { id: 5, title: 'Code Optimization', desc: 'Improving Intermediate Code' },
        { id: 6, title: 'Code Generation', desc: 'Target Assembly Output' }
    ];

    const handleSimulate = () => {
        if (!sourceCode.trim()) return;

        const result = compile(sourceCode);
        setCompileResult(result);
        setIsSimulating(true);
        setActivePhase(1);

        let currentPhase = 1;
        const interval = setInterval(() => {
            currentPhase += 1;
            if (currentPhase <= 6) {
                setActivePhase(currentPhase);
            } else {
                clearInterval(interval);
            }
        }, 1200);
    };

    const handleReset = () => {
        setSourceCode('');
        setIsSimulating(false);
        setActivePhase(0);
        setCompileResult(null);
    };

    return (
        <div className="home-container">
            <div className="page-header">
                <h1 className="page-title">Compiler Pipeline Simulation</h1>
                <p className="page-description">
                    Enter a source statement and watch the magic of compilation unfold through all 6 phases automatically.
                </p>
            </div>

            <div className="content-section">
                <div className="glass-panel input-panel">
                    <div className="panel-header">
                        <Code size={20} className="panel-icon" />
                        <h3>Source Code Input</h3>
                        <button className="btn-reset" onClick={handleReset}>
                            <RotateCcw size={14} />
                            Reset
                        </button>
                    </div>
                    <div className="preset-examples-container">
                        <span className="preset-label">
                            <Code size={14} /> Try an example:
                        </span>
                        <div className="preset-buttons">
                            {[
                                { label: "Standard Assignment", code: "position = initial + rate * 60" },
                                { label: "Type Coercion", code: "float rate = 60 * 1.5;" },
                                { label: "Common Subexpression", code: "t1 = a + b\nt2 = a + b\nt3 = t1 + t2" }
                            ].map((preset, idx) => (
                                <button
                                    key={idx}
                                    className="preset-btn"
                                    onClick={() => setSourceCode(preset.code)}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Statement to Compile</label>
                        <textarea
                            className="source-textarea"
                            value={sourceCode}
                            onChange={(e) => setSourceCode(e.target.value)}
                            placeholder="Enter an expression like: position = initial + rate * 60"
                        />
                    </div>
                    <button className="btn-primary simulate-btn" onClick={handleSimulate}>
                        <Play size={18} />
                        Start Full Pipeline Simulation
                    </button>
                </div>

                <div className="pipeline-visualizer">
                    <div className="simulation-linear-view mt-4">
                        <h3 className="section-title">Compilation Progress</h3>
                        <div className="phases-container">
                            {phases.map((phase, index) => (
                                <React.Fragment key={phase.id}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`phase-card ${activePhase >= phase.id ? 'completed' : ''} ${activePhase === phase.id ? 'active' : ''}`}
                                    >
                                        <div className="phase-number">{phase.id}</div>
                                        <div className="phase-content">
                                            <h4>{phase.title}</h4>
                                            <p>{phase.desc}</p>
                                        </div>
                                    </motion.div>
                                    {index < phases.length - 1 && (
                                        <ArrowRight className={`phase-arrow ${activePhase > phase.id ? 'active' : ''}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {isSimulating && (
                            <div className="results-container mt-12">
                                <h3 className="section-title mb-6">Step-by-Step Compilation Process</h3>
                                <div className="results-stack">
                                    {phases.map((phase) => (
                                        activePhase >= phase.id && (
                                            <motion.div
                                                key={phase.id}
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="glass-panel result-card full-width"
                                            >
                                                <div className="result-header p-4 border-b border-gray-800 flex items-center gap-3">
                                                    <div className="phase-pill">Phase {phase.id}</div>
                                                    <h4 className="text-xl font-bold text-white">{phase.title}</h4>
                                                </div>
                                                <div className="result-body p-6 bg-black/20">
                                                    {phase.id === 1 && compileResult && (
                                                        <div className="phase-code-section">
                                                            <p className="phase-label"><strong>Tokens produced:</strong></p>
                                                            <div className="phase-table-wrapper">
                                                                <table className="phase-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Lexeme</th>
                                                                            <th>Token Type</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {compileResult.tokens.map((token, i) => (
                                                                            <tr key={i}>
                                                                                <td>{token.lexeme}</td>
                                                                                <td>{token.type}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            <p className="phase-label">So the <strong>token stream</strong> becomes:</p>
                                                            <pre className="phase-code-block">{compileResult.tokenStream}</pre>
                                                        </div>
                                                    )}
                                                    {phase.id === 2 && compileResult && (
                                                        <ParseTreeVisual treeData={compileResult.parseTreeData} />
                                                    )}
                                                    {phase.id === 3 && compileResult && (
                                                        <div className="phase-table-wrapper">
                                                            <table className="phase-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Identifier</th>
                                                                        <th>Type</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {compileResult.symbolTable.map((sym, i) => (
                                                                        <tr key={i}>
                                                                            <td>{sym.name}</td>
                                                                            <td>{sym.type}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                    {phase.id === 4 && compileResult && (
                                                        <div className="phase-code-section">
                                                            <p className="phase-label">Three-address code:</p>
                                                            <pre className="phase-code-block">{compileResult.tac}</pre>
                                                        </div>
                                                    )}
                                                    {phase.id === 5 && compileResult && (
                                                        <div className="phase-code-section">
                                                            <p className="phase-label">Optimized code:</p>
                                                            <pre className="phase-code-block">{compileResult.optimized}</pre>
                                                        </div>
                                                    )}
                                                    {phase.id === 6 && compileResult && (
                                                        <div className="phase-code-section">
                                                            <p className="phase-label">Assembly output:</p>
                                                            <pre className="phase-code-block">{compileResult.assembly}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
