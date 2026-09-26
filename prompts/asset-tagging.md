# Asset tagging prompt

Used by the Django AI service when calling Gemini. The API key stays on the backend. Nothing is saved until the user accepts the suggestion.

## Task

Given only the asset and brand facts below, suggest library metadata.

Return a single JSON object with exactly these keys:

- `tags`: array of 3 to 8 short lowercase strings
- `description`: one short internal sentence
- `usage_suggestion`: one short sentence about where the asset fits

## Rules

- Do not invent facts that are not present in the input.
- Do not claim you downloaded or visually inspected the file unless the input says so.
- Do not describe colors, objects, or file contents you were not given.
- Tags are search words a teammate would type. Use words from the name, folder, and brand. Do not add tags that only repeat the asset type or the words "asset", "file", or "image".
- The description is one sentence about what this record is for. Do not apologize, and do not mention visual inspection or missing file contents.
- The usage suggestion names one likely placement based on the asset type and name, such as a header, a social post, or a document cover. Do not list every possible channel.
- No markdown. No extra keys.

## Input

- Asset name:
- Asset type:
- Asset URL:
- Folder name (optional):
- Brand name (optional):
- Primary color (optional):
- Secondary color (optional):
