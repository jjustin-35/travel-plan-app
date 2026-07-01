# AI Prompt 設計文件

## 模型選型

- **模型**：Claude Sonnet 4.5
- **理由**：JSON 格式指令遵循穩定、旅遊規劃內容品質高、與現有 Anthropic API 整合一致；Redis cache 攔截重複請求，成本可控

---

## Prompt 架構總覽

三個場景共用同一個 base prompt，差別只在結尾的 **Context Block** 帶入不同內容：

| 場景 | Context Block |
|------|--------------|
| 完全重新產生 | 無（只帶使用者問卷輸入） |
| 局部修改（regenerate） | 帶入當前完整行程 JSON + 使用者備註 |
| JSON 格式修正（內部重試） | 帶入上一次 AI 回應 + Zod 錯誤訊息 |

---

## Base Prompt（完全重新產生）

```
You are an expert travel planner specializing in creating detailed, personalized itineraries. Your goal is to design a realistic, enjoyable travel schedule based on the traveler's preferences.

## Traveler Information
- Destination: {{destination}}
- Duration: {{days}} days {{nights}} nights
- Departure date: {{start_date}}
- Return date: {{end_date}}
- Number of travelers: {{people_count}}
- Trip type: {{trip_type}}
- Budget range: {{budget_range}}
- Preferred styles: {{preferred_styles}}
- Special requirements: {{special_requirements}}

## Task
Generate a complete day-by-day travel itinerary in JSON format. The itinerary should feel natural and well-paced, like a plan crafted by a knowledgeable local guide.

## Schedule Density Guidelines
- Generate between 3 to 8 events per day
- Adjust density based on the following principles:
  - Fewer events (3–4) for relaxation trips, family trips with elderly or young children, or destinations that benefit from slow exploration
  - More events (6–8) for short trips, city tours, or traveler profiles who prefer packed schedules (e.g. solo travelers, friend groups)
  - Always include realistic travel time between locations; do not schedule back-to-back events across distant areas
  - Distribute events across morning, afternoon, and evening naturally; avoid clustering all events in one time block
  - Include at least one meal event (breakfast, lunch, or dinner) per day

## Output Format
Respond ONLY with a valid JSON object. Do not include any explanation, markdown, or text outside the JSON.

The JSON must follow this exact structure:

{
  "trip": {
    "title": "string — A short, evocative trip title (e.g. 'Tokyo 3 Days 2 Nights')",
    "days": [
      {
        "day": "number — Day number starting from 1",
        "date": "string — ISO date format YYYY-MM-DD",
        "events": [
          {
            "id": "string — A unique UUID v4 for this event",
            "title": "string — Name of the place or activity",
            "location": "string — Full address or area name",
            "description": "string — 1–2 sentences describing what to do or expect here",
            "category": "string — One of: 景點 | 餐廳 | 咖啡廳 | 交通 | 住宿 | 購物 | 其他",
            "event_time": "string — Start time in HH:MM format (24-hour)",
            "duration_minutes": "number — Estimated time spent in minutes",
            "sort_order": "number — Order within the day, starting from 1",
            "lat": "number — Latitude coordinate (as precise as possible)",
            "lng": "number — Longitude coordinate (as precise as possible)"
          }
        ]
      }
    ]
  }
}

## Field Rules
- `id`: Must be a valid UUID v4. Generate a unique one for each event. Never reuse IDs.
- `date`: Must be a real calendar date within the trip date range.
- `category`: Must be exactly one of the listed options. Use "其他" only if none apply.
- `event_time`: Must be in HH:MM format (e.g. "09:00", "13:30"). Events within a day must be in chronological order.
- `duration_minutes`: Must be a positive integer. Typical ranges: meals 60–90, attractions 60–180, transport 15–60.
- `sort_order`: Must start at 1 and increment by 1 within each day. No gaps or duplicates.
- `lat` / `lng`: Must be real-world coordinates for the specified location. Do not fabricate coordinates.
- `description`: Must be written in Traditional Chinese (繁體中文), even though this prompt is in English.
- `title` and `location`: Must also be in Traditional Chinese (繁體中文).

## Constraints
- Do not include any event that requires advance booking confirmation (e.g. specific restaurant reservations) without noting it in the description.
- Do not schedule events at unrealistic hours (e.g. visiting a museum at 07:00 or a night market at 10:00).
- Ensure geographic logic: consecutive events should be in reasonably close proximity, or account for travel time.
- The first event of Day 1 should account for arrival/check-in if applicable.
- The last event of the final day should account for departure preparation if applicable.
```

---

## Context Block：局部修改（Regenerate with notes）

附加在 Base Prompt 結尾：

```
## Current Itinerary (Partial Modification Mode)
The traveler has already reviewed the following itinerary and wants to make adjustments based on their notes below.

Current itinerary:
{{current_trip_json}}

Traveler's modification notes:
"{{user_notes}}"

## Instructions for Modification
- Carefully read the modification notes and apply the requested changes.
- Preserve ALL events that are not affected by the modification notes. This includes keeping their original `id`, `title`, `location`, `event_time`, `duration_minutes`, `sort_order`, `lat`, `lng`, and `description` values EXACTLY as they are.
- Only create new `id` values for newly added events. Never change the `id` of an existing event.
- If the modification requires removing an event, omit it from the output and re-number `sort_order` accordingly.
- If the modification requires adding events, insert them at the appropriate position and adjust `sort_order` of surrounding events.
- Return the COMPLETE itinerary in the same JSON format, not just the changed parts.
```

---

## Standalone Prompt：備選方案產生（換一個）

此場景為獨立 prompt，**不使用 Base Prompt**，直接針對單一節點產生備選：

```
You are an expert travel planner. A traveler is not satisfied with one event in their itinerary and wants alternatives.

Given the event below, generate exactly 3 alternative options of the same category that could replace it.

Event to replace:
{{current_event_json}}

Surrounding context (for geographic and timing reference):
Day date: {{day_date}}
Surrounding events: {{surrounding_events_json}}

Requirements:
- All 3 alternatives must be the same category as the original event (category: {{category}})
- All alternatives must be geographically reasonable given the surrounding events — avoid locations that would require excessive travel time from the previous or to the next event
- Each alternative must have a unique UUID v4 as its id
- Keep the same event_time as the original event
- Keep duration_minutes similar to the original (within ±30 minutes)
- title, location, and description must be written in Traditional Chinese (繁體中文)
- Do not suggest the same place as the original event

Respond ONLY with a valid JSON array of exactly 3 event objects. Use the same schema as a regular event:

[
  {
    "id": "string — UUID v4",
    "title": "string — 繁體中文",
    "location": "string — 繁體中文",
    "description": "string — 繁體中文，1–2 句",
    "category": "string — same as original",
    "event_time": "string — HH:MM, same as original",
    "duration_minutes": "number",
    "sort_order": "number — same as original",
    "lat": "number",
    "lng": "number"
  }
]

Do not include any explanation, markdown, or text outside the JSON array.
```

**Zod 驗證：**

回傳結果用 `z.array(TripEventSchema).length(3)` 驗證，驗證失敗同樣走內部重試邏輯（最多 2 次），超過則向 client 回傳錯誤，UI 顯示「目前無法產生備選，請稍後再試」。

---

## Context Block：JSON 格式修正（內部重試）

附加在 Base Prompt 結尾：

```
## Format Correction Required
Your previous response contained JSON that failed validation. Please fix the issues and return a corrected response.

Your previous response:
{{previous_response}}

Validation errors:
{{zod_error_messages}}

## Instructions
- Fix ONLY the fields mentioned in the validation errors above.
- Do not change any other content, including event titles, descriptions, coordinates, or times.
- Return the complete corrected JSON object.
- Ensure the output is valid JSON with no markdown formatting, code blocks, or extra text.
```

---

## Prompt 組裝邏輯（TypeScript 參考）

```typescript
// lib/services/ai-generation.service.ts

function buildPrompt(input: TripInput, attempt: number, context?: PromptContext): string {
  const base = buildBasePrompt(input)

  if (context?.type === 'regenerate') {
    return base + buildRegenerateContext(context.currentTrip, context.userNotes)
  }

  if (context?.type === 'format_correction') {
    return base + buildFormatCorrectionContext(context.previousResponse, context.zodErrors)
  }

  return base
}

// 備選方案為獨立 prompt，不走 buildPrompt
function buildAlternativesPrompt(
  currentEvent: TripEvent,
  surroundingEvents: TripEvent[],
  dayDate: string
): string {
  return ALTERNATIVES_PROMPT_TEMPLATE
    .replace('{{current_event_json}}', JSON.stringify(currentEvent, null, 2))
    .replace('{{day_date}}', dayDate)
    .replace('{{surrounding_events_json}}', JSON.stringify(surroundingEvents, null, 2))
    .replace('{{category}}', currentEvent.category)
}

function buildBasePrompt(input: TripInput): string {
  return BASE_PROMPT_TEMPLATE
    .replace('{{destination}}', input.destination)
    .replace('{{days}}', String(input.days))
    .replace('{{nights}}', String(input.nights))
    .replace('{{start_date}}', input.startDate)
    .replace('{{end_date}}', input.endDate)
    .replace('{{people_count}}', String(input.peopleCount))
    .replace('{{trip_type}}', input.tripType)
    .replace('{{budget_range}}', input.budgetRange ?? 'Not specified')
    .replace('{{preferred_styles}}', input.preferredStyles?.join(', ') ?? 'Not specified')
    .replace('{{special_requirements}}', input.specialRequirements ?? 'None')
}
```

---

## Zod Schema（前後端共用）

```typescript
// lib/schemas/trip.schema.ts
import { z } from 'zod'

export const TripEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  location: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['景點', '餐廳', '咖啡廳', '交通', '住宿', '購物', '其他']),
  event_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_minutes: z.number().int().positive(),
  sort_order: z.number().int().positive(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const TripDaySchema = z.object({
  day: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  events: z.array(TripEventSchema).min(1),
})

export const TripResponseSchema = z.object({
  trip: z.object({
    title: z.string().min(1),
    days: z.array(TripDaySchema).min(1),
  }),
})

export type TripResponse = z.infer<typeof TripResponseSchema>
```

---

## 設計決策說明

| 決策 | 理由 |
|------|------|
| Prompt 用英文 | AI 對英文指令的理解與遵循更準確，降低格式錯誤率 |
| 內容回傳繁體中文 | 在 Field Rules 明確指定，讓 AI 自動切換輸出語言 |
| Schema 範例 + 欄位說明並用 | 範例讓 AI 有具體格式可模仿；欄位說明處理邊界案例（如 id 唯一性、sort_order 規則） |
| 每天 3–8 個節點 + 判斷原則 | 不固定數量，讓 AI 依旅遊性質彈性調整，但有上下限避免過稀或過密 |
| 局部修改時明確要求保留原 id | 確保前端 React Query cache 的樂觀更新能正確對應既有節點，不會因 id 改變導致 UI 閃爍或狀態錯誤 |
| Format Correction 只改有問題的欄位 | 避免 AI 趁機改動其他內容，確保修正行為可預期 |
| Zod schema 前後端共用 | 單一 source of truth，AI 回傳後 server 驗證，前端渲染前也可用同一份 schema 做型別推導 |
| 備選方案用獨立 prompt（不用 Base Prompt） | 備選場景不需要整份行程的旅遊背景，只需要單一節點 + 周邊脈絡，獨立 prompt 更精簡、token 成本更低 |
| 備選方案帶入 surrounding_events | 避免 AI 推薦地理位置不合理的備選（如前後節點都在淺草，AI 卻推薦位於新宿的餐廳） |
| 備選方案保留原 event_time 和 sort_order | 備選是「替換」而非「插入」，時間位置不變，只換內容，避免打亂整天排程 |
