import path from "node:path";
import * as fs from 'node:fs/promises'
import { parseArgs } from "node:util";
import { Dirent, createReadStream } from "node:fs";
import yn from 'yn'
import readline from 'readline/promises'
import events from 'node:events'

/**
 * @param {string} filepath
 */
export async function getNLines(filepath) {
    const content = await fs.readFile(filepath, 'utf-8')

    const contentArray = content.split('\n')

    let data = ''
    for (let i = 0; i < 4; ++i) {
        data += contentArray[i] + '\n'
    }
    return data
}

/**
 * @param {string} filepath
 * @param {{ year: number, name: string, license: string }} data
 */
export async function writeUpdatedSPDX(filepath, data) {
    const content = await fs.readFile(filepath, 'utf-8')
    const contentArray = content.split('\n')

    const indexesToRemove = []
    for (let i = 0; i < contentArray.length; ++i) {
        const line = contentArray[i]
        if (line.startsWith('//')) {
            indexesToRemove.push(i)
        } else {
            break
        }
    }

    for (let i = indexesToRemove.length - 1; i >= 0; --i) {
        contentArray.splice(i, 1)
    }

    let newContent = contentArray.join('\n')
    newContent = `// SPDX-FileCopyrightText: Copyright (c) ${data.year} ${data.name}
// SPDX-License-Identifier: ${data.license}\n` + content
    await fs.writeFile(filepath, newContent)
}

export async function* walk(dir, options) {
	const dirents = await fs.readdir(dir, { withFileTypes: true });
	for (const dirent of dirents) {
		const filepath = path.join(dir, dirent.name);
		if (dirent.isDirectory()) {
		if (options.ignoredDirectories.includes(dirent.name)) {
			yield null
		} else {
			yield* walk(filepath, options);
		}
		} else {
			yield filepath;
		}
	}
}

/**
 * @param {Dirent} filepath
 */
export async function checkFile(rootDir, filepath, totalBad) {
	const relPath = filepath.slice(rootDir.length + 1)
	
	const ext = path.parse(filepath).ext

	
	if (!['.md', '.js', '.jsx', '.tsx', '.json', '.toml'].includes(ext)) {
		console.log('BAD', relPath)
		totalBad.push(relPath)
	}
	
	const content = await fs.readFile(filepath, { encoding: 'utf-8' })
	const result = content.match(/^\/\/ SPDX-FileCopyrightText: Copyright (c) (?<copyrightYear>.*?) (?<copyrightHolder>.*?)\n\/\/ SPDX-License-Identifier: (?<spdxLicenseIdentifier>.*?)\n/u)
	if (result?.groups?.copyrightYear && result?.groups?.copyrightHolder && result?.groups?.spdxLicenseIdentifier) {
		return
	}

	console.log('Fix?' + filepath)
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})
	
	const input = await rl.question('Fix')
	rl.close()
	if (yn(input)) {
		const license = 'MPL-2.0'
		const year = '2023'
		const name = 'Edwin Kofler'

		console.log('---')
		console.log(await getNLines(filepath))
		console.log('---')
		await writeUpdatedSPDX(filepath, { year, name, license })
		console.log('---')
		console.log(await getNLines(filepath))
		console.log('---')
	}
}
