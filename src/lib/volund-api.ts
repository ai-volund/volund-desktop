/**
 * Volund API client — thin wrapper around the gateway REST API.
 */

const BASE_URL = "http://localhost:8080";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user: { id: string; email: string; display_name: string };
}

export interface Conversation {
  id: string;
  tenant_id: string;
  user_id?: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  author_type: string;
  author_id?: string;
  agent_name?: string;
  content: ContentBlock[] | string;
  created_at: string;
}

export interface ContentBlock {
  type: string;
  text?: string;
  // attachment fields
  attachment_id?: string;
  url?: string;
  file_name?: string;
  mime_type?: string;
  size?: number;
}

export interface Attachment {
  id: string;
  conversation_id: string;
  user_id?: string;
  file_name: string;
  mime_type: string;
  size: number;
  url?: string;
  created_at: string;
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  tenant_id: string;
  conversation_id?: string;
  agent_id?: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  result?: unknown;
  error?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// ── Agents / Profiles ──────────────────────────────────────────────────────────

export interface AgentProfile {
  id: string;
  tenant_id: string;
  name: string;
  profile_type: string;
  system_prompt: string;
  model_provider: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
  skills: string[];
  created_at: string;
  updated_at: string;
}

// ── Forge ──────────────────────────────────────────────────────────────────────

export interface ForgeSkill {
  name: string;
  version: string;
  type: "prompt" | "mcp" | "cli";
  description: string;
  author: string;
  tags: string[];
  downloads: number;
  created_at: string;
  updated_at: string;
  readme?: string;
}

// ── Credentials ────────────────────────────────────────────────────────────────

export interface ProviderCredential {
  provider: string;
  scopes: string[];
  token_type: string;
  has_refresh: boolean;
  expires_at?: string;
  stored_at: string;
}

export interface AvailableSkill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: string;
  tags: string[];
  enabled: boolean;
  required_providers: string[];
  created_at: string;
}

export interface ConnectionProvider {
  id: string;
  display_name: string;
  category: string;
  icon_url: string;
  scopes: string[];
  connected: boolean;
  connect_url: string;
}

export interface CredentialAuditEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  provider: string;
  detail: string;
  created_at: string;
}

// ── Memory ─────────────────────────────────────────────────────────────────────

export interface Memory {
  id: string;
  tenant_id: string;
  user_id: string;
  content: string;
  metadata: Record<string, string>;
  created_at: string;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  metadata: Record<string, string>;
  similarity: number;
  created_at: string;
}

// OIDC provider info returned by the backend.
export interface OIDCProvider {
  name: string;
  display_name: string;
}

class VolundAPI {
  private jwt: string | null = null;
  private jwtExpiry = 0;
  private authUrl: string;

  constructor() {
    this.authUrl = "http://localhost:3456";
  }

  /**
   * Fetch a fresh JWT from better-auth using the session cookie.
   * This replaces the old manual JWT management.
   */
  private async refreshJWT(): Promise<string> {
    const res = await fetch(`${this.authUrl}/api/auth/token`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Not authenticated");
    const data = await res.json();
    this.jwt = data.token;
    // JWT expires in 15m, refresh at 12m
    this.jwtExpiry = Date.now() + 12 * 60 * 1000;
    return this.jwt!;
  }

  /** Check if we have a valid JWT (doesn't guarantee session is active). */
  getToken() {
    return this.jwt;
  }

  /** Clear local JWT cache (session is managed by better-auth). */
  logout() {
    this.jwt = null;
    this.jwtExpiry = 0;
  }

  private async headers(): Promise<HeadersInit> {
    // Get or refresh the JWT
    if (!this.jwt || Date.now() >= this.jwtExpiry) {
      await this.refreshJWT();
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.jwt}`,
    };
  }

  async listConversations(): Promise<Conversation[]> {
    const res = await fetch(`${BASE_URL}/v1/conversations`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to list conversations");
    const data = await res.json();
    return data.conversations ?? [];
  }

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${BASE_URL}/v1/conversations/${id}`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to get conversation");
    return res.json();
  }

  async createConversation(title: string): Promise<Conversation> {
    const res = await fetch(`${BASE_URL}/v1/conversations`, {
      method: "POST",
      headers: await this.headers(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    return res.json();
  }

  async uploadAttachment(conversationId: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `${BASE_URL}/v1/conversations/${conversationId}/attachments`,
      {
        method: "POST",
        headers: this.jwt ? { Authorization: `Bearer ${this.jwt}` } : {},
        body: formData,
      }
    );
    if (!res.ok) throw new Error("Failed to upload attachment");
    return res.json();
  }

  async listAttachments(conversationId: string): Promise<Attachment[]> {
    const res = await fetch(
      `${BASE_URL}/v1/conversations/${conversationId}/attachments`,
      { headers: await this.headers() }
    );
    if (!res.ok) throw new Error("Failed to list attachments");
    const data = await res.json();
    return data.attachments ?? [];
  }

  async sendMessage(
    conversationId: string,
    text: string,
    attachments?: Attachment[]
  ): Promise<Message> {
    const content: ContentBlock[] = [];
    if (text) {
      content.push({ type: "text", text });
    }
    if (attachments) {
      for (const att of attachments) {
        content.push({
          type: "attachment",
          attachment_id: att.id,
          url: att.url,
          file_name: att.file_name,
          mime_type: att.mime_type,
          size: att.size,
        });
      }
    }
    const res = await fetch(
      `${BASE_URL}/v1/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: await this.headers(),
        body: JSON.stringify({ content }),
      }
    );
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  }

  async updateConversation(id: string, title: string): Promise<Conversation> {
    const res = await fetch(`${BASE_URL}/v1/conversations/${id}`, {
      method: "PATCH",
      headers: await this.headers(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to update conversation");
    return res.json();
  }

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/conversations/${id}`, {
      method: "DELETE",
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to delete conversation");
  }

  wsUrl(conversationId: string): string {
    return `ws://localhost:8080/ws/conv/${conversationId}?token=${this.jwt}`;
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async listTasks(): Promise<Task[]> {
    const res = await fetch(`${BASE_URL}/v1/tasks`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to list tasks");
    const data = await res.json();
    return data.tasks ?? [];
  }

  async getTask(id: string): Promise<Task> {
    const res = await fetch(`${BASE_URL}/v1/tasks/${id}`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to get task");
    return res.json();
  }

  async cancelTask(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/tasks/${id}/cancel`, {
      method: "POST",
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to cancel task");
  }

  // ── Agents / Profiles ─────────────────────────────────────────────────────

  async listAgentProfiles(): Promise<AgentProfile[]> {
    const res = await fetch(`${BASE_URL}/v1/agents`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to list agent profiles");
    const data = await res.json();
    return data.agents ?? [];
  }

  async getAgentProfile(id: string): Promise<AgentProfile> {
    const res = await fetch(`${BASE_URL}/v1/agents/${id}`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to get agent profile");
    return res.json();
  }

  async createAgentProfile(profile: {
    name: string;
    profile_type: string;
    system_prompt?: string;
    model_provider: string;
    model_id: string;
    temperature?: number;
    max_tokens?: number;
    skills?: string[];
  }): Promise<AgentProfile> {
    const res = await fetch(`${BASE_URL}/v1/agents`, {
      method: "POST",
      headers: await this.headers(),
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error("Failed to create agent profile");
    return res.json();
  }

  async updateAgentProfile(
    id: string,
    updates: Partial<Omit<AgentProfile, "id" | "tenant_id" | "created_at" | "updated_at">>
  ): Promise<AgentProfile> {
    const res = await fetch(`${BASE_URL}/v1/agents/${id}`, {
      method: "PUT",
      headers: await this.headers(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update agent profile");
    return res.json();
  }

  async deleteAgentProfile(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/agents/${id}`, {
      method: "DELETE",
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to delete agent profile");
  }

  // ── Forge ──────────────────────────────────────────────────────────────────

  async searchForgeSkills(params: {
    q?: string;
    type?: string;
    tag?: string;
    limit?: number;
  }): Promise<ForgeSkill[]> {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.type) query.set("type", params.type);
    if (params.tag) query.set("tag", params.tag);
    if (params.limit) query.set("limit", String(params.limit));
    const res = await fetch(`${BASE_URL}/v1/forge/skills?${query}`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to search forge skills");
    const data = await res.json();
    return data.skills ?? [];
  }

  async getForgeSkill(name: string): Promise<ForgeSkill> {
    const res = await fetch(`${BASE_URL}/v1/forge/skills/${name}`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to get forge skill");
    return res.json();
  }

  // ── Skill Activation ───────────────────────────────────────────────────────

  async listAvailableSkills(): Promise<AvailableSkill[]> {
    const res = await fetch(`${BASE_URL}/v1/skills`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to list available skills");
    const data = await res.json();
    return data.skills ?? [];
  }

  async enableSkill(skillId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/skills/${skillId}/enable`, {
      method: "POST",
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to enable skill");
  }

  async disableSkill(skillId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/skills/${skillId}/enable`, {
      method: "DELETE",
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to disable skill");
  }

  async installSkill(skillId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/admin/skills/${skillId}/install`, {
      method: "POST",
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to install skill");
  }

  async uninstallSkill(skillId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/admin/skills/${skillId}/install`, {
      method: "DELETE",
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to uninstall skill");
  }

  // ── Connections (OAuth provider connect flow) ─────────────────────────────

  async listConnections(): Promise<ConnectionProvider[]> {
    const res = await fetch(`${BASE_URL}/v1/connect`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to list connections");
    const data = await res.json();
    return data.providers ?? [];
  }

  /** Returns the OAuth authorization URL for the provider. The desktop app
   *  should open this in the system browser so the user can consent. */
  async getConnectUrl(provider: string): Promise<string> {
    const res = await fetch(`${BASE_URL}/v1/connect/${provider}?format=json`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to get connect URL");
    const data = await res.json();
    return data.auth_url;
  }

  // ── Credentials ────────────────────────────────────────────────────────────

  async listCredentials(): Promise<ProviderCredential[]> {
    const res = await fetch(`${BASE_URL}/v1/credentials`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to list credentials");
    const data = await res.json();
    return data.providers ?? [];
  }

  async storeCredential(provider: string, token: string, scopes: string[]): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/credentials`, {
      method: "POST",
      headers: await this.headers(),
      body: JSON.stringify({ provider, token, scopes }),
    });
    if (!res.ok) throw new Error("Failed to store credential");
  }

  async deleteCredential(provider: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/credentials/${provider}`, {
      method: "DELETE",
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to delete credential");
  }

  async listCredentialAudit(): Promise<CredentialAuditEntry[]> {
    const res = await fetch(`${BASE_URL}/v1/credentials/audit`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to list credential audit");
    const data = await res.json();
    return data.entries ?? [];
  }

  // ── Memory ─────────────────────────────────────────────────────────────────

  async listMemories(): Promise<Memory[]> {
    const res = await fetch(`${BASE_URL}/v1/memory`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to list memories");
    const data = await res.json();
    return data.memories ?? [];
  }

  async storeMemory(content: string, metadata: Record<string, string>): Promise<Memory> {
    const res = await fetch(`${BASE_URL}/v1/memory`, {
      method: "POST",
      headers: await this.headers(),
      body: JSON.stringify({ content, metadata }),
    });
    if (!res.ok) throw new Error("Failed to store memory");
    return res.json();
  }

  async searchMemories(query: string, limit?: number): Promise<MemorySearchResult[]> {
    const res = await fetch(`${BASE_URL}/v1/memory/search`, {
      method: "POST",
      headers: await this.headers(),
      body: JSON.stringify({ query, limit: limit ?? 10 }),
    });
    if (!res.ok) throw new Error("Failed to search memories");
    const data = await res.json();
    return data.results ?? [];
  }

  async deleteMemory(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/memory/${id}`, {
      method: "DELETE",
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to delete memory");
  }

  // ── Usage ─────────────────────────────────────────────────────────────────

  async getUsageSummary(from?: string, to?: string): Promise<UsageSummary> {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    const res = await fetch(`${BASE_URL}/v1/usage/summary${qs ? `?${qs}` : ""}`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error("Failed to get usage summary");
    return res.json();
  }
}

export interface UsageSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_requests: number;
  by_model?: { provider: string; model: string; input_tokens: number; output_tokens: number; requests: number }[];
  period_start?: string;
  period_end?: string;
}

export const api = new VolundAPI();
