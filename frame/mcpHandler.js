import { promises as fs } from "fs";
import path from "path";
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
    } catch (error) {
      console.error(`Failed to initialize MCP: ${error.message}`);
    }
  }

  availableTools() {
    return Object.values(this.clientTools).map((tool) => tool.toolFunction);
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
      const client = new MCPClient({
        name,
        version: "1.0.0",
      });
      await client.connect(config);
      this.clients[name] = client;
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
    return (
      process.env.MCP_CONFIG_PATH || path.join(process.cwd(), "mcp-config.json")
    );
  }
}

export default MCPHandler;
