import dotenv from "dotenv";
dotenv.config();

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { Client, PrivateKey } from "@hashgraph/sdk";
import { HederaLangchainToolkit, coreEVMPlugin } from "hedera-agent-kit";
import { ChatOpenAI } from "@langchain/openai";

// Choose your AI provider (example: OpenAI)
function createLLM() {
  if (process.env.OPENAI_API_KEY) {
    return new ChatOpenAI({ model: "gpt-4o-mini" });
  }
  throw new Error("No AI provider configured.");
}

async function main() {
  const llm = createLLM();

  // Hedera client setup
  const client = Client.forTestnet().setOperator(
    process.env.HEDERA_ACCOUNT_ID,
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY),
  );

  // Initialize toolkit with EVM plugin
  const hederaAgentToolkit = new HederaLangchainToolkit({
    client,
    configuration: {
      plugins: [coreEVMPlugin],
    },
  });

  const tools = hederaAgentToolkit.getTools();

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant"],
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  const agent = createToolCallingAgent({
    llm,
    tools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });

  // Example: Interact with your deployed contract
  const response = await agentExecutor.invoke({
    input: "Call the 'greet' function on contract 0xYourContractAddress",
  });
  console.log(response);
}

main().catch(console.error);
