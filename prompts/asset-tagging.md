# Asset tagging prompt

Used later by the Django AI service when calling Gemini. The API key stays on the backend.

## Task

Given only the asset and brand facts below, suggest library metadata.

Return a single JSON object with exactly these keys:

- `tags`: array of 3 to 8 short lowercase strings
- `description`: one short internal sentence
- `usage_suggestion`: one short sentence about where the asset fits

## Rules

- Do not invent facts that are not present in the input.
- Do not claim you downloaded or visually inspected the file unless the input says so.
- If information is missing, keep the suggestion generic and say so in the description.
- No markdown. No extra keys.

## Input

- Asset name:
- Asset type:
- Asset URL:
- Folder name (optional):
- Brand name (optional):
- Primary color (optional):
- Secondary color (optional):
