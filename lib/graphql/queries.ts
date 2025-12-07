/**
 * Centralized GraphQL queries
 */

// User queries
export const GET_USER = `
  query GetUser($id: String!) {
    users_by_pk(id: $id) {
      id
      name
      email
      image
      telemetry_consent
      anonymous_mode
    }
  }
`;

export const GET_USER_FULL = `
  query GetUserFull($id: String!) {
    users_by_pk(id: $id) {
      id
      name
      email
      image
      telemetry_consent
      anonymous_mode
      onboarded
      data
    }
  }
`;

// Course queries
export const GET_COURSES = `
  query GetCourses($owner_id: String!) {
    courses(where: {owner_id: {_eq: $owner_id}}) {
      id
      code
      term
      data
      sections
      credits
    }
  }
`;

// Item queries
export const GET_ITEMS = `
  query GetItems($owner_id: String!) {
    items(where: {owner_id: {_eq: $owner_id}}) {
      id
      course_id
      owner_id
      data
      last_modified
    }
  }
`;

// Telemetry queries
export const GET_TELEMETRY_DAU = `
  query GetTelemetryDau {
    telemetry_dau {
      dau
      day
    }
  }
`;

export const GET_TELEMETRY_FEATURE_USAGE_30D = `
  query GetTelemetryFeatureUsage30d {
    telemetry_feature_usage_30d {
      event_count_30d
      unique_users_30d
      event
    }
  }
`;

export const GET_TELEMETRY_FEATURE_USAGE_DAILY = `
  query GetTelemetryFeatureUsageDaily {
    telemetry_feature_usage_daily {
      event_count
      unique_users
      day
      event
    }
  }
`;

export const GET_TELEMETRY_MAU_30D = `
  query GetTelemetryMau30d {
    telemetry_mau_30d {
      mau_30d
    }
  }
`;

export const LAST_TELEMETRY = `
  query LastTelemetry($anon: String!, $event: String!, $since: timestamptz!) {
    telemetry(
      where: {
        anon_user_hash: {_eq: $anon},
        event: {_eq: $event},
        created_at: {_gte: $since}
      },
      limit: 1,
      order_by: {created_at: desc}
    ) {
      id
    }
  }
`;
