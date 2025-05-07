# Git Commit Message Generator

An AI-powered tool that generates meaningful commit messages by analyzing your git changes.

## Prerequisites

- Python 3.12
- Git
- Ollama running locally with qwen2.5-coder model

## Installation

1. Clone the repository
2. Activate the environment:
```bash
sh setup.sh
```

## Usage

Run the script by providing the repository path:

```bash
python agent.py /path/to/your/repo
```

The tool will:
1. Analyze your git changes
2. Generate summaries for each modified file
3. Create a comprehensive commit message

## Features

- Supports added, modified, and deleted files
- Provides file-by-file change summaries
- Generates contextual commit messages
- Uses OpenAI's API with local Ollama backend

## Future Enhancements

- Allow configuration of the Ollama model via a config file or environment variable, with a default fallback model.
- Extend functionality to support running as an MCP server.
