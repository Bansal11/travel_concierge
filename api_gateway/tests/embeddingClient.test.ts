/**
 * Unit tests for EmbeddingClient.
 * Mocks axios to avoid real HTTP calls.
 */
import axios from "axios";
import { EmbeddingClient, EmbeddingServiceError } from "../src/services/embeddingClient";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("EmbeddingClient", () => {
  const mockPost = jest.fn();

  beforeEach(() => {
    mockedAxios.create.mockReturnValue({ post: mockPost } as any);
    jest.clearAllMocks();
  });

  describe("query()", () => {
    it("returns QueryResult on success", async () => {
      const mockData = {
        chunks: [{ id: "1", content: "Bali package", source: "bali.md", score: 0.9, metadata: {} }],
        retrieval_latency_ms: 12.5,
        rerank_latency_ms: 5.2,
      };
      mockPost.mockResolvedValueOnce({ data: mockData });

      const client = new EmbeddingClient("http://localhost:8001");
      const result = await client.query("beach holiday");

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].source).toBe("bali.md");
      expect(mockPost).toHaveBeenCalledWith("/query", { query: "beach holiday", top_n: 3 });
    });

    it("throws EmbeddingServiceError on axios error", async () => {
      const axiosError = new Error("Network Error") as any;
      axiosError.isAxiosError = true;
      axiosError.response = { status: 503, data: { detail: "Service down" } };
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      mockPost.mockRejectedValueOnce(axiosError);

      const client = new EmbeddingClient("http://localhost:8001");
      await expect(client.query("test")).rejects.toThrow(EmbeddingServiceError);
    });
  });

  describe("ingest()", () => {
    it("returns IngestResult on success", async () => {
      const mockData = { chunks_stored: 5, source: "pkg.md" };
      mockPost.mockResolvedValueOnce({ data: mockData });

      const client = new EmbeddingClient("http://localhost:8001");
      const result = await client.ingest("Holiday content", "pkg.md");

      expect(result.chunks_stored).toBe(5);
      expect(mockPost).toHaveBeenCalledWith("/ingest", expect.objectContaining({ source: "pkg.md" }));
    });
  });
});
