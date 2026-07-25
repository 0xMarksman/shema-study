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
  readings: ReadingPortion[];
}

export interface ReadingPortion {
  label: string;
  reference: string;
  note?: string;
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

function makeGuide(
  id: string,
  title: string,
  subtitle: string,
  meaning: string,
  steps: GuideStep[],
  readings: ReadingPortion[] = [],
): EventGuide {
  return { id, title, subtitle, meaning, steps, readings };
}

function shabbatGuide(): EventGuide {
  return makeGuide(
    "shabbat",
    "Shabbat",
    "A guided home service for Friday night / Shabbat dinner",
    "Shabbat is the seventh-day covenant sign in which God calls His people to stop ordinary work, delight in His presence, and remember creation and redemption.",
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
    [
      { label: "Creation rest", reference: "Genesis 2", note: "God rests and blesses the seventh day." },
      { label: "Shabbat command", reference: "Exodus 20", note: "Remember the Sabbath and keep it holy." },
      { label: "Delight in the day", reference: "Isaiah 58", note: "A call to honor Shabbat as a delight." },
      { label: "Shabbat psalm", reference: "Psalm 92", note: "A psalm for the Sabbath day." },
      { label: "Rest in Messiah", reference: "Hebrews 4", note: "A New Covenant reflection on entering God's rest." },
    ],
  );
}

function pesachGuide(): EventGuide {
  return makeGuide(
    "pesach",
    "Passover / Pesach",
    "A guided seder-style family experience",
    "Pesach remembers Israel's deliverance from Egypt, the blood of the lamb, and the birth of the covenant people through God's rescue.",
    [
      { title: "Clean out chametz", note: "Make space for the holiday by removing leaven and preparing the table." },
      { ...candleLightingStep(), title: "Light the festival candles" },
      { title: "Tell the story", note: "Walk through the exodus story and ask the children the meaning of the night." },
      { title: "Drink from the cup of blessing", transliteration: "Baruch atah Adonai... borei p'ri hagafen.", hebrew: "בָּרוּךְ אַתָּה...", translation: "Blessed are You... who creates the fruit of the vine." },
      { title: "Eat matzah and the meal", note: "Use the meal to remember haste, humility, and redemption." },
      { title: "Share hope in Messiah", note: "Connect the story of deliverance to Yeshua as the Lamb of God." },
    ],
    [
      { label: "Passover institution", reference: "Exodus 12", note: "The original Pesach instructions and lamb imagery." },
      { label: "Remember redemption", reference: "Exodus 13", note: "Set apart the firstborn and remember the exodus." },
      { label: "Passover in the Gospels", reference: "Luke 22", note: "Yeshua shares the meal with His disciples." },
      { label: "Messiah our Passover", reference: "1 Corinthians 5", note: "Paul's teaching on Messiah as our Passover." },
    ],
  );
}

function shavuotGuide(): EventGuide {
  return makeGuide(
    "shavuot",
    "Shavuot",
    "A guided celebration of Torah and the Spirit",
    "Shavuot is the firstfruits feast that remembers Sinai, the giving of Torah, and the harvest moment when the Ruach was poured out in Jerusalem.",
    [
      { title: "Thank God for His word", note: "Begin by thanking God for Torah, Scripture, and teaching." },
      { title: "Read a short passage", note: "Many families read Exodus 19-20, Ruth, or Acts 2." },
      { title: "Eat a festive meal", note: "Traditionally dairy foods are common, but any celebratory meal works." },
      { title: "Pray for the Spirit's filling", note: "Ask for fresh obedience, wisdom, and power to live the word." },
    ],
    [
      { label: "Sinai and covenant", reference: "Exodus 19-20", note: "The mountain moment and the giving of Torah." },
      { label: "Harvest and loyalty", reference: "Ruth 1-4", note: "A harvest story read on Shavuot in many traditions." },
      { label: "The Spirit outpoured", reference: "Acts 2", note: "The Ruach comes at Shavuot in Jerusalem." },
      { label: "Harvest of the word", reference: "James 1", note: "Be doers of the word, not only hearers." },
    ],
  );
}

function roshHashanahGuide(): EventGuide {
  return makeGuide(
    "rosh-hashanah",
    "Rosh Hashanah",
    "A guided family new-year observance",
    "Rosh Hashanah is the biblical new year and trumpet feast that calls the community to wake up, repent, and enter the year with reverence.",
    [
      candleLightingStep(),
      { title: "Hear the shofar", note: "Listen, reflect, and wake up spiritually for the new year." },
      kiddushStep(),
      { title: "Eat something sweet", note: "Apples and honey are a simple way to symbolize a sweet year." },
      { title: "Pray for teshuvah", note: "Ask God for returning, cleansing, and a faithful year ahead." },
    ],
    [
      { label: "Remember the appointed times", reference: "Leviticus 23", note: "The biblical calendar and the moedim." },
      { label: "Trumpet day", reference: "Numbers 29", note: "The offerings associated with the day." },
      { label: "Wake up the soul", reference: "Psalm 81", note: "Blow the shofar and hear God's voice." },
      { label: "Watch and be ready", reference: "Matthew 24", note: "A New Covenant call to vigilance." },
    ],
  );
}

function yomKippurGuide(): EventGuide {
  return makeGuide(
    "yom-kippur",
    "Yom Kippur",
    "A guided fast-day liturgy at home",
    "Yom Kippur is the day when Israel humbles itself before God to seek atonement, cleansing, and mercy through confession and sacrifice.",
    [
      { title: "Prepare for the fast", note: "Set aside the day with humility and prayer." },
      { title: "Confess and repent", note: "Use Psalms 51 or a confession litany before God." },
      { title: "Read about atonement", note: "Many families read Leviticus 16 and Hebrews 9-10." },
      { title: "Break the fast with gratitude", note: "End the day with thanksgiving and peace." },
    ],
    [
      { label: "Day of atonement", reference: "Leviticus 16", note: "The high priest, sacrifice, and cleansing." },
      { label: "A contrite heart", reference: "Psalm 51", note: "A prayer of repentance and renewal." },
      { label: "The greater priesthood", reference: "Hebrews 9-10", note: "Messiah's once-for-all atonement." },
    ],
  );
}

function sukkotGuide(): EventGuide {
  return makeGuide(
    "sukkot",
    "Sukkot",
    "A guided home celebration in the sukkah",
    "Sukkot is the harvest feast of temporary shelters, remembering God's protection in the wilderness and His future dwelling with His people.",
    [
      { title: "Decorate the sukkah", note: "Invite the family into a joyful, temporary dwelling." },
      { title: "Wave the lulav and etrog", note: "Give thanks for God's provision and presence." },
      { title: "Eat together outside", note: "Share meals in the sukkah whenever possible." },
      { title: "Rejoice and sing", note: "Make room for joy, hospitality, and praise." },
    ],
    [
      { label: "The appointed festival", reference: "Leviticus 23", note: "Instructions for the feast of booths." },
      { label: "Water and praise", reference: "John 7", note: "Yeshua's words during Sukkot." },
      { label: "Nations coming up", reference: "Zechariah 14", note: "A prophetic view of the feast and the King." },
    ],
  );
}

function hanukkahGuide(): EventGuide {
  return makeGuide(
    "hanukkah",
    "Hanukkah",
    "A guided menorah lighting for the home",
    "Hanukkah remembers the rededication of the temple after oppression, the miracle of light, and the call to remain faithful in a dark time.",
    [
      { title: "Light the menorah", transliteration: "Baruch atah Adonai... lehadlik ner shel Hanukkah.", hebrew: "בָּרוּךְ אַתָּה... לְהַדְלִיק נֵר שֶׁל חֲנֻכָּה.", translation: "Blessed are You... who commanded us to kindle the Hanukkah light." },
      { title: "Sing and tell the story", note: "Remember the rededication of the temple and God's faithfulness." },
      { title: "Enjoy festive food", note: "Traditional foods often include oil-related dishes like latkes or sufganiyot." },
      { title: "Pray for light", note: "Ask God to renew your home and testimony." },
    ],
    [
      { label: "Dedication and cleansing", reference: "John 10", note: "Yeshua at the Feast of Dedication." },
      { label: "Light in the darkness", reference: "John 1", note: "The Light shines in the darkness." },
      { label: "Faithful witness", reference: "Daniel 1", note: "A model of consecration in exile." },
    ],
  );
}

function purimGuide(): EventGuide {
  return makeGuide(
    "purim",
    "Purim",
    "A guided family celebration of rescue",
    "Purim remembers Esther's story, where God preserved His people from destruction through hidden providence, courage, and joyful reversal.",
    [
      { title: "Read the Megillah", note: "Read or retell the story of Esther with energy." },
      { title: "Give gifts to others", note: "Share food or small gifts with neighbors and friends." },
      { title: "Celebrate with joy", note: "Eat, sing, and rejoice in God's deliverance." },
      { title: "Remember the hidden hand of God", note: "Notice how God works even when His name is not obvious in the story." },
    ],
    [
      { label: "The story of Esther", reference: "Esther 1-10", note: "Read the whole Megillah, or sections of it, for the holiday." },
      { label: "Joy after sorrow", reference: "Psalm 30", note: "A prayer of praise for deliverance." },
    ],
  );
}

function roshChodeshGuide(monthName: string): EventGuide {
  return makeGuide(
    "rosh-chodesh",
    `Rosh Chodesh ${monthName}`,
    "A guided new-moon observance",
    `Rosh Chodesh ${monthName} marks the start of the Hebrew month, a biblical reset point for prayer, gratitude, and setting the month apart to God.`,
    [
      { title: "Light a candle or set aside time", note: "Mark the beginning of the month with gratitude." },
      { title: "Read a psalm", note: "Psalm 104, 81, or 121 are common choices." },
      { title: "Pray for the month ahead", note: "Ask for wisdom, provision, and peace." },
    ],
    [
      { label: "The new moon", reference: "Numbers 28", note: "Offerings for the start of the month." },
      { label: "Celebrate the new month", reference: "Psalm 81", note: "A psalm tied to the festival calendar." },
    ],
  );
}

function modernGuide(name: string): EventGuide {
  const lower = name.toLowerCase();
  const meaning =
    lower.includes("yom hashoah")
      ? "Yom HaShoah is Holocaust Remembrance Day, set aside to remember the six million Jews murdered and to honor survivor testimony and memory."
      : lower.includes("yom hazikaron")
        ? "Yom HaZikaron is Israel's Memorial Day, a solemn time to remember soldiers and civilians who died in the defense of the people and the land."
        : lower.includes("yom ha'atzmaut") || lower.includes("yom haatzmaut")
          ? "Yom Ha'Atzmaut is Israel's Independence Day, celebrating the rebirth of Jewish self-rule in the modern state of Israel."
          : lower.includes("yom yerushalayim")
            ? "Yom Yerushalayim celebrates Jerusalem's reunification and the city's place in God's covenant story."
            : lower.includes("lag b'omer") || lower.includes("lag bomer")
              ? "Lag B'Omer marks the 33rd day of the Omer count, a day of joy between Pesach and Shavuot often associated with survival, study, and celebration."
              : lower.includes("tu b'av")
                ? "Tu B'Av is a day of joy and restoration in the Hebrew calendar, traditionally associated with love, reconciliation, and renewed hope."
                : lower.includes("tu bishvat")
                  ? "Tu BiShvat is the new year for trees, a season for thanking God for fruitfulness, the land, and the life hidden in the soil."
                  : lower.includes("shushan purim")
                    ? "Shushan Purim extends the Purim deliverance into the next day, especially in walled cities, as a continuation of celebration."
                    : lower.includes("purim katan")
                      ? "Purim Katan is the small Purim in a leap year, a minor celebration that anticipates the fuller Purim in Adar II."
                      : lower.includes("tisha b'av")
                        ? "Tisha B'Av is a national day of mourning for the destruction of the temples and other disasters in Jewish history."
                        : lower.includes("fast of gedaliah")
                          ? "The Fast of Gedaliah remembers the assassination after the First Temple's fall and the collapse that followed."
                          : lower.includes("fast of 10 tevet")
                            ? "The Fast of 10 Tevet remembers the beginning of Jerusalem's siege and the tightening noose around the city."
                            : lower.includes("ta'anit esther") || lower.includes("taanit esther")
                              ? "Ta'anit Esther is the fast before Purim, remembering Esther's courage and the community's prayer before deliverance."
                              : `Observe ${name} with prayer, remembrance, and gratitude in light of its place in the Hebrew calendar.`;
  return makeGuide(
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    "A guided remembrance and prayer time",
    meaning,
    [
      { title: "Pause and remember", note: `Take a few moments to reflect on why ${name} is observed in the Hebrew calendar.` },
      { title: "Read or pray a psalm", note: "A short psalm helps keep the time centered and reverent." },
      { title: "Pray for peace and hope", note: `Ask God to meet your household through the themes of ${name}.` },
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
    holiday.name.includes("Gedaliah")
      ? "The Fast of Gedaliah mourns the assassination after the First Temple's destruction and the collapse that followed for the remaining Jewish community."
      : holiday.name.includes("10 Tevet")
        ? "The Fast of 10 Tevet marks the beginning of Jerusalem's siege and the growing pressure that led to the city's fall."
        : holiday.name.includes("Tisha B'Av") || holiday.name.includes("Tisha B’Av")
          ? "Tisha B'Av is the national fast of grief for the destructions of the temples and other tragedies remembered in Jewish history."
          : holiday.name.includes("Esther")
            ? "Ta'anit Esther is the fast before Purim, recalling Esther's prayer and the community's dependence on God before deliverance."
            : `This fast day, ${holiday.name}, is a set-apart time for humility, repentance, and prayer before God.`,
    [
      { title: "Set aside the day", note: `Keep ${holiday.name} simple and prayerful, especially if you are fasting.` },
      { title: "Read a psalm of repentance", note: "Psalm 51 or 130 are common choices." },
      { title: "Pray for mercy and renewal", note: `Ask God to restore your heart and the people remembered on ${holiday.name}.` },
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

export function getCalendarEventsForYear(year: number): CalendarEventEntry[] {
  const events: CalendarEventEntry[] = [];
  const date = new Date(year, 0, 1);
  while (date.getFullYear() === year) {
    events.push(...getCalendarEventsForDate(new Date(date)));
    date.setDate(date.getDate() + 1);
  }
  return events;
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