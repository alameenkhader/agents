import "dotenv/config";
import yoctoSpinner from "yocto-spinner";
import OpenAI from "openai";
import { MCPClient } from "mcp-client";
import MCPHandler from "./mcpHandler.js";

const mcpHandler = new MCPHandler();
await mcpHandler.init();

console.log("Early exit for debugging");
process.exit(0);

const mcpServers = {
  web: {
    type: "stdio",
    command: "/Users/alameen/.nvm/versions/node/v22.14.0/bin/npx",
    args: ["-y", "tavily-mcp@0.2.0"],
    env: {
      TAVILY_API_KEY: process.env["TAVILY_API_KEY"],
    },
  },
  shell: {
    type: "stdio",
    command: "/Users/alameen/.nvm/versions/node/v22.14.0/bin/npx",
    args: ["-y", "mcp-shell"],
  },
};

console.log("Connecting to MCP Servers:");
const mcpClients = [];
const availableTools = [];
await Promise.all(
  Object.entries(mcpServers).map(async ([name, config]) => {
    console.log(`Connecting to ${name} MCP server...`);
    const client = new MCPClient({
      name,
      version: "1.0.0",
    });
    await client.connect(config);
    const tools = await client.getAllTools();
    console.log("Tools Discovered:", tools.length);
    const functionTools = tools.map((tool) => {
      const { name, description, inputSchema } = tool;
      console.log("Tool:");
      return {
        type: "function",
        function: {
          name,
          description,
          parameters: inputSchema,
        },
      };
    });
    availableTools.push(...functionTools);
    mcpClients.push(client);
  })
);
console.log("Done");

console.log("Debug info:");
console.log("OpenAI base URL:", process.env["OPENAI_BASE_URL"]);

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
  baseURL: process.env["OPENAI_BASE_URL"],
});

// const mcpClient = new MCPClient({
//   name: "web",
//   version: "1.0.0",
// });

// await mcpClient.connect({
// type: "stdio",
// command: "/Users/alameen/.nvm/versions/node/v22.14.0/bin/npx",
// args: ["-y", "tavily-mcp@0.2.0"],
// env: {
//   TAVILY_API_KEY: process.env["TAVILY_API_KEY"],
// },
// ...mcpServers.web,
// });

// const tools = await mcpClient.getAllTools();
// console.log("Tools Discovered:", tools);
// const resources = await mcpClient.getAllResources();
// console.log("Resources:", resources);
// await mcpClient.ping();

// const functionTools = tools.map((tool) => {
//   console.log("Tool:", tool.name);
//   const { name, description, inputSchema } = tool;
//   return {
//     type: "function",
//     function: {
//       name,
//       description,
//       parameters: inputSchema,
//     },
//   };
// });

const spinner = yoctoSpinner({ text: "Generating" }).start();
const messages = [
  { role: "developer", content: "Talk like a senior software engineer." },
  {
    role: "user",
    content: `
      What is the current working directory?
    `,
  },
];
const completion = await client.chat.completions.create({
  model: "qwen3:30b",
  messages,
  tools: availableTools,
});
spinner.stop();

// const message = completion.choices[0].message;
// if (message.tool_calls.length > 0) {
//   console.log("Completion:", completion);
//   const func = completion.choices[0].message?.tool_calls[0].function;
//   console.log(
//     "message:",
//     completion.choices[0].message?.tool_calls[0].function
//   );

//   if (completion.choices[0].message?.tool_calls[0].function) {
//     spinner.start(`Tool call(${func.name})`);
//     const result = await mcpClient.callTool({
//       name: func.name,
//       arguments: JSON.parse(func.arguments),
//     });
//     spinner.stop();
//     console.log("Result:", result);
//   }
// } else {
//   console.log("##############################################################");
//   console.log(message.content);
// }

console.log("##############################################################");
console.log("choices: ", completion.choices.length);
completion.choices.forEach((choice) => {
  console.log("Choice:", choice?.message.tool_calls?.[0]);
});

mcpClients.forEach((client) => {
  client.close();
});
// const content = completion.choices[0].message.content;
// const finalContent = content.split("</think>").at(-1);
// console.log("Final content:\n", finalContent);
