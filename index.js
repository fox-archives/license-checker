import path from "node:path";
import * as fs from 'node:fs/promises'
import { parseArgs } from "node:util";
import { Dirent, createReadStream } from "node:fs";
import yn from 'yn'
import readline from 'readline/promises'
import events from 'node:events'

import { getNLines, writeUpdatedSPDX, walk, checkFile } from './util.js'

const { positionals, values: option } = parseArgs({
	options: {
		fix: {
			type: 'boolean'
		},
		help: {
			type: 'boolean',
			short: 'h'
		}
	}
})

const octothorp = (line) => `# ${line}`
const slashAsterisk = (line) => `/* ${line} */`
const doubleSlash = (line) => `// ${line}`

// TODO: markdown, tsx, jsx, json, toml
const globalOptions = {
	skipLine: (line) => /^#!/.test(line)
}
const fileOptions = {
	'text/html': {
		wrapInComment: (line) => `<!-- ${line} -->`
	},
	'text/css': {
		wrapInComment: slashAsterisk
	},
	'text/javascript': {
		wrapInComment: doubleSlash
	},
	'text/x-python': {
		wrapInComment: octothorp
	},
	'application/x-yaml': {
		skipLine: (line) => line === '#cloud-config',
		wrapInComment: octothorp
	},
	'application/toml': {
		wrapInComment: octothorp
	}
}
const rootDir = path.resolve(positionals.length > 0 ? positionals[0] : '.')
const ignoredDirectories = ['.git', 'node_modules']

const totalBad = []
for await (const filepath of walk(rootDir, { ignoredDirectories })) {
	if (filepath === null) continue

	await checkFile(rootDir, filepath, totalBad)
}
console.log(`Total Bad: ${totalBad.length}`)
