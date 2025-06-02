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
console.debug("Model:", process.env["OPENAI_MODEL"]);
console.debug("apiKey:", process.env["OPENAI_API_KEY"]);

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
  baseURL: process.env["OPENAI_BASE_URL"],
});

const messages = [
  {
    role: "system",
    content: `
    You are a coding assistant. You will help the user manage tasks and projects with version control example Git.

    Do all the Git actions for the current working directory and for the current branch.
    The 'run_command' function could be used to execute a Git command.
    `,
  },
];

console.log("##############################################################");

async function chat() {
  const spinner = yoctoSpinner({ text: "LLM" }).start();
  // const completion = await client.chat.completions.create({
  //   model: process.env["OPENAI_MODEL"],
  //   messages,
  //   tools: mcpHandler.availableTools(),
  // });

  const response = await fetch(
    `${process.env.OPENAI_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        // Model configuration parameters
        model: process.env.OPENAI_MODEL, // e.g., "QwQ-32B"
        temperature: 0.6,
        top_p: 0.95,
        max_completion_tokens: 8192, // Ensure ample space for reasoning
        tools: mcpHandler.availableTools(), // Function/tool definitions

        // Use dynamic messages array from your code
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
  messages.push({ role: message.role, content: message.content });
  console.log("All messages so far:");
  console.log(messages);
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

// const content = completion.choices[0].message.content;
// const finalContent = content.split("</think>").at(-1);
// console.log("Final content:\n", finalContent);

await chatLoop();

await mcpHandler.dispose();
