// qup-pulse-admin/src/lib/interests.js

// MIRROR of local-pulse-api/src/lib/interests.js. The API validates against its
// own copy and rejects anything not in it, so an id that drifts out of sync
// here fails on save rather than degrading quietly.
//
// Order matters: the API stores interests in canonical list order via
// sanitiseInterests, so a seeded user and a real user hold the same shape. Any
// "shared interests" comparison is a set intersection, which only works if both
// sides are normalised the same way.
//
// If you change either file, change both. Copy the array verbatim from the API.

export const INTERESTS = [
  "art",
  "baking",
  "books",
  "climbing",
  "coffee",
  "concerts",
  "cooking",
  "cycling",
  "dancing",
  "design",
  "fitness",
  "food",
  "football",
  "gaming",
  "hiking",
  "movies",
  "music",
  "nature",
  "photography",
  "running",
  "technology",
  "travel",
  "yoga",
];

// Matches the slice in profileController.updateProfile: user.interests =
// (interests || []).slice(0, 8). Anything past this is dropped server-side
// without an error, so the picker has to enforce the same number.
export const MAX_INTERESTS = 8;

// Ids are lowercase slugs. The profile view renders them raw, so this matches
// that rather than introducing a second, prettier presentation of the same data.
export function interestLabel(id) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}
