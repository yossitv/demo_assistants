import { Agent } from '@/types';

const AGENTS_STORAGE_KEY = 'assistants_agents';
const RECENT_AGENTS_KEY = 'assistants_recent_agents';

/**
 * Retrieve all agents from localStorage
 * @returns Array of Agent objects
 */
export function getAgents(): Agent[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const agentsJson = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!agentsJson) {
      return [];
    }

    const agents = JSON.parse(agentsJson);
    // Convert date strings back to Date objects
    return agents.map((agent: any) => ({
      ...agent,
      createdAt: new Date(agent.createdAt),
    }));
  } catch (error) {
    console.error('Error retrieving agents from localStorage:', error);
    return [];
  }
}

/**
 * Save an agent to localStorage
 * @param agent - The agent to save
 */
export function saveAgent(agent: Agent): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const agents = getAgents();

    // Check if agent already exists and update it, otherwise add new
    const existingIndex = agents.findIndex((a) => a.id === agent.id);
    if (existingIndex !== -1) {
      agents[existingIndex] = agent;
    } else {
      agents.push(agent);
    }

    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));

    // Update recent agents list
    updateRecentAgents(agent.id);
  } catch (error) {
    console.error('Error saving agent to localStorage:', error);
  }
}

/**
 * Get recently used agents
 * @param limit - Maximum number of recent agents to return
 * @returns Array of recently used Agent objects
 */
export function getRecentAgents(limit: number = 5): Agent[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const recentIdsJson = localStorage.getItem(RECENT_AGENTS_KEY);
    if (!recentIdsJson) {
      return [];
    }

    const recentIds: string[] = JSON.parse(recentIdsJson);
    const agents = getAgents();

    // Map IDs to agents and filter out any that no longer exist
    const recentAgents = recentIds
      .map((id) => agents.find((agent) => agent.id === id))
      .filter((agent): agent is Agent => agent !== undefined)
      .slice(0, limit);

    return recentAgents;
  } catch (error) {
    console.error('Error retrieving recent agents from localStorage:', error);
    return [];
  }
}

/**
 * Update the recent agents list with a new agent ID
 * @param agentId - The ID of the agent to add to recent list
 */
function updateRecentAgents(agentId: string): void {
  try {
    const recentIdsJson = localStorage.getItem(RECENT_AGENTS_KEY);
    let recentIds: string[] = recentIdsJson ? JSON.parse(recentIdsJson) : [];

    // Remove the ID if it already exists
    recentIds = recentIds.filter((id) => id !== agentId);

    // Add the ID to the beginning of the array
    recentIds.unshift(agentId);

    // Keep only the most recent 10
    recentIds = recentIds.slice(0, 10);

    localStorage.setItem(RECENT_AGENTS_KEY, JSON.stringify(recentIds));
  } catch (error) {
    console.error('Error updating recent agents:', error);
  }
}

/**
 * Clear all agents from localStorage
 */
export function clearAgents(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(AGENTS_STORAGE_KEY);
    localStorage.removeItem(RECENT_AGENTS_KEY);
  } catch (error) {
    console.error('Error clearing agents from localStorage:', error);
  }
}
