import { type PlanDay } from "../types";

export interface DailyPrayer {
  title: string;
  text: string;
}

function readingPortions(day: PlanDay): string[] {
  return [day.tanakh, day.psalm, day.proverbs, day.brit_chadashah].filter(Boolean);
}

function joinPortions(day: PlanDay): string {
  const refs = readingPortions(day);
  if (refs.length === 0) return "today's reading";
  if (refs.length === 1) return refs[0];
  if (refs.length === 2) return `${refs[0]} and ${refs[1]}`;
  return `${refs.slice(0, -1).join(", ")}, and ${refs[refs.length - 1]}`;
}

export function buildDailyPrayer(templateId: string, day: PlanDay): DailyPrayer | null {
  // Custom plans are user-defined, so we use no canned prayer by default.
  if (templateId === "custom") return null;

  const refs = joinPortions(day);
  const theme = day.theme || "Your word";

  switch (templateId) {
    case "default":
      return {
        title: "Prayer for Today's Study",
        text:
          `Adonai, as I read ${refs}, open my heart to hear You clearly. ` +
          `Teach me to see Your faithfulness through today's theme, ${theme}, and to walk in obedience with joy. ` +
          `By Your Spirit, help me carry what I learn into my home, my work, and my conversations today. Amen.`,
      };

    case "nt-90":
      return {
        title: "Prayer for Today's B'rit Chadashah Reading",
        text:
          `Yeshua, as I read ${refs}, shape my mind by Your teachings and Your kingdom way. ` +
          `Let Your words confront what is false in me and strengthen what is faithful. ` +
          `Help me love as You love and witness to Your hope with courage today. Amen.`,
      };

    case "torah-50":
      return {
        title: "Prayer for Today's Torah Portion",
        text:
          `God of Abraham, Isaac, and Jacob, as I read ${refs}, write Your instruction on my heart. ` +
          `Teach me reverence, covenant faithfulness, and trust in Your provision. ` +
          `Let Your Torah form my character so my life reflects holiness and mercy. Amen.`,
      };

    case "psalms-30":
      return {
        title: "Prayer for Today's Worship and Wisdom",
        text:
          `Lord, through ${refs}, tune my heart to worship and my steps to wisdom. ` +
          `Receive my praise, my questions, and my burdens, and make my speech gentle and true. ` +
          `Guard my mind and mouth today so I live with humility, gratitude, and discernment. Amen.`,
      };

    case "whole-bible-1yr":
      return {
        title: "Prayer for Today's Whole-Bible Reading",
        text:
          `Sovereign God, as I read ${refs}, help me see how every part of Scripture tells Your redemptive story. ` +
          `Give me patience to understand context, wisdom to apply truth, and endurance to keep going day by day. ` +
          `Unify my heart in awe of You and align my life with Your word. Amen.`,
      };

    case "parasha":
      return {
        title: "Prayer for This Week's Parashah",
        text:
          `Adonai, through ${refs}, anchor me in the rhythm of Your appointed times and covenant faithfulness. ` +
          `Reveal the depth of Your instruction, and help me hear both the warning and the promise in today's portion. ` +
          `Let this week's reading draw me nearer to You and shape me into a blessing for others. Amen.`,
      };

    case "four-plus-one":
      return {
        title: "Prayer for Today's Four-Strand Reading",
        text:
          `Lord, as I read ${refs}, knit together every strand of Scripture into one clear call to follow You. ` +
          `Give me wisdom to hold truth, worship, gospel hope, and practical obedience together. ` +
          `Form in me a steady, whole-life devotion that bears fruit in love and faithfulness. Amen.`,
      };

    default:
      return {
        title: "Prayer for Today's Reading",
        text:
          `Father, as I read ${refs}, illuminate Your word and soften my heart to receive it. ` +
          `Show me what to trust, what to turn from, and how to live this truth today. ` +
          `May Your word bear lasting fruit in me by Your Spirit. Amen.`,
      };
  }
}
