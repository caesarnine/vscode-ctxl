import * as fs from 'fs';
import * as path from 'path';
import * as xmlbuilder from 'xmlbuilder';
import { getPresets } from './preset_manager';
import ignore from 'ignore';
import picomatch from 'picomatch'; // Add this import

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
    includeDotfiles: boolean
): string {
    const gitignorePatterns = readGitignore(gitignorePath);
    const isExcluded = picomatch([...excludePatterns, ...gitignorePatterns]);
    const isIncluded = includePatterns.length === 0 ? () => true : picomatch(includePatterns);

    let treeStr = '';
    let items = fs.readdirSync(folderPath).sort();
    if (!includeDotfiles) {
        items = items.filter(item => !item.startsWith('.'));
    }

    items.forEach((item, index) => {
        const itemPath = path.join(folderPath, item);
        const relItemPath = path.relative(folderPath, itemPath);

        if (isExcluded(relItemPath)) {
            return;
        }

        const connector = index === items.length - 1 ? '└── ' : '├── ';
        treeStr += `${connector}${item}\n`;

        if (fs.statSync(itemPath).isDirectory()) {
            const extension = index === items.length - 1 ? '    ' : '│   ';
            treeStr += generateTree(itemPath, includePatterns, excludePatterns, gitignorePath, includeDotfiles);
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
    const ig = ignore().add(gitignorePatterns);
    const isExcluded = picomatch([...excludePatterns, ...gitignorePatterns]);
    const isIncluded = includePatterns.length === 0 ? () => true : picomatch(includePatterns);

    const rootElement = xmlbuilder.create('root');
    const projectContext = rootElement.ele('project_context');

    let fileCount = 0;
    let errorCount = 0;

    const walkSync = (dir: string) => {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            const relFilePath = path.relative(folderPath, filePath);

            // Skip dotfiles if not explicitly included
            if (!includeDotfiles && file.startsWith('.')) {
                return;
            }

            // Check exclusion patterns first
            if (isExcluded(relFilePath)) {
                return;
            }

            // Check inclusion patterns
            if (stat.isDirectory()) {
                if (isIncluded(relFilePath)) {
                    walkSync(filePath);
                }
            } else if (isIncluded(relFilePath)) {
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    const fileElement = createFileElement(relFilePath, fileContent);
                    projectContext.importDocument(fileElement);
                    fileCount += 1;
                } catch (e: unknown) {
                    if (e instanceof Error) {
                        const errorElement = projectContext.ele('error', { path: relFilePath }, e.message);
                        errorCount += 1;
                        logger.error(`Error processing file ${relFilePath}: ${e.message}`);
                    } else {
                        const errorElement = projectContext.ele('error', { path: relFilePath }, 'Unknown error');
                        errorCount += 1;
                        logger.error(`Error processing file ${relFilePath}: Unknown error`);
                    }
                }
            }
        });
    };

    walkSync(folderPath);
    logger.info(`Processed ${fileCount} files with ${errorCount} errors`);

    const treeOutput = generateTree(folderPath, includePatterns, excludePatterns, gitignorePath, includeDotfiles);
    projectContext.ele('directory_structure', {}, treeOutput);

    rootElement.ele('task', {}, task);

    return rootElement.end({ pretty: true });
}

export { generateXML, detectProjectTypes, parseFilterPatterns, combinePresets };