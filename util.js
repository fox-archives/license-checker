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
 * @param {unknown} config
 */
export async function writeUpdatedSPDX(filepath,curConfig, config) {
    const content = await fs.readFile(filepath, 'utf-8')
    const contentArray = content.split('\n')

    const indexesToRemove = []
    for (let i = 0; i < contentArray.length; ++i) {
        const line = contentArray[i]
        // TODO
        if (line.startsWith('//')) {
            indexesToRemove.push(i)
        } else {
            break
        }
    }

    for (let i = indexesToRemove.length - 1; i >= 0; --i) {
        contentArray.splice(i, 1)
    }

    const prelude = [`SPDX-FileCopyrightText: Copyright (c) ${config.info.year} ${config.info.name}`, `SPDX-License-Identifier: ${config.info.license}\n`].map(curConfig.wrapInComment).join('\n')
    
    const newContent = prelude +  contentArray.join('\n')
await fs.writeFile(filepath, newContent)
}

export async function* walk(dir, config) {
	const dirents = await fs.readdir(dir, { withFileTypes: true });
	for (const dirent of dirents) {
		const filepath = path.join(dir, dirent.name);
		if (dirent.isDirectory()) {
		if (config.ignoredDirectories.includes(dirent.name)) {
			yield null
		} else {
			yield* walk(filepath, config);
		}
		} else {
			yield filepath;
		}
	}
}

/**
 * @param {string} rootDir
 */
export async function checkFile(filepath, config) {
	const relPath = filepath.slice(config.rootDir.length + 1)
	const ext = path.parse(filepath).ext

    const curConfig = {
        skipLine: [config.globalApply.skipLine],
        wrapInComment: (line) => line,
    }

    let wasFound = false
	for (const perApply of config.perApply) {
        if ( perApply.match.includes(ext)) {
            wasFound = true
            if (perApply.skipLine) {
                curConfig.skipLine.push(perApply.skipLine)

            }
            if (perApply.wrapInComment) {
                curConfig.wrapInComment = perApply.wrapInComment
            }
        }
    }
	if (!wasFound) {
		console.log('BAD: Extension not found for:', relPath)
		return [relPath]
	}
	
	const content = await fs.readFile(filepath, { encoding: 'utf-8' })
	const result = content.match(/^\/\/ SPDX-FileCopyrightText: Copyright (c) (?<copyrightYear>.*?) (?<copyrightHolder>.*?)\n\/\/ SPDX-License-Identifier: (?<spdxLicenseIdentifier>.*?)\n/u)
	if (result?.groups?.copyrightYear && result?.groups?.copyrightHolder && result?.groups?.spdxLicenseIdentifier) {
		return
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})
	const input = await rl.question(`Fix file: ${filepath}? `)
	rl.close()
	if (yn(input)) {
		console.log('---')
		console.log(await getNLines(filepath))
		console.log('---')
		await writeUpdatedSPDX(filepath,curConfig, config)
		console.log('---')
		console.log(await getNLines(filepath))
		console.log('---')
	} else {
        console.log('BAD: No prelude SPDX ids for file:', relPath)
    }
}
