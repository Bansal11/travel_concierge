/**
 * Unit tests for LlmClient.
 * Mocks the Anthropic SDK to avoid real API calls.
 */
import Anthropic from "@anthropic-ai/sdk";
import { LlmClient, LlmClientError } from "../src/services/llmClient";

jest.mock("@anthropic-ai/sdk");

describe("LlmClient", () => {
  const mockCreate = jest.fn();

  beforeEach(() => {
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as any));
    jest.clearAllMocks();
  });

  it("returns answer and usage on success", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Bali is a great destination!" }],
      model: "claude-sonnet-4-6",
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const client = new LlmClient("sk-test", "claude-sonnet-4-6");
    const result = await client.chat("Where should I go?", []);

    expect(result.answer).toBe("Bali is a great destination!");
    expect(result.input_tokens).toBe(100);
    expect(result.output_tokens).toBe(50);
  });

  it("injects context chunks into user message", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Answer" }],
      model: "claude-sonnet-4-6",
      usage: { input_tokens: 200, output_tokens: 30 },
    });

    const client = new LlmClient("sk-test", "claude-sonnet-4-6");
    await client.chat("What is included?", [
      { id: "1", content: "Includes flights and hotel.", source: "bali.md", score: 0.9, metadata: {} },
    ]);

    const callArg = mockCreate.mock.calls[0][0] as Anthropic.MessageCreateParams;
    const lastMessage = callArg.messages[callArg.messages.length - 1];
    expect(lastMessage.content).toContain("Includes flights and hotel.");
    expect(lastMessage.content).toContain("Context:");
  });

  it("throws LlmClientError on API failure", async () => {
    const apiError = new Anthropic.APIError(503, { error: "overloaded" }, "Overloaded", {});
    mockCreate.mockRejectedValueOnce(apiError);

    const client = new LlmClient("sk-test", "claude-sonnet-4-6");
    await expect(client.chat("test", [])).rejects.toThrow(LlmClientError);
  });

  it("throws LlmClientError when no text block returned", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [],
      model: "claude-sonnet-4-6",
      usage: { input_tokens: 10, output_tokens: 0 },
    });

    const client = new LlmClient("sk-test", "claude-sonnet-4-6");
    await expect(client.chat("test", [])).rejects.toThrow(LlmClientError);
  });
});
