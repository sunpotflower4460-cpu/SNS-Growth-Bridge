export const PACKAGE_NAME = '@sns-growth-bridge/adapters-my-sns' as const;

export const PACKAGE_PHASE = 5 as const;

export const MY_SNS_AUDIT_SHA = 'cafde5995b80e9054fb4780a10e02db9c3c033ff' as const;

/** My-SNS has no durable metric snapshots. Do not invent MetricSnapshot here. */
export const MY_SNS_METRIC_SNAPSHOT_STATUS = 'blocked' as const;
