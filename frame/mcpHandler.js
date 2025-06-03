import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MCPClient } from "mcp-client";

class MCPHandler {
  constructor() {
    this.clients = {};
    this.clientTools = {};
    this.mcpServers = null;
  }

  async init() {
    console.log("Initializing MCPHandler...");
    try {
      await this.fetchMcpServersFromConfig();
      // console.debug("Mcp config:", this.mcpServers);
      await this.initClients();
      // console.debug("MCP clients: ", this.clients);
      await this.fetchClientTools();
      // console.debug("Client tools: ", this.clientTools);
      console.log("Tools discovered:", Object.keys(this.clientTools).length);
    } catch (error) {
      console.error(`Failed to initialize MCP: ${error.message}`);
    }
  }

  availableTools() {
    return Object.values(this.clientTools).map((tool) => tool.toolFunction);
  }

  async callTool({ name, arguments: args }) {
    const tool = this.clientTools[name];
    if (!tool) {
      throw new Error(`Tool ${name} not found.`);
    }

    const client = this.clients[tool.clientName];
    if (!client) {
      throw new Error(`Client ${tool.clientName} not found for tool ${name}.`);
    }

    return await client.callTool({ name, arguments: JSON.parse(args) });
  }

  async dispose() {
    Object.values(this.clients).forEach((client) => {
      client.close();
    });
  }

  async fetchMcpServersFromConfig() {
    const configPath = this.getConfigPath();
    // console.debug(`Loading MCP config from: ${configPath}`);

    try {
      const configData = await fs.readFile(configPath, "utf8");
      this.mcpServers = JSON.parse(configData);
    } catch (error) {
      console.error(
        `Failed to load MCP config from ${configPath}: ${error.message}. Expected a valid JSON file with MCP server configurations.`
      );
    }
  }

  async initClients() {
    Object.entries(this.mcpServers).forEach(async ([name, config]) => {
      try {
        const client = new MCPClient({
          name,
          version: "1.0.0",
        });
        await client.connect(config);
        this.clients[name] = client;
      } catch (error) {
        console.error(
          `Failed to initialize MCP client ${name}: ${error.message}`
        );
      }
    });
  }

  async fetchClientTools() {
    await Promise.all(
      Object.entries(this.clients).map(async ([clientName, client]) => {
        const tools = await client.getAllTools();

        tools.forEach((tool) => {
          const { name, description, inputSchema } = tool;
          const toolFunction = {
            type: "function",
            function: {
              name,
              description,
              parameters: inputSchema,
            },
          };
          this.clientTools[name] = {
            toolName: name,
            clientName,
            toolFunction,
          };
        });
      })
    );
  }

  getConfigPath() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    return (
      process.env.MCP_CONFIG_PATH || path.join(__dirname, "mcp-config.json")
    );
  }
}

export default MCPHandler;
