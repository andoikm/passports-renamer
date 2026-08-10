import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import * as pdfjsLib from 'pdfjs-dist';

const require = createRequire(import.meta.url);
const workerPath = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
