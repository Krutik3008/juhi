import { compile } from './compilerEngine.js';
import fs from 'fs';

const result = compile('position = initial + rate * 60');
fs.writeFileSync('tree.txt', result.parseTree);
