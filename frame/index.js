import "dotenv/config";
import yoctoSpinner from "yocto-spinner";
import OpenAI from "openai";
import { MCPClient } from "mcp-client";

console.log("Debug info:");
console.log("OpenAI API key:", process.env["OPENAI_API_KEY"]);
console.log("OpenAI base URL:", process.env["OPENAI_BASE_URL"]);

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
  baseURL: process.env["OPENAI_BASE_URL"],
});

const mcpClient = new MCPClient({
  name: "web",
  version: "1.0.0",
});

await mcpClient.connect({
  type: "stdio",
  command: "/Users/alameen/.nvm/versions/node/v22.14.0/bin/npx",
  args: ["-y", "tavily-mcp@0.2.0"],
  env: {
    TAVILY_API_KEY: process.env["TAVILY_API_KEY"],
    // PATH: process.env.PATH,
    // PATH: "/Users/alameen/.nvm/versions/node/v22.14.0/bin:/usr/local/bin:/usr/bin:/bin",
    // NODE_PATH: "/Users/alameen/.nvm/versions/node/v22.14.0/lib/node_modules",
  },
});

const tools = await mcpClient.getAllTools();
console.log("Tools Discovered:", tools);
// const resources = await mcpClient.getAllResources();
// console.log("Resources:", resources);
// await mcpClient.ping();

const functionTools = tools.map((tool) => {
  const { name, description, inputSchema } = tool;
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: inputSchema,
    },
  };
});

const spinner = yoctoSpinner({ text: "Generating" }).start();
const completion = await client.chat.completions.create({
  model: "llama3.1:8b",
  messages: [
    { role: "developer", content: "Talk like a senior software engineer." },
    {
      role: "user",
      content: "What is the weather like in San Diego today?",
    },
  ],
  tools: functionTools,
});
spinner.stop();

console.log("Completion:", completion);
const func = completion.choices[0].message?.tool_calls[0].function;
console.log("message:", completion.choices[0].message?.tool_calls[0].function);

if (completion.choices[0].message?.tool_calls[0].function) {
  spinner.start(`Tool call(${func.name})`);
  const result = await mcpClient.callTool({
    name: func.name,
    arguments: JSON.parse(func.arguments),
  });
  spinner.stop();
  console.log("Result:", result);
}

mcpClient.close();
// const content = completion.choices[0].message.content;
// const finalContent = content.split("</think>").at(-1);
// console.log("Final content:\n", finalContent);
