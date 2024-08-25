# Contextual

Contextual is an experimental Visual Studio Code coding assistant that can interact with your current workspace context, open and create files, execute shell commands, and more. 

It explores the idea of allowing the AI to run shell commands and interact with your workspace without constant user intervention. (This also means it can also be destructive, use version control!)

You can do things like ask it to create a new webscraper or website (or edit an existing one) and it will generate different parts of the code for you, run the scraper, debug any runtime or syntax errors, and more.

It uses Anthropic's Claude model, and supports both direct Anthropic API access and AWS Bedrock.

This is very much a proof of concept, expect bugs and missing features.

## Features

- **Contextual AI Chat**: Interact with an AI assistant that has access to your current workspace context, including open files and editor contents.
- **Intelligent Code Assistance**: Get help with coding tasks, ask questions, and receive context-aware responses.
- **File Management**: Open and create files directly through the AI interface.
- **Command Execution**: Run shell commands from the chat interface and view the results.
- **Markdown Rendering**: Chat messages support Markdown formatting for better readability.
- **Workspace Awareness**: The AI has access to your workspace structure for more contextual assistance.
- **Flexible Deployment**: Choose between direct Anthropic API access or AWS Bedrock integration.
- **Smart File Filtering**: Respects .gitignore rules and VS Code's file exclude settings.

## Requirements

- Visual Studio Code version 1.92.0 or higher
- Visual Studio Code - Insiders
    - As of 08/2024 the shell integration we're using is only available in the Insiders build. 
    - The integration available in the current stable release doesn't allow us to see the output/results of the shell command.
    - This new shell integration should be available in the next stable release.
- For direct API access: An Anthropic API key
- For AWS Bedrock: Properly configured AWS credentials with Bedrock access

## Usage

1. Open the Command Palette (Ctrl+Shift+P) and run "Open Contextual Chat Interface" or click the Contextual icon in the Activity Bar.
2. Set your Anthropic API key or configure AWS credentials when prompted or through the settings.
3. Start chatting with the AI assistant. You can:
   - Ask questions about your code or workspace
   - Request code explanations or suggestions
   - Instruct the AI to open or create files
   - Ask the AI to execute shell commands

## Configuration

This extension contributes the following settings:

- `contextualChat.clientType`: Set the Anthropic client type ("direct" for Anthropic API or "bedrock" for AWS Bedrock)
- `contextualChat.anthropicApiKey`: Set your Anthropic API key for authentication when using direct access (stored securely)

When using AWS Bedrock, ensure your AWS credentials are properly configured in your environment or AWS credentials file.

## Commands

- `vscode-ctxl.openChatInterface`: Open the Contextual Chat sidebar
- `vscode-ctxl.setAnthropicApiKey`: Set or update your Anthropic API key (for direct access)
- `vscode-ctxl.setClientType`: Set the Anthropic client type (direct or bedrock)

## Development

To set up the development environment:

1. Clone the repository
2. Make sure you have Node.js installed
3. Run `npm install` to install dependencies
4. Run `npm run compile` to compile the TypeScript code
5. Open the project in Visual Studio Code Insiders
6. Press F5 to start debugging

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Privacy and Data Usage

This extension sends your current workspace context, including file contents and structure, to either Anthropic's API or AWS Bedrock for processing, depending on your configuration. It respects .gitignore rules and VS Code's file exclude settings to avoid sending sensitive or unnecessary files. However, please be cautious when using this extension with sensitive projects.

## Technologies Used

- TypeScript
- VS Code Extension API
- Anthropic Claude API
- AWS Bedrock (optional)
- markdown-it for message rendering
- ignore package for smart file filtering