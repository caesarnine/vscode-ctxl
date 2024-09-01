import * as fs from 'fs';
import * as yaml from 'js-yaml';

const DEFAULT_PRESET_FILE = 'ctxl_presets.yaml';

interface Preset {
    suffixes: string[];
    include: string[];
    exclude: string[];
    prefixes?: string[];
}

const BUILT_IN_PRESETS: { [key: string]: Preset } = {
    python: {
        suffixes: ['.py', '.pyi', '.pyx', '.ipynb'],
        include: ['*.py', '*.pyi', '*.pyx', '*.ipynb'],
        exclude: [
            '__pycache__',
            '*.pyc',
            '*.pyo',
            '*.pyd',
            'build',
            'dist',
            '*.egg-info',
            'venv',
            '.pytest_cache',
        ],
    },
    javascript: {
        suffixes: ['.js', '.mjs', '.cjs', '.jsx'],
        include: ['*.js', '*.mjs', '*.cjs', '*.jsx'],
        exclude: [
            'node_modules',
            'npm-debug.log',
            'yarn-error.log',
            'yarn-debug.log',
            'package-lock.json',
            'yarn.lock',
            'dist',
            'build',
        ],
    },
    typescript: {
        suffixes: ['.ts', '.tsx'],
        include: ['*.ts', '*.tsx'],
        exclude: [
            'node_modules',
            'npm-debug.log',
            'yarn-error.log',
            'yarn-debug.log',
            'package-lock.json',
            'yarn.lock',
            'dist',
            'build',
        ],
    },
    web: {
        suffixes: ['.html', '.css', '.scss', '.sass', '.less', '.vue'],
        include: ['*.html', '*.css', '*.scss', '*.sass', '*.less', '*.vue'],
        exclude: ['node_modules', 'bower_components', 'dist', 'build', '.cache'],
    },
    java: {
        suffixes: ['.java'],
        include: ['*.java'],
        exclude: [
            'target',
            '.gradle',
            'build',
            'out',
        ],
    },
    csharp: {
        suffixes: ['.cs', '.csx', '.csproj'],
        include: ['*.cs', '*.csx', '*.csproj'],
        exclude: [
            'bin',
            'obj',
            '*.suo',
            '*.user',
            '*.userosscache',
            '*.sln.docstates',
        ],
    },
    go: {
        suffixes: ['.go'],
        include: ['*.go'],
        exclude: [
            'vendor',
        ],
    },
    ruby: {
        suffixes: ['.rb', '.rake', '.gemspec'],
        include: ['*.rb', '*.rake', '*.gemspec'],
        exclude: [
            '.bundle',
            'vendor/bundle',
        ],
    },
    php: {
        suffixes: ['.php'],
        include: ['*.php'],
        exclude: [
            'vendor',
            'composer.lock',
        ],
    },
    rust: {
        suffixes: ['.rs'],
        include: ['*.rs'],
        exclude: [
            'target',
            'Cargo.lock',
        ],
    },
    swift: {
        suffixes: ['.swift'],
        include: ['*.swift'],
        exclude: [
            '.build',
            'Packages',
        ],
    },
    kotlin: {
        suffixes: ['.kt', '.kts'],
        include: ['*.kt', '*.kts'],
        exclude: [
            '.gradle',
            'build',
            'out',
        ],
    },
    scala: {
        suffixes: ['.scala', '.sc'],
        include: ['*.scala', '*.sc'],
        exclude: [
            '.bloop',
            '.metals',
            'target',
        ],
    },
    docker: {
        suffixes: ['.dockerfile', '.dockerignore'],
        prefixes: ['Dockerfile'],
        include: [
            'Dockerfile',
            'Dockerfile.*',
            '.dockerignore',
            'docker-compose.yml',
            'docker-compose.yaml',
        ],
        exclude: [],
    },
    misc: {
        suffixes: [
            '.md',
            '.txt',
            '.json',
            '.xml',
            '.yml',
            '.yaml',
            '.ini',
            '.cfg',
            '.conf',
            '.toml',
        ],
        include: [
            '*.md',
            '*.txt',
            '*.json',
            '*.xml',
            '*.yml',
            '*.yaml',
            '*.ini',
            '*.cfg',
            '*.conf',
            '*.toml',
        ],
        exclude: [],
    },
};

function loadPresets(presetFile: string = DEFAULT_PRESET_FILE): { [key: string]: Preset } {
    if (fs.existsSync(presetFile)) {
        const fileContents = fs.readFileSync(presetFile, 'utf-8');
        return yaml.load(fileContents) as { [key: string]: Preset };
    }
    return {};
}

function savePresets(presets: { [key: string]: Preset }, presetFile: string = DEFAULT_PRESET_FILE): void {
    const yamlStr = yaml.dump(presets);
    fs.writeFileSync(presetFile, yamlStr, 'utf-8');
}

function getPresets(): { [key: string]: Preset } {
    const customPresets = loadPresets();
    return { ...BUILT_IN_PRESETS, ...customPresets };
}

function viewPresets(): string {
    const presets = getPresets();
    return yaml.dump(presets);
}

function saveBuiltInPresets(presetFile: string = DEFAULT_PRESET_FILE): void {
    savePresets(BUILT_IN_PRESETS, presetFile);
}

export { getPresets, viewPresets, saveBuiltInPresets };