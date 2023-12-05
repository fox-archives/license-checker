import path from "node:path";
import { parseArgs } from "node:util";

import { walk, checkFile } from './util.js'

const { positionals, values: options } = parseArgs({
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

const wrapInOctothorpe = (line) => `# ${line}`
const wrapInSlashAsterisks = (line) => `/* ${line} */`
const wrapInDoubleSlash = (line) => `// ${line}`
const wrapInXMLComment = (line) => `<!-- ${line} -->`

const config = {
	info: {
		license: 'MPL-2.0',
		year: '2023',
		name: 'Edwin Kofler'
	},
	rootDir: path.resolve(positionals.length > 0 ? positionals[0] : '.'),
	cliOptions: options,
	ignoredDirectories: ['.git', 'node_modules'],
	globalApply: {
		skipLine: (line) => /^#!/.test(line)
	},
	perApply: [
		{
			match: ['.html'],
			wrapInComment: wrapInXMLComment
		},
		{
			match: ['.css', '.postcss'],
			wrapInComment: wrapInSlashAsterisks
		},
		{
			match: ['.js', '.jsx', '.ts', '.tsx'],
			wrapInComment: wrapInDoubleSlash
		},
		{
			match: ['.py'],
			wrapInComment: wrapInOctothorpe
		},
		{
			match: ['.yaml', '.yml'],
			skipLine: (line) => line === '#cloud-config',
			wrapInComment: wrapInOctothorpe
		},
		{
			match: ['.toml'],
			wrapInComment: wrapInOctothorpe
		}
	]
}

let badFiles = []
for await (const filepath of walk(config.rootDir, config)) {
	if (filepath === null) continue

	const files = await checkFile(filepath, config)
	badFiles = badFiles.concat(files)
}
console.log(`Total Bad: ${badFiles.length}`)
