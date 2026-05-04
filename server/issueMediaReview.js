const MAX_ISSUE_MEDIA_ITEMS = 10;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const SUPPORTED_MEDIA_TYPES = /^(image|video)\//;
const DATA_URL_PATTERN = /^data:([^;,]+);base64,(.+)$/;

export function normalizeIssueMediaAttachments(input = []) {
  const items = Array.isArray(input) ? input : [];
  if (items.length > MAX_ISSUE_MEDIA_ITEMS) {
    throw new Error(`Attach up to ${MAX_ISSUE_MEDIA_ITEMS} images or videos per issue.`);
  }
  return items.map((item, index) => normalizeMediaItem(item, index));
}

export async function reviewIssueMedia({ order, mediaItems = [], provider = process.env.ISSUE_MEDIA_AI_PROVIDER || "anthropic" } = {}) {
  if (!mediaItems.length) return null;
  const normalizedProvider = String(provider || "anthropic").toLowerCase();
  if (normalizedProvider !== "anthropic") {
    return buildSkippedReview({ provider: normalizedProvider, reason: "Provider adapter is not configured yet.", mediaItems });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildSkippedReview({ provider: "anthropic", reason: "ANTHROPIC_API_KEY is not configured.", mediaItems });
  }
  return reviewWithAnthropic({ order, mediaItems });
}

function normalizeMediaItem(item = {}, index) {
  const contentType = String(item.contentType || item.type || "").trim().toLowerCase();
  if (!SUPPORTED_MEDIA_TYPES.test(contentType)) {
    throw new Error("Only image and video files can be attached to an issue.");
  }
  const dataUrl = String(item.dataUrl || item.url || "").trim();
  const size = Number(item.size || byteSizeFromDataUrl(dataUrl) || 0);
  if (size > MAX_MEDIA_BYTES) {
    throw new Error("Each issue image or video must be 5 MB or smaller.");
  }
  return {
    id: item.id || `media-${Date.now()}-${index + 1}`,
    name: String(item.name || `attachment-${index + 1}`).slice(0, 120),
    contentType,
    kind: contentType.startsWith("video/") ? "video" : "image",
    size,
    url: dataUrl,
    receivedAt: item.receivedAt || new Date().toISOString()
  };
}

async function reviewWithAnthropic({ order, mediaItems }) {
  const imageItems = mediaItems.filter((item) => item.kind === "image" && DATA_URL_PATTERN.test(item.url));
  const videoItems = mediaItems.filter((item) => item.kind === "video");
  if (!imageItems.length) {
    return buildSkippedReview({ provider: "anthropic", reason: "Only video attachments were provided; video frame review is not enabled yet.", mediaItems });
  }
  const content = [
    {
      type: "text",
      text: [
        "You are helping a property manager triage a tenant maintenance issue from photos/videos.",
        "Use visual evidence only as extra perspective; do not claim certainty beyond what is visible.",
        "Return concise JSON with keys: summary, observedConditions, likelyTrade, urgencySignals, suggestedFollowUps, safetyNotes, vendorPrep.",
        `Issue: ${order?.issue || ""}`,
        `Property/unit: ${order?.unit || "Unknown unit"}`,
        `Existing triage: ${order?.severity || "Unknown"} ${order?.trade || "General"}`,
        videoItems.length ? `Videos attached but not visually decoded by this adapter yet: ${videoItems.map((item) => item.name).join(", ")}` : ""
      ].filter(Boolean).join("\n")
    },
    ...imageItems.map((item) => {
      const [, mediaType, data] = item.url.match(DATA_URL_PATTERN);
      return { type: "image", source: { type: "base64", media_type: mediaType, data } };
    })
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MEDIA_REVIEW_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: 700,
      temperature: 0.2,
      messages: [{ role: "user", content }]
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Anthropic media review failed: ${response.status}`);
  const text = data.content?.map((part) => part.text || "").join("\n").trim() || "";
  return {
    provider: "anthropic",
    status: "reviewed",
    reviewedAt: new Date().toISOString(),
    mediaCount: mediaItems.length,
    imageCount: imageItems.length,
    videoCount: videoItems.length,
    model: data.model || process.env.ANTHROPIC_MEDIA_REVIEW_MODEL || "claude-3-5-sonnet-20241022",
    rawSummary: text,
    insights: parseJsonObject(text)
  };
}

function buildSkippedReview({ provider, reason, mediaItems }) {
  return {
    provider,
    status: "skipped",
    reason,
    reviewedAt: new Date().toISOString(),
    mediaCount: mediaItems.length,
    imageCount: mediaItems.filter((item) => item.kind === "image").length,
    videoCount: mediaItems.filter((item) => item.kind === "video").length
  };
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function byteSizeFromDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(DATA_URL_PATTERN);
  if (!match) return 0;
  return Math.floor((match[2].length * 3) / 4);
}
