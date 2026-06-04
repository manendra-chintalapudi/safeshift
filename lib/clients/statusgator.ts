// ============================================================================
// Platform Status Client — Mock for Porter platform outage detection
// In production: would use StatusGator or direct health-check
// ============================================================================

export interface PlatformStatus {
  platform: string;
  status: 'up' | 'degraded' | 'down';
  downtime_hours: number;
  last_checked: string;
  source: 'mock';
}

// In-memory mock state (can be toggled via admin demo panel)
let mockPorterStatus: PlatformStatus = {
  platform: 'porter',
  status: 'up',
  downtime_hours: 0,
  last_checked: new Date().toISOString(),
  source: 'mock',
};

/**
 * Get Porter platform status
 */
export async function getPlatformStatus(): Promise<PlatformStatus> {
  // Update the last_checked timestamp
  mockPorterStatus.last_checked = new Date().toISOString();
  return { ...mockPorterStatus };
}

/**
 * Set mock platform status (used by admin demo panel)
 */
export function setMockPlatformStatus(status: 'up' | 'degraded' | 'down', downtimeHours: number) {
  mockPorterStatus = {
    platform: 'porter',
    status,
    downtime_hours: downtimeHours,
    last_checked: new Date().toISOString(),
    source: 'mock',
  };
}
