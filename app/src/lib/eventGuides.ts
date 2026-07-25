import { getHebrewDateInfo, type HebrewHoliday } from "./hebrewCalendar";

export interface GuideStep {
  title: string;
  transliteration?: string;
  hebrew?: string;
  translation?: string;
  note?: string;
}

export interface EventGuide {
  id: string;
  title: string;
  subtitle: string;
  meaning: string;
  steps: GuideStep[];
}

export interface CalendarEventEntry {
  key: string;
  date: Date;
  hebrewDate: ReturnType<typeof getHebrewDateInfo>;
  holiday: HebrewHoliday;
  guide: EventGuide;
}

function candleLightingStep(): GuideStep {
  return {
    title: "Light the candles",
    transliteration: "Baruch atah Adonai, Eloheinu Melech ha'olam, asher kid'shanu b'mitzvotav v'tzivanu l'hadlik ner shel Shabbat.",
    hebrew: "בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לְהַדְלִיק נֵר שֶׁל שַׁבָּת.",
    translation: "Blessed are You, Adonai our God, King of the universe, who sanctified us with His commandments and commanded us to kindle the Shabbat light.",
  };
}

function kiddushStep(): GuideStep {
  return {
    title: "Recite Kiddush",
    transliteration: "Baruch atah Adonai, Eloheinu Melech ha'olam, borei p'ri hagafen.",
    hebrew: "בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הַגָּפֶן.",
    translation: "Blessed are You, Adonai our God, King of the universe, who creates the fruit of the vine.",
  };
}

function handWashingStep(): GuideStep {
  return {
    title: "Wash hands",
    transliteration: "Baruch atah Adonai, Eloheinu Melech ha'olam, asher kid'shanu b'mitzvotav v'tzivanu al netilat yadayim.",
    hebrew: "בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל נְטִילַת יָדָיִם.",
    translation: "Blessed are You, Adonai our God, King of the universe, who sanctified us with His commandments and commanded us concerning the washing of hands.",
  };
}

function hamotziStep(): GuideStep {
  return {
    title: "Bless the bread",
    transliteration: "Baruch atah Adonai, Eloheinu Melech ha'olam, hamotzi lechem min ha'aretz.",
    hebrew: "בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ.",
    translation: "Blessed are You, Adonai our God, King of the universe, who brings forth bread from the earth.",
  };
}

function genericOpening(eventName: string): GuideStep {
  return {
    title: "Set the table and gather everyone",
    note: `Slow the pace and explain what ${eventName} means to your family before the meal begins.`,
  };
}

function makeGuide(id: string, title: string, subtitle: string, meaning: string, steps: GuideStep[]): EventGuide {
  return { id, title, subtitle, meaning, steps };
}

function shabbatGuide(): EventGuide {
  return makeGuide(
    "shabbat",
    "Shabbat",
    "A guided home service for Friday night / Shabbat dinner",
    "Shabbat is the weekly covenant sign of rest, delight, and remembrance. This guide follows a family-friendly Messianic home rhythm.",
    [
      candleLightingStep(),
      genericOpening("Shabbat"),
      kiddushStep(),
      handWashingStep(),
      hamotziStep(),
      {
        title: "Bless the children",
        transliteration: "Yevarechecha Adonai v'yishmerecha...",
        hebrew: "יְבָרֶכְךָ יְהוָה וְיִשְׁמְרֶךָ...",
        translation: "May Adonai bless you and keep you...",
        note: "Many families speak a blessing over each child here.",
      },
      {
        title: "Read, sing, and rest",
        note: "Share a short portion, a psalm, or a Messiah-centered reflection, then enjoy the meal in peace.",
      },
    ],
  );
}

function pesachGuide(): EventGuide {
  return makeGuide(
    "pesach",
    "Passover / Pesach",
    "A guided seder-style family experience",
    "Pesach remembers redemption from Egypt and points to God's deliverance and faithfulness.",
    [
      { title: "Clean out chametz", note: "Make space for the holiday by removing leaven and preparing the table." },
      { ...candleLightingStep(), title: "Light the festival candles" },
      { title: "Tell the story", note: "Walk through the exodus story and ask the children the meaning of the night." },
      { title: "Drink from the cup of blessing", transliteration: "Baruch atah Adonai... borei p'ri hagafen.", hebrew: "בָּרוּךְ אַתָּה...", translation: "Blessed are You... who creates the fruit of the vine." },
      { title: "Eat matzah and the meal", note: "Use the meal to remember haste, humility, and redemption." },
      { title: "Share hope in Messiah", note: "Connect the story of deliverance to Yeshua as the Lamb of God." },
    ],
  );
}

function shavuotGuide(): EventGuide {
  return makeGuide(
    "shavuot",
    "Shavuot",
    "A guided celebration of Torah and the Spirit",
    "Shavuot celebrates the giving of Torah and the firstfruits harvest, and in the B'rit Chadashah it remembers the outpouring of the Ruach.",
    [
      { title: "Thank God for His word", note: "Begin by thanking God for Torah, Scripture, and teaching." },
      { title: "Read a short passage", note: "Many families read Exodus 19-20, Ruth, or Acts 2." },
      { title: "Eat a festive meal", note: "Traditionally dairy foods are common, but any celebratory meal works." },
      { title: "Pray for the Spirit's filling", note: "Ask for fresh obedience, wisdom, and power to live the word." },
    ],
  );
}

function roshHashanahGuide(): EventGuide {
  return makeGuide(
    "rosh-hashanah",
    "Rosh Hashanah",
    "A guided family new-year observance",
    "Rosh Hashanah marks the head of the year, a time of repentance, remembrance, and hope.",
    [
      candleLightingStep(),
      { title: "Hear the shofar", note: "Listen, reflect, and wake up spiritually for the new year." },
      kiddushStep(),
      { title: "Eat something sweet", note: "Apples and honey are a simple way to symbolize a sweet year." },
      { title: "Pray for teshuvah", note: "Ask God for returning, cleansing, and a faithful year ahead." },
    ],
  );
}

function yomKippurGuide(): EventGuide {
  return makeGuide(
    "yom-kippur",
    "Yom Kippur",
    "A guided fast-day liturgy at home",
    "Yom Kippur is the day of atonement, humbling the heart and seeking God's mercy.",
    [
      { title: "Prepare for the fast", note: "Set aside the day with humility and prayer." },
      { title: "Confess and repent", note: "Use Psalms 51 or a confession litany before God." },
      { title: "Read about atonement", note: "Many families read Leviticus 16 and Hebrews 9-10." },
      { title: "Break the fast with gratitude", note: "End the day with thanksgiving and peace." },
    ],
  );
}

function sukkotGuide(): EventGuide {
  return makeGuide(
    "sukkot",
    "Sukkot",
    "A guided home celebration in the sukkah",
    "Sukkot remembers God's sheltering presence and the joy of dwelling with Him.",
    [
      { title: "Decorate the sukkah", note: "Invite the family into a joyful, temporary dwelling." },
      { title: "Wave the lulav and etrog", note: "Give thanks for God's provision and presence." },
      { title: "Eat together outside", note: "Share meals in the sukkah whenever possible." },
      { title: "Rejoice and sing", note: "Make room for joy, hospitality, and praise." },
    ],
  );
}

function hanukkahGuide(): EventGuide {
  return makeGuide(
    "hanukkah",
    "Hanukkah",
    "A guided menorah lighting for the home",
    "Hanukkah celebrates rededication, faithful witness, and light shining in darkness.",
    [
      { title: "Light the menorah", transliteration: "Baruch atah Adonai... lehadlik ner shel Hanukkah.", hebrew: "בָּרוּךְ אַתָּה... לְהַדְלִיק נֵר שֶׁל חֲנֻכָּה.", translation: "Blessed are You... who commanded us to kindle the Hanukkah light." },
      { title: "Sing and tell the story", note: "Remember the rededication of the temple and God's faithfulness." },
      { title: "Enjoy festive food", note: "Traditional foods often include oil-related dishes like latkes or sufganiyot." },
      { title: "Pray for light", note: "Ask God to renew your home and testimony." },
    ],
  );
}

function purimGuide(): EventGuide {
  return makeGuide(
    "purim",
    "Purim",
    "A guided family celebration of rescue",
    "Purim remembers God's hidden providence and joyful deliverance.",
    [
      { title: "Read the Megillah", note: "Read or retell the story of Esther with energy." },
      { title: "Give gifts to others", note: "Share food or small gifts with neighbors and friends." },
      { title: "Celebrate with joy", note: "Eat, sing, and rejoice in God's deliverance." },
      { title: "Remember the hidden hand of God", note: "Notice how God works even when His name is not obvious in the story." },
    ],
  );
}

function roshChodeshGuide(monthName: string): EventGuide {
  return makeGuide(
    "rosh-chodesh",
    `Rosh Chodesh ${monthName}`,
    "A guided new-moon observance",
    "Rosh Chodesh is a time to pause, reset, and dedicate the coming month to God.",
    [
      { title: "Light a candle or set aside time", note: "Mark the beginning of the month with gratitude." },
      { title: "Read a psalm", note: "Psalm 104, 81, or 121 are common choices." },
      { title: "Pray for the month ahead", note: "Ask for wisdom, provision, and peace." },
    ],
  );
}

function modernGuide(name: string): EventGuide {
  return makeGuide(
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    "A guided remembrance and prayer time",
    `This day invites remembrance, gratitude, and prayer around ${name}.`,
    [
      { title: "Pause and remember", note: `Take a few moments to reflect on the meaning of ${name}.` },
      { title: "Read or pray a psalm", note: "A short psalm helps keep the time centered and reverent." },
      { title: "Pray for peace and hope", note: "Ask God to strengthen His people and your household." },
    ],
  );
}

export function getEventGuideForHoliday(holiday: HebrewHoliday): EventGuide {
  const name = holiday.name.toLowerCase();
  if (holiday.type === "shabbat") return shabbatGuide();
  if (name.includes("passover") || name.includes("pesach") || name.includes("erev pesach")) return pesachGuide();
  if (name.includes("shavuot")) return shavuotGuide();
  if (name.includes("rosh hashanah")) return roshHashanahGuide();
  if (name.includes("yom kippur")) return yomKippurGuide();
  if (name.includes("sukkot") || name.includes("shemini atzeret") || name.includes("simchat torah")) return sukkotGuide();
  if (name.includes("hanukkah")) return hanukkahGuide();
  if (name.includes("purim")) return purimGuide();
  if (holiday.type === "rosh_chodesh") return roshChodeshGuide(holiday.name.replace(/^Rosh Chodesh\s+/i, ""));
  if (holiday.type === "fast") return makeGuide(
    "fast-day",
    holiday.name,
    "A guided fast-day prayer time",
    `This is a day of humility, repentance, and prayer: ${holiday.name}.`,
    [
      { title: "Set aside the day", note: "If you are fasting, keep the day simple and prayerful." },
      { title: "Read a psalm of repentance", note: "Psalm 51 or 130 are common choices." },
      { title: "Pray for mercy and renewal", note: "Ask God to restore your heart and community." },
    ],
  );
  return modernGuide(holiday.name);
}

export function getCalendarEventsForDate(date: Date): CalendarEventEntry[] {
  const hebrewDate = getHebrewDateInfo(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return hebrewDate.holidays.map((holiday) => ({
    key: `${date.toISOString().slice(0, 10)}::${holiday.name}`,
    date,
    hebrewDate,
    holiday,
    guide: getEventGuideForHoliday(holiday),
  }));
}

export function getUpcomingCalendarEvents(startDate = new Date(), daysAhead = 14): CalendarEventEntry[] {
  const events: CalendarEventEntry[] = [];
  for (let offset = 0; offset <= daysAhead; offset++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + offset);
    events.push(...getCalendarEventsForDate(date));
  }
  return events;
}