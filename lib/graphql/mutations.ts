/**
 * Centralized GraphQL mutations
 */

// User mutations
export const UPDATE_USER_DATA = `
  mutation UpdateUserData($id: String!, $data: jsonb!) {
    update_users_by_pk(pk_columns: {id: $id}, _set: {data: $data}) {
      id
      data
    }
  }
`;

export const UPDATE_USER_PII = `
  mutation UpdateUserPII($id: String!, $name: String, $email: String, $image: String, $anon: Boolean!) {
    update_users_by_pk(pk_columns: {id: $id}, _set: {
      name: $name,
      email: $email,
      image: $image,
      anonymous_mode: $anon
    }) {
      id
      name
      email
      image
      anonymous_mode
    }
  }
`;

export const UPDATE_USER_TELEMETRY_AND_ANON = `
  mutation UpdateUserTelemetryAndAnon($id: String!, $consent: Boolean!, $anon: Boolean!) {
    update_users_by_pk(pk_columns: {id: $id}, _set: {
      telemetry_consent: $consent,
      anonymous_mode: $anon
    }) {
      id
    }
  }
`;

export const UPDATE_USER_TELEMETRY = `
  mutation UpdateUserTelemetry($id: String!, $consent: Boolean!) {
    update_users_by_pk(pk_columns: {id: $id}, _set: {telemetry_consent: $consent}) {
      id
    }
  }
`;

export const DELETE_USER_EVERYTHING = `
  mutation DeleteUserEverything($id: String!) {
    delete_telemetry(where: {user_id: {_eq: $id}}) {
      affected_rows
    }
    delete_items(where: {owner_id: {_eq: $id}}) {
      affected_rows
    }
    delete_courses(where: {owner_id: {_eq: $id}}) {
      affected_rows
    }
    delete_users_by_pk(id: $id) {
      id
    }
  }
`;

export const UPDATE_ONBOARD = `
  mutation UpdateOnboard($id: String!, $consent: Boolean!, $anon: Boolean!, $onboarded: Boolean!) {
    update_users_by_pk(
      pk_columns: {id: $id},
      _set: {telemetry_consent: $consent, anonymous_mode: $anon},
      _append: {data: {onboarded: $onboarded}}
    ) {
      id
      telemetry_consent
      anonymous_mode
      data
    }
  }
`;

export const UPSERT_USER = `
  mutation UpsertUser($objects: [users_insert_input!]!) {
    insert_users(
      objects: $objects,
      on_conflict: {
        constraint: users_pkey,
        update_columns: [name, email, image]
      }
    ) {
      returning {
        id
        name
        email
        image
      }
    }
  }
`;

export const UPSERT_USER_BY_EMAIL = `
  mutation UpsertUser($objects: [users_insert_input!]!) {
    insert_users(
      objects: $objects,
      on_conflict: {
        constraint: users_email_key,
        update_columns: [name, image]
      }
    ) {
      returning {
        id
        email
        name
        image
      }
    }
  }
`;

// Course mutations
export const INSERT_COURSES = `
  mutation InsertCourses($data: jsonb, $code: String, $owner_id: String, $term: String) {
    insert_courses(objects: {data: $data, code: $code, owner_id: $owner_id, term: $term}) {
      affected_rows
      returning {
        data
        code
        owner_id
        term
        id
      }
    }
  }
`;

export const DELETE_COURSE_AND_ITEMS = `
  mutation DeleteCourseAndItems($id: uuid!) {
    delete_items(where: {course_id: {_eq: $id}}) {
      affected_rows
    }
    delete_courses_by_pk(id: $id) {
      id
    }
  }
`;

export const UPDATE_COURSE = `
  mutation UpdateCourse($id: uuid!, $_set: courses_set_input!) {
    update_courses_by_pk(pk_columns: {id: $id}, _set: $_set) {
      id
    }
  }
`;

export const UPDATE_COURSE_SECTIONS = `
  mutation UpdateCourseSections($id: uuid!, $sections: jsonb) {
    update_courses_by_pk(pk_columns: {id: $id}, _set: {sections: $sections}) {
      id
      sections
    }
  }
`;

export const UPDATE_COURSE_DATA = `
  mutation UpdateCourseData($id: uuid!, $data: jsonb) {
    update_courses_by_pk(pk_columns: {id: $id}, _set: {data: $data}) {
      id
      data
    }
  }
`;

// Item mutations
export const INSERT_ITEMS = `
  mutation InsertItems($data: jsonb, $owner_id: String, $course_id: uuid) {
    insert_items(objects: {data: $data, owner_id: $owner_id, course_id: $course_id}) {
      affected_rows
      returning {
        data
        owner_id
        last_modified
        course_id
        id
      }
    }
  }
`;

export const DELETE_ITEM = `
  mutation DeleteItem($id: uuid!) {
    delete_items_by_pk(id: $id) {
      id
    }
  }
`;

export const UPDATE_ITEM = `
  mutation UpdateItem($id: uuid!, $data: jsonb) {
    update_items_by_pk(pk_columns: {id: $id}, _set: {data: $data}) {
      id
      data
    }
  }
`;

// Telemetry mutations
export const INSERT_TELEMETRY = `
  mutation InsertTelemetry($objects: [telemetry_insert_input!]!) {
    insert_telemetry(objects: $objects) {
      affected_rows
    }
  }
`;

export const SCRUB_USER = `
  mutation ScrubUser($id: String!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { name: null, image: null, email: null, anonymous_mode: true, telemetry_consent: false }) {
      id
    }
  }
`;

export const DELETE_OLD_TELEMETRY = `
  mutation DeleteOldTelemetry($cutoff: timestamptz!) {
    delete_telemetry(where: { created_at: { _lt: $cutoff } }) {
      affected_rows
    }
  }
`;
