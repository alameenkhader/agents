import "dotenv/config";
import yoctoSpinner from "yocto-spinner";
import OpenAI from "openai";
import MCPHandler from "./mcpHandler.js";

const mcpHandler = new MCPHandler();
await mcpHandler.init();

// await mcpHandler.dispose();
// console.log("Early exit for debugging");
// process.exit(0);

console.debug("Debug info:");
console.debug("OpenAI base URL:", process.env["OPENAI_BASE_URL"]);

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
  baseURL: process.env["OPENAI_BASE_URL"],
});

const messages = [
  { role: "developer", content: "Talk like a senior software engineer." },
];

console.log("##############################################################");

async function chat() {
  const spinner = yoctoSpinner({ text: "LLM" }).start();
  const completion = await client.chat.completions.create({
    model: "qwen3:30b",
    messages,
    tools: mcpHandler.availableTools(),
  });
  spinner.stop("√ LLM");
  // console.log("choices: ", completion.choices.length);
  // console.log("message:", completion.choices[0].message);
  const message = completion.choices[0].message;
  messages.push(message);
  if (message.tool_calls?.length > 0) {
    const func = message.tool_calls[0].function;
    spinner.start(`Tool call(${func.name})`);
    const result = await mcpHandler.callTool(func);
    spinner.stop(`√ Tool call(${func.name})`);
    // console.log("Result:", result);
    messages.push({
      role: "tool",
      content: JSON.stringify(result),
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

// const content = completion.choices[0].message.content;
// const finalContent = content.split("</think>").at(-1);
// console.log("Final content:\n", finalContent);

await chatLoop();

await mcpHandler.dispose();
