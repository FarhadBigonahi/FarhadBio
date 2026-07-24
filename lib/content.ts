// Blog content ported verbatim from ../blog/posts.json.
// Rendered into the exact `wb-` DOM the blog styling expects (see app/blog.css).

export type Block =
  | { type: "p"; html: string }
  | { type: "h3"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "callout"; html: string };

export type Post = {
  slug: string;
  lang: string;
  dir: "rtl" | "ltr";
  emoji: string;
  title: string;
  subtitle: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  cover: string;
  coverFallback: string;
  coverAlt: string;
  coverWidth: number;
  coverHeight: number;
  date: string;
  dateFa: string;
  dateEn: string;
  readingMinutes: number;
  readingFa: string;
  tags: string[];
  repo: string;
  npm: string;
  body: Block[];
};

export const site = {
  baseUrl: "https://farhad.bio",
  name: "Farhad Bigonahi",
  author: "Farhad Bigonahi",
  authorUrl: "https://farhad.bio/",
  authorImage: "/images/apple-touch-icon.png",
  locale: "fa_IR",
  twitter: "@its.farhad.bio",
  sectionHeading: "Latest Insights",
  sectionSubtitle: "Notes on building, AI and open-source tools.",
  viewAllLabel: "View all posts",
  blogEyebrow: "بلاگ",
  blogTitle: "آخرین مطالب",
  blogSubtitle: "ریلز ها",
  blogDescription: "یادداشت‌هایی درباره ساختن، هوش مصنوعی و ابزارهای متن‌باز.",
  navHome: "خانه",
  navBlog: "بلاگ",
  navContact: "تماس",
  contactEmail: "business@farhad.bio",
};

export const posts: Post[] = [
  {
    slug: "whisp",
    lang: "fa",
    dir: "rtl",
    emoji: "🐎",
    title: "هوش مصنوعی به حرفت گوش نمی‌کنه؟",
    subtitle: "پس شاید وقتشه یه شلاقش بزنی! 😄",
    excerpt:
      "Whisp یا «شلاق» یک اپ سبک و متن‌بازه؛ وقتی هوش مصنوعی به حرفت گوش نمی‌کنه، با یک شلاق آبیِ چسبیده به موس بهش گوشزد می‌کنی. نصب سریع با npm و کاملاً Open Source.",
    metaTitle:
      "Whisp (شلاق) — وقتی هوش مصنوعی به حرفت گوش نمی‌کنه | فرهاد بیگناهی",
    metaDescription:
      "Whisp یک اپ سبک و متن‌باز است که یک شلاق آبی به موس شما وصل می‌کند تا به هوش مصنوعی گوشزد کنید. نصب یک‌خطی با npm، اجرای سورس با گیت‌هاب و کاملاً Open Source.",
    cover: "/images/blog/whisp-ai-whip-cover.webp",
    coverFallback: "/images/blog/whisp-ai-whip-cover.png",
    coverAlt:
      "پوستر مقاله Whisp: مردی با تیشرت سفید و دست‌به‌سینه در اتاق گیمینگ، با متن «هوش مصنوعی به حرفت گوش نمیکنه؟» و لوگوی چت‌جی‌پی‌تی",
    coverWidth: 941,
    coverHeight: 1672,
    date: "2026-07-21",
    dateFa: "۳۰ تیر ۱۴۰۵",
    dateEn: "July 21, 2026",
    readingMinutes: 2,
    readingFa: "۲ دقیقه مطالعه",
    tags: ["Open Source", "ابزار", "هوش مصنوعی", "Node.js"],
    repo: "https://github.com/FarhadBigonahi/Whisp",
    npm: "whisp",
    body: [
      {
        type: "p",
        html: "<strong>Whisp (شلاق)</strong> یه اپ خیلی سبک و متن‌بازه که بعد از اجرا، بی‌سروصدا به‌صورت یه <strong>آیکون سفید داخل System Tray</strong> می‌شینه. هر وقت خواستی، روی آیکونش کلیک کن؛ یه شلاق آبی به موس وصل میشه و با تکون دادن موس، شلاق رو شبیه‌سازی می‌کنه. 💥",
      },
      {
        type: "p",
        html: "همزمان با صدای شلاق، یه پیام می‌فرسته و داخل پنجره‌ای که بازه تایپ میشه.",
      },
      { type: "h3", text: "🚀 نصب" },
      { type: "p", html: "ساده‌ترین راه، نصب سراسری با npm‌ه:" },
      { type: "code", lang: "bash", code: "npm install -g whisp" },
      { type: "code", lang: "bash", code: "whisp" },
      { type: "p", html: "یا اگه دوست داری سورسش رو اجرا یا تغییر بدی:" },
      {
        type: "code",
        lang: "bash",
        code: "git clone https://github.com/FarhadBigonahi/Whisp.git\ncd Whisp\nnpm install\nnpm start",
      },
      {
        type: "callout",
        html: "⭐ پروژه کاملاً <strong>Open Source</strong> هست؛ اگه خوشت اومد یه Star بده.",
      },
    ],
  },
];

export function getAllPosts(): Post[] {
  return posts;
}

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
