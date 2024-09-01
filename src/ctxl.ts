import * as fs from 'fs';
import * as path from 'path';
import * as xmlbuilder from 'xmlbuilder';
import { getPresets } from './preset_manager';
import ignore from 'ignore';

const DEFAULT_EXCLUDE = ['.*']; // This will exclude all dotfiles and folders

const logger = console; // Using console for logging

function detectProjectTypes(folderPath: string): Set<string> {
    const detectedTypes = new Set<string>();

    const walkSync = (dir: string) => {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                walkSync(filePath);
            } else {
                const fileLower = file.toLowerCase();

                // Check prefixes
                for (const [projectType, preset] of Object.entries(getPresets())) {
                    if (preset.prefixes && preset.prefixes.some((prefix: string) => fileLower.startsWith(prefix.toLowerCase()))) {
                        detectedTypes.add(projectType);
                        continue;
                    }
                }

                // Check suffixes
                const ext = path.extname(file);
                if (ext) {
                    for (const [projectType, preset] of Object.entries(getPresets())) {
                        if (preset.suffixes.includes(ext)) {
                            detectedTypes.add(projectType);
                            break; // No need to check other presets for this file
                        }
                    }
                }

                // Check for exact matches (like docker-compose.yml)
                for (const [projectType, preset] of Object.entries(getPresets())) {
                    if (preset.include && preset.include.includes(file)) {
                        detectedTypes.add(projectType);
                    }
                }
            }
        });
    };

    walkSync(folderPath);
    logger.debug(`Detected project types: ${Array.from(detectedTypes)}`);
    return detectedTypes;
}

function parseFilterPatterns(filterString: string): { include: string[], exclude: string[] } {
    if (!filterString) {
        return { include: [], exclude: [] };
    }

    const patterns = filterString.split(/\s+/);
    const includePatterns: string[] = [];
    const excludePatterns: string[] = [];
    patterns.forEach((pattern) => {
        if (pattern.startsWith('!')) {
            excludePatterns.push(pattern.slice(1));
        } else {
            includePatterns.push(pattern);
        }
    });
    logger.debug(`Parsed filter patterns - Include: ${includePatterns}, Exclude: ${excludePatterns}`);
    return { include: includePatterns, exclude: excludePatterns };
}

function combinePresets(presetNames: string[], filterPatterns: { include: string[], exclude: string[] }): { include: string[], exclude: string[] } {
    const combinedPreset = { include: new Set<string>(), exclude: new Set<string>(['node_modules', ...DEFAULT_EXCLUDE]) };
    const presets = getPresets();

    presetNames.forEach((presetName) => {
        if (presets[presetName]) {
            const preset = presets[presetName];
            preset.include.forEach((pattern: string) => combinedPreset.include.add(pattern));
            preset.exclude.forEach((pattern: string) => combinedPreset.exclude.add(pattern));
        } else {
            logger.warn(`Preset '${presetName}' not found. Skipping.`);
        }
    });

    filterPatterns.include.forEach((pattern) => combinedPreset.include.add(pattern));
    filterPatterns.exclude.forEach((pattern) => combinedPreset.exclude.add(pattern));

    logger.debug(`Combined preset - Include: ${Array.from(combinedPreset.include)}, Exclude: ${Array.from(combinedPreset.exclude)}`);
    return {
        include: Array.from(combinedPreset.include).sort(),
        exclude: Array.from(combinedPreset.exclude).sort(),
    };
}

function readGitignore(gitignorePath: string): string[] {
    let patterns: string[] = [];
    if (fs.existsSync(gitignorePath)) {
        patterns = fs.readFileSync(gitignorePath, 'utf-8').split('\n').filter(Boolean);
    }
    logger.debug(`Read ${patterns.length} patterns from .gitignore`);
    return patterns;
}

function createFileElement(filePath: string, fileContent: string): xmlbuilder.XMLElement {
    const fileElement = xmlbuilder.create('file');
    fileElement.att('path', filePath);
    fileElement.ele('content', {}, fileContent);
    return fileElement;
}

function generateTree(
    folderPath: string,
    includePatterns: string[],
    excludePatterns: string[],
    gitignorePath: string,
    includeDotfiles: boolean,
    prefix: string = ''
): string {
    let treeStr = '';

    const gitignorePatterns = readGitignore(gitignorePath);
    const ig = ignore().add([...excludePatterns, ...gitignorePatterns]);
    const includeIg = ignore().add(includePatterns);

    const items = fs.readdirSync(folderPath)
        .filter(item => includeDotfiles || !item.startsWith('.'))
        .filter(item => {
            const relPath = path.relative(folderPath, path.join(folderPath, item));
            return !ig.ignores(relPath) && (includePatterns.length === 0 || includeIg.ignores(relPath));
        })
        .sort((a, b) => {
            const aPath = path.join(folderPath, a);
            const bPath = path.join(folderPath, b);
            const aIsDir = fs.statSync(aPath).isDirectory();
            const bIsDir = fs.statSync(bPath).isDirectory();
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });

    items.forEach((item, index) => {
        const itemPath = path.join(folderPath, item);
        const isLast = index === items.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        
        treeStr += `${prefix}${connector}${item}\n`;

        if (fs.statSync(itemPath).isDirectory()) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            treeStr += generateTree(itemPath, includePatterns, excludePatterns, gitignorePath, includeDotfiles, newPrefix);
        }
    });

    return treeStr;
}

function generateXML(
    folderPath: string,
    includePatterns: string[],
    excludePatterns: string[],
    gitignorePath: string,
    task: string,
    includeDotfiles: boolean
): string {
    const gitignorePatterns = readGitignore(gitignorePath);
    console.log('Gitignore patterns:', gitignorePatterns);
    console.log('Include patterns:', includePatterns);

    const ig = ignore().add([...excludePatterns, ...gitignorePatterns]);
    const includeIg = ignore().add(includePatterns);

    const rootElement = xmlbuilder.create('root');
    const projectContext = rootElement.ele('project_context');

    let fileCount = 0;
    let errorCount = 0;

    const walkSync = (dir: string) => {
        console.log(`Scanning directory: ${dir}`);
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            const relFilePath = path.relative(folderPath, filePath);

            console.log(`Checking: ${relFilePath}`);

            if (!includeDotfiles && file.startsWith('.') && !stat.isDirectory()) {
                console.log(`Skipping dotfile: ${relFilePath}`);
                return;
            }

            if (ig.ignores(relFilePath)) {
                console.log(`Ignored by patterns: ${relFilePath}`);
                return;
            }

            if (stat.isDirectory()) {
                console.log(`Entering directory: ${relFilePath}`);
                walkSync(filePath);
            } else if (includePatterns.length === 0 || includeIg.ignores(relFilePath)) {
                console.log(`Including file: ${relFilePath}`);
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    const fileElement = createFileElement(relFilePath, fileContent);
                    projectContext.importDocument(fileElement);
                    fileCount += 1;
                } catch (e: unknown) {
                    if (e instanceof Error) {
                        const errorElement = projectContext.ele('error', { path: relFilePath }, e.message);
                        errorCount += 1;
                        console.error(`Error processing file ${relFilePath}: ${e.message}`);
                    } else {
                        const errorElement = projectContext.ele('error', { path: relFilePath }, 'Unknown error');
                        errorCount += 1;
                        console.error(`Error processing file ${relFilePath}: Unknown error`);
                    }
                }
            } else {
                console.log(`Not included by patterns: ${relFilePath}`);
            }
        });
    };

    walkSync(folderPath);
    console.log(`Processed ${fileCount} files with ${errorCount} errors`);

    const treeOutput = generateTree(folderPath, includePatterns, excludePatterns, gitignorePath, includeDotfiles);
    projectContext.ele('directory_structure', {}, treeOutput);

    rootElement.ele('task', {}, task);

    return rootElement.end({ pretty: true });
}

export { generateXML, detectProjectTypes, parseFilterPatterns, combinePresets };