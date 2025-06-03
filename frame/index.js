import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yoctoSpinner from "yocto-spinner";
import MCPHandler from "./mcpHandler.js";

const mcpHandler = new MCPHandler();
await mcpHandler.init();

console.debug("Debug info:");
console.debug("OpenAI base URL:", process.env["OPENAI_BASE_URL"]);
console.debug("Model:", process.env["OPENAI_MODEL"]);
console.debug("apiKey:", process.env["OPENAI_API_KEY"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const systemPromptPath = path.join(__dirname, "prompt.txt");
const systemPrompt = await fs
  .readFile(systemPromptPath, "utf8")
  .catch((error) => {
    console.error("Failed to read system prompt file:", error);
    process.exit(1);
  });

const messages = [
  {
    role: "system",
    content: systemPrompt,
  },
];

console.log("##############################################################");

async function chat() {
  const spinner = yoctoSpinner({ text: "LLM" }).start();

  const response = await fetch(
    // `${process.env.OPENAI_BASE_URL}/chat/completions`,
    "http://127.0.0.1:8080/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL, // e.g., "QwQ-32B"
        temperature: 0.6,
        top_p: 0.95,
        top_k: 20,
        min_p: 0,
        presence_penalty: 1.5,
        max_completion_tokens: 8192, // Ensure ample space for reasoning
        reasoning_format: "hidden", // parsed, raw or hidden
        tools: mcpHandler.availableTools(), // Function/tool definitions
        messages: messages, // Ensure this includes: [system_prompt, user_query, ..., latest_assistant_output]
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `API error: ${response.statusText} - ${JSON.stringify(errorData)}`
    );
  }

  const completion = await response.json();
  spinner.stop("√ LLM");
  // console.log("choices: ", completion.choices.length);
  // console.log("message:", completion.choices[0].message);
  const message = completion.choices[0].message;
  if (!!message.content) {
    messages.push({ role: message.role, content: message.content });
  }
  // console.log("All messages so far:");
  // console.log(messages);
  if (message.tool_calls?.length > 0) {
    const toolCall = message.tool_calls[0];
    const func = toolCall.function;
    spinner.start(`Tool call(${func.name})`);
    const result = await mcpHandler.callTool(func);
    spinner.stop(`√ Tool call(${func.name})`);
    // console.log("Result:", result);
    messages.push({
      role: "tool",
      content: JSON.stringify(result),
      tool_call_id: toolCall.id,
      name: func.name,
    });
    chat();
  } else {
    console.log(message.content);
  }
}

async function chatLoop() {
  while (true) {
    // get user input
    const userInput = await new Promise((resolve) => {
      process.stdin.once("data", (data) => {
        resolve(data.toString().trim());
      });
    });

    if (userInput.toLowerCase() === "exit") {
      break;
    }

    messages.push({
      role: "user",
      content: userInput,
    });

    await chat();
  }
}

await chatLoop();

await mcpHandler.dispose();
