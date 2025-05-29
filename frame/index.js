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
  tools: mcpHandler.availableTools(),
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

// const content = completion.choices[0].message.content;
// const finalContent = content.split("</think>").at(-1);
// console.log("Final content:\n", finalContent);

await mcpHandler.dispose();
