import { event, message, saveState } from "./data.js";
import { tenantPresenceLikelyRelevant } from "./vendorWorkflow.js";

const ESCALATION_WORDS = [
  "still",
  "not fixed",
  "didn't work",
  "didnt work",
  "can't",
  "cannot",
  "send someone",
  "vendor",
  "repair person",
  "manager",
  "help",
  "worse",
  "emergency"
];

const FIXED_WORDS = ["fixed", "resolved", "done", "works now", "stopped", "all good"];
const NEGATED_FIXED_WORDS = ["not fixed", "not resolved", "not done", "still broken", "still leaking", "still drips", "still dripping", "didn't fix", "didnt fix"];

export function buildInitialGuidance({ order, tenant, mediaItems = [] }) {
  const guidance = guidanceForOrder(order);
  const mediaLine = mediaItems.length ? "I got the photo/video too. " : "";
  const availabilityLine = tenantPresenceLikelyRelevant(order)
    ? "\n\nIf a repair person needs to come inside or you need to be present, reply AVAILABLE with windows that work, like AVAILABLE tomorrow 7-10 AM, plus any entry notes."
    : "";
  return `${mediaLine}Thanks ${tenant.name.split(" ")[0]}. I opened ${order.id} for Unit ${order.unit}. Before we contact vendors, try this safely:\n\n${guidance.steps.join("\n")}${availabilityLine}\n\nReply DONE if fixed, STILL if it did not work, or send a photo/video and I will keep guiding. ${guidance.safety}`;
}

export function handleTenantTroubleshootingReply({ order, tenant, body, mediaItems = [] }) {
  const lower = body.toLowerCase();
  order.messages.push(message("tenant", body || "[media]"));
  if (mediaItems.length) {
    order.media = [...(order.media || []), ...mediaItems];
    order.timeline.push(event("Tenant sent media", `${mediaItems.length} file(s) added to ${order.id}.`));
  }

  if (isFixed(lower)) {
    order.status = "Tenant resolved";
    order.timeline.push(event("Tenant resolved issue", `${tenant.name} marked ${order.id} resolved after guidance.`));
    order.messages.push(message("relay", `${order.id} marked resolved. Reply if it comes back.`));
    saveState();
    return {
      response: `Great, I marked ${order.id} resolved. If it comes back, text this number again and I will reopen the thread.`,
      actions: []
    };
  }

  if (shouldEscalate(lower, mediaItems)) {
    order.status = "Manager review";
    order.timeline.push(event("Troubleshooting escalated", `${tenant.name} reported the issue still needs help.`));
    const availabilityLine = tenantPresenceLikelyRelevant(order) && order.tenantAvailability?.needsFollowUp
      ? " If a repair person needs to come inside or you need to be present, reply AVAILABLE with windows that work."
      : "";
    order.messages.push(message("relay", `${mediaItems.length ? "I got the photo/video. " : ""}Thanks. I am escalating ${order.id} to the manager now with your latest update. They will review before vendor outreach.${availabilityLine}`));
    saveState();
    return {
      response: `${mediaItems.length ? "I got the photo/video. " : ""}Thanks. I am escalating ${order.id} to the manager now with your latest update. They will review before vendor outreach.${availabilityLine}`,
      escalate: true
    };
  }

  const guidance = nextGuidanceForOrder(order, body, mediaItems);
  order.timeline.push(event("AI troubleshooting follow-up", guidance.summary));
  order.messages.push(message("relay", guidance.response));
  saveState();
  return { response: guidance.response, actions: [] };
}

export function needsImmediateManagerNotice(order) {
  const body = order.issue.toLowerCase();
  return order.severity === "Urgent" && ["gas", "spark", "smoke", "flood", "active water", "no lock"].some((word) => body.includes(word));
}

function guidanceForOrder(order) {
  const body = order.issue.toLowerCase();
  const specificGuidance = guidanceForSpecificIssue(body);
  if (specificGuidance) return specificGuidance;

  if (order.trade === "Plumbing") {
    if (body.includes("shower") || body.includes("tub")) {
      return {
        steps: [
          "1. Turn the handle fully off and do not force it past its normal stop.",
          "2. If dripping continues, put a towel down and note whether it is from the shower head, tub spout, or handle.",
          "3. Send a close-up photo of the handle/spout and tell me if there is a separate shutoff panel nearby."
        ],
        safety: "If water is actively running and will not stop, reply STILL."
      };
    }
    if (body.includes("toilet")) {
      return {
        steps: [
          "1. Stop using that toilet for now.",
          "2. If water is rising, turn the small valve behind the toilet clockwise until closed.",
          "3. Put towels down and send a photo of the base/tank/valve."
        ],
        safety: "If water is actively flooding, reply STILL and the manager will be alerted."
      };
    }
    return {
      steps: [
        "1. If water is active, turn the small shutoff valve under the sink clockwise.",
        "2. Put a bowl/towel under the leak and avoid using that fixture.",
        "3. Send a close-up photo of where water is coming from plus a wider photo under the sink."
      ],
      safety: "If the shutoff does not stop water, reply STILL."
    };
  }
  if (order.trade === "HVAC") {
    return {
      steps: [
        "1. Check whether the thermostat is on, set correctly, and has fresh batteries if it uses them.",
        "2. Check if the breaker is tripped; only reset it once if safe.",
        "3. Send a photo of the thermostat screen and any error code."
      ],
      safety: "If you smell gas or burning, leave the area and call emergency services first."
    };
  }
  if (order.trade === "Electrical") {
    return {
      steps: [
        "1. Stop using the outlet/switch/device involved.",
        "2. If there was a spark, smoke, heat, or burning smell, do not reset anything.",
        "3. Send a photo from a safe distance and tell me if power is out in one room or the whole unit."
      ],
      safety: "If there is smoke, fire, or active sparking, call emergency services first and reply STILL."
    };
  }
  return {
    steps: [
      "1. Send one close-up photo and one wider photo of the issue.",
      "2. Tell me when it started and whether it is getting worse.",
      "3. If there is a simple reset or switch involved, try it once only if safe."
    ],
    safety: "If it feels unsafe or is getting worse, reply STILL."
  };
}

function guidanceForSpecificIssue(body) {
  const includesAny = (words) => words.some((word) => body.includes(word));
  if (includesAny(["rail", "railing", "handrail", "banister", "stair", "step", "deck", "balcony"])) {
    return {
      steps: [
        "1. Avoid leaning on it or using that stair/deck edge until it is checked.",
        "2. Send one wide photo showing the full rail and one close photo of the loose bracket, post, fasteners, or cracked area.",
        "3. Tell me whether it wiggles, is detached, sharp, rusted, or blocking a normal entry path."
      ],
      safety: "If it affects safe entry, stairs, a balcony, or a fall risk, reply STILL."
    };
  }
  if (includesAny(["door", "lock", "latch", "handle", "knob", "deadbolt", "key", "window", "screen", "gate"])) {
    return {
      steps: [
        "1. Do not force the handle, lock, window, or latch if it feels stuck.",
        "2. Send a close photo of the hardware and a wider photo showing which door, window, gate, or entry it is.",
        "3. Tell me whether it will not open, will not close, will not latch, feels loose, or affects exterior security."
      ],
      safety: "If an exterior door, gate, or window cannot secure, reply STILL."
    };
  }
  if (includesAny(["fridge", "refrigerator", "freezer", "dishwasher", "washer", "dryer", "oven", "stove", "range", "microwave", "appliance"])) {
    return {
      steps: [
        "1. Tell me whether it has no power, is leaking, making noise, showing an error, or not heating/cooling.",
        "2. Send a photo of the appliance front plus the model/serial label if you can find it safely.",
        "3. Try one normal power or cycle reset only if there is no smell, smoke, leak, or heat concern."
      ],
      safety: "If there is smoke, burning smell, gas smell, or active leaking, reply STILL."
    };
  }
  if (includesAny(["garage", "opener", "remote", "keypad", "parking gate"])) {
    return {
      steps: [
        "1. Try a second remote/keypad code only if you already have one.",
        "2. Send a photo of the door/gate position and any blinking light or error on the opener.",
        "3. Tell me whether the motor runs, clicks, is silent, reverses, or the door/gate is physically stuck."
      ],
      safety: "If your vehicle or home access is blocked, reply STILL."
    };
  }
  if (includesAny(["cabinet", "drawer", "closet", "shelf", "hinge", "track", "sliding"])) {
    return {
      steps: [
        "1. Avoid forcing the drawer, cabinet, closet, or sliding panel if it is binding.",
        "2. Send a wide photo of the fixture and a close photo of the hinge, track, roller, screw, or cracked piece.",
        "3. Tell me whether it is loose, detached, scraping, off track, or unable to close."
      ],
      safety: "If anything is falling, sharp, or blocking access, reply STILL."
    };
  }
  if (includesAny(["ceiling", "wall", "drywall", "paint", "stain", "mold", "mildew", "moisture", "soft spot"])) {
    return {
      steps: [
        "1. Do not touch soft drywall, peeling paint, or suspected mold.",
        "2. Send a wide photo for room location and a close photo with a common object nearby for scale.",
        "3. Tell me whether it is wet now, spreading, musty, after rain, near plumbing, or below another unit."
      ],
      safety: "If water is active, the ceiling is sagging, or the area feels unsafe, reply STILL."
    };
  }
  if (includesAny(["smoke detector", "carbon monoxide", "co detector", "alarm", "chirp", "beeping"])) {
    return {
      steps: [
        "1. If there is smoke, fire, gas smell, or carbon monoxide concern, leave and call emergency services first.",
        "2. Tell me whether it is a single chirp, repeated alarm, low-battery alert, or no power.",
        "3. Send a photo of the detector location and brand/model if reachable without climbing unsafely."
      ],
      safety: "If this is an active alarm or you are unsure, reply STILL after getting to a safe place."
    };
  }
  if (includesAny(["pest", "bug", "bugs", "ant", "ants", "roach", "roaches", "mouse", "mice", "rat", "rats"])) {
    return {
      steps: [
        "1. Take a photo only if you can do it safely and without disturbing nests or droppings.",
        "2. Tell me the room, where you saw activity, and whether it is a one-time sighting or recurring.",
        "3. Note any entry points, food/water source nearby, or neighboring unit/common-area pattern."
      ],
      safety: "If there is a bite, aggressive activity, or contamination concern, reply STILL."
    };
  }
  return null;
}

function nextGuidanceForOrder(order, body, mediaItems) {
  const gotMedia = mediaItems.length ? "I got the photo/video. " : "";
  const lower = body.toLowerCase();
  if (order.trade === "Plumbing") {
    const originalIssue = order.issue.toLowerCase();
    if (originalIssue.includes("shower") || originalIssue.includes("tub") || lower.includes("shower") || lower.includes("tub")) {
      if (lower.includes("shower head") || lower.includes("tub spout") || lower.includes("handle")) {
        return {
          summary: "Confirmed shower/tub drip source.",
          response: `${gotMedia}Got it. Make sure the handle is fully off without forcing it. If it still drips after 5 minutes, reply STILL and I will escalate to the manager; if it stopped, reply DONE.`
        };
      }
      return {
        summary: "Asked tenant for shower/tub drip source.",
        response: `${gotMedia}Is the drip coming from the shower head, tub spout, or handle? Reply DONE if it stopped, or STILL if it continues after the handle is fully off.`
      };
    }
    if (lower.includes("valve") || lower.includes("turned")) {
      return {
        summary: "Asked tenant to confirm whether shutoff stopped water.",
        response: `${gotMedia}Did the shutoff stop the water? Reply DONE if dry now, or STILL if water is continuing. If possible, send a photo of the valve position.`
      };
    }
    return {
      summary: "Asked tenant for leak source and shutoff status.",
      response: `${gotMedia}Can you tell where the water starts: pipe joint, faucet base, drain, garbage disposal, or unknown? Also, did you try the shutoff valve?`
    };
  }
  if (order.trade === "HVAC") {
    return {
      summary: "Asked tenant for thermostat/breaker result.",
      response: `${gotMedia}What does the thermostat show now, and did the breaker look tripped? Reply STILL if nothing changed and I will escalate to the manager.`
    };
  }
  if (order.trade === "Electrical") {
    return {
      summary: "Asked tenant for outage/safety details.",
      response: `${gotMedia}Please do not use that outlet. Is power out only in that room, and is there any warmth, smoke, or burning smell? Reply STILL if yes or if you are unsure.`
    };
  }
  return {
    summary: "Asked tenant for additional detail.",
    response: `${gotMedia}Thanks. One more detail: is it getting worse, and is there anything unsafe about it? Reply DONE if resolved or STILL if you want the manager to review.`
  };
}

function shouldEscalate(lower, mediaItems) {
  if (mediaItems.length && ["leak", "spark", "smoke", "flood", "broken", "water"].some((word) => lower.includes(word))) return true;
  return ESCALATION_WORDS.some((word) => lower.includes(word));
}

function isFixed(lower) {
  if (NEGATED_FIXED_WORDS.some((word) => lower.includes(word))) return false;
  return FIXED_WORDS.some((word) => lower.includes(word));
}
