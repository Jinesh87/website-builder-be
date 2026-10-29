import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "../business/build.js";
import { COMMUNITY_HUB_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "floating",
  siteName: NAME,
  logo: COMMUNITY_HUB_LOGO,
  logoDisplay: "logo_only",
  menu: [
    { label: "Initiatives", href: "/courses" },
    { label: "Chapters", href: "/about" },
    { label: "Community", href: "/about" },
    { label: "Membership", href: "/#membership" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Join Collective", href: "/#membership" },
  announcement: "2026 Global Community Impact Summit — Hybrid Registration Open",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "mega",
  siteName: NAME,
  logo: COMMUNITY_HUB_LOGO,
  tagline: "Regenerating neighborhoods, building food security, and empowering grassroots civic resilience worldwide.",
  description:
    "Solaria Civic Collective is a decentralised, community-owned nonprofit network mobilizing 28,000+ neighbors across 140 municipal chapters.",
  columns: [
    {
      title: "Action Hubs",
      links: [
        { label: "Urban Food Forests", href: "/courses" },
        { label: "Neighborhood Microgrids", href: "/courses" },
        { label: "Youth Civic Academy", href: "/courses" },
        { label: "Tool Libraries & Repair", href: "/courses" },
      ],
    },
    {
      title: "Participate",
      links: [
        { label: "Find Your Local Chapter", href: "/about" },
        { label: "Become a Volunteer", href: "/contact" },
        { label: "Apply for a Micro-Grant", href: "/contact" },
        { label: "Community Forum & Discord", href: "/about" },
      ],
    },
    {
      title: "Governance",
      links: [
        { label: "Annual Impact Report", href: "/about" },
        { label: "Open Financial Ledger", href: "/about" },
        { label: "Community Charter", href: "/about" },
        { label: "Press & Media Kit", href: "/contact" },
      ],
    },
  ],
  contact: {
    email: "hello@solariacollective.org",
    phone: "+1 (503) 914-2200",
    address: "Community Commons, 1204 SE Water Ave, Portland, OR",
  },
  social: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Twitter", href: "https://x.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "GitHub", href: "https://github.com" },
  ],
  newsletter: {
    enabled: true,
    title: "The Weekly Collective",
    description: "Stories of grassroots neighborhood renewal, upcoming seed exchanges, and local climate action.",
    placeholder: "Enter your email address",
    buttonText: "Subscribe",
  },
  copyright: `© 2026 ${NAME}. A 501(c)(3) grassroots community coalition.`,
};

export const COMMUNITY_HUB: BusinessTemplate = businessTemplate({
  key: "community-hub-emerald",
  name: "Community Hub · Emerald",
  category: "Education",
  description:
    "A vibrant, welcoming civic and environmental community hub featuring dynamic impact counters, program directories, grassroots membership tiers, and local chapter networks.",
  themeName: "Solaria Emerald Civic",
  theme: {
    colors: {
      primary: "#059669",
      secondary: "#D97706",
      background: "#F8FAFC",
      surface: "#ECFDF5",
      text: "#0F172A",
      muted: "#64748B",
    },
    fonts: { heading: "bricolage-grotesque", body: "inter" },
    buttonStyle: "filled",
    cardStyle: "shadow",
    radius: "lg",
    containerWidth: 1240,
    sectionSpacing: "normal",
  },
  header,
  footer,
  pages: [
    {
      name: "Home",
      slug: "/",
      sections: [
        section("hero", {
          variant: "curved-bottom",
          eyebrow: "Decentralized Neighborhood Action Network",
          badgeIcon: "🌿",
          heading: "Empowering communities to regenerate neighborhoods & climate resilience",
          highlightText: "regenerate neighborhoods",
          subheading:
            "Join 28,000+ neighbors organizing local food forests, neighborhood microgrid cooperatives, circular repair cafes, and intergenerational civic workshops.",
          primaryCta: { label: "Explore Local Programs", href: "/courses" },
          secondaryCta: { label: "Join Your Chapter", href: "/#membership" },
          rating: {
            stars: 5,
            text: "Over 140+ active municipal chapters in 18 countries",
            avatarCount: 4,
          },
        }),
        section(
          "marquee",
          {
            variant: "pill-badges",
            items: [
              { text: "Urban Agroecology & Seed Banks", icon: "heart" },
              { text: "Renewable Solar Microgrid Co-ops", icon: "bolt" },
              { text: "Youth Civic Leadership Academy", icon: "star" },
              { text: "Circular Tool Libraries & Repair Cafes", icon: "tools" },
              { text: "Open Environmental Sensor Nets", icon: "cloud" },
              { text: "Neighborhood Rapid Mutual Aid", icon: "shield" },
            ],
            speed: "normal",
            pauseOnHover: true,
          },
          { background: "surface", spacing: "compact" },
        ),
        section(
          "stats",
          {
            heading: "Grassroots Civic Action in Numbers",
            intro: "Real, measurable collective transformation happening block by block, town by town.",
            items: [
              { value: "142", label: "Active Municipal Chapters" },
              { value: "48,500+", label: "Native Trees & Food Plants Planted" },
              { value: "$3.4M", label: "Direct Grassroots Grants Disbursed" },
              { value: "98,200", label: "Volunteer Hours Contributed" },
            ],
          },
          { background: "default" },
        ),
        section(
          "services",
          {
            variant: "cards-grid",
            eyebrow: "Community Action Pillars",
            heading: "Active Initiatives You Can Join Today",
            intro: "Whether you have two hours on a Saturday or want to launch a full neighborhood cooperative, there is a place for you.",
            columns: 3,
            mobileColumns: 1,
            items: [
              {
                title: "Urban Food Forests & Community Gardens",
                description: "Transforming vacant municipal lots into self-sustaining, biodiverse public orchards providing free organic produce to local food pantries.",
                badge: "Agroecology",
                features: ["Community composting hubs", "Heirloom seed library", "Weekend garden workdays"],
                image: photo("1585320806297-9794b3e4eeae", "Volunteers working in lush urban community garden"),
              },
              {
                title: "Renewable Microgrid Energy Cooperatives",
                description: "Democratizing clean energy by installing shared neighborhood rooftop solar arrays and battery banks with tenant-owned equity stakes.",
                badge: "Clean Energy",
                features: ["Zero-interest green loans", "Neighborhood battery resilience", "Lower monthly power bills"],
                image: photo("1464226184884-fa280b87c399", "Solar panels on modern community center roof"),
              },
              {
                title: "Youth Civic Leadership & Organizing Fellowship",
                description: "Empowering high-school and college youth with hands-on training in local civic lobbying, public speaking, and policy co-creation.",
                badge: "Education",
                features: ["Paid semester stipends", "Mentorship from civic leaders", "City council advocacy sprints"],
                image: photo("1529156069898-49953e39b3ac", "Diverse young community leaders smiling together"),
              },
              {
                title: "Circular Tool Libraries & Repair Cafes",
                description: "Lending libraries for power tools, sewing machines, and woodworking gear, hosting free monthly volunteer repair workshops to divert e-waste.",
                badge: "Circular Economy",
                features: ["1,500+ tools available for loan", "Master mechanic repair clinics", "Woodworking skills workshops"],
                image: photo("1559027615-cd4628902d4a", "Community repair workshop fixing appliances together"),
              },
              {
                title: "Open Environmental Sensor Labs",
                description: "Deploying low-cost open-source air quality and water purity sensors across neighborhoods to map environmental injustice and demand remediation.",
                badge: "Civic Tech",
                features: ["Real-time public telemetry map", "Community air monitoring kits", "Data-driven municipal petitions"],
                image: photo("1542601906990-b4d3fb778b09", "Hands planting seedling in green conservation soil"),
              },
              {
                title: "Neighborhood Mutual Aid & Resilience Hubs",
                description: "Equipping community centers with satellite internet, emergency water filtration, and first-aid response kits for climate emergency preparedness.",
                badge: "Mutual Aid",
                features: ["Emergency food pantry network", "Community first-aid training", "Extreme heat cooling shelters"],
                image: photo("1593113598332-cd288d649433", "Community members organizing fresh food donation boxes"),
              },
            ],
          },
          { background: "surface" },
        ),
        section(
          "features",
          {
            variant: "cards",
            eyebrow: "Our Guiding Values",
            heading: "How We Organize as a Collective",
            intro: "Built on principles of deep democracy, environmental stewardship, and radical transparency.",
            columns: 4,
            mobileColumns: 1,
            items: [
              {
                icon: "heart",
                title: "Grassroots Autonomy",
                description: "Every neighborhood chapter votes on its own budget, local priorities, and community projects through quadratic voting.",
              },
              {
                icon: "shield",
                title: "Radical Transparency",
                description: "All financial ledgers, grant decisions, and meeting notes are published openly in real time on our public repository.",
              },
              {
                icon: "sparkles",
                title: "Intergenerational Wisdom",
                description: "Fostering collaboration between elder knowledge keepers, youth activists, and working families across every project.",
              },
              {
                icon: "bolt",
                title: "Immediate Tangible Action",
                description: "We favor planting trees and repairing bicycles over endless committee debates. Action creates hope.",
              },
            ],
          },
          { background: "default" },
        ),
        section(
          "team",
          {
            variant: "spotlight-featured",
            eyebrow: "Stewards & Organizers",
            heading: "Meet the Grassroots Organizers",
            intro: "Community leaders dedicated to building stronger, greener, and more connected neighborhoods.",
            columns: 4,
            mobileColumns: 1,
            members: [
              {
                name: "Maya Lin-Perez",
                role: "Director of Agroecology",
                department: "Urban Food Network",
                bio: "Soil scientist and community farmer who has turned 24 vacant industrial lots into thriving community orchards.",
                photo: photo("1534528741775-53994a69daeb", "Maya Lin-Perez Urban Agroecology Director"),
                tags: ["Permaculture", "Compost", "Food Justice"],
              },
              {
                name: "Jamal Washington",
                role: "Civic Fellowship Lead",
                department: "Youth Programs",
                bio: "Former youth advocate and city council policy fellow; trained 850+ first-time youth community organizers.",
                photo: photo("1507003211169-0a1dd7228f2d", "Jamal Washington Civic Fellowship Lead"),
                tags: ["Civic Leadership", "Mentorship", "Policy"],
              },
              {
                name: "Soraya Chen",
                role: "Energy Cooperative Engineer",
                department: "Microgrid Initiative",
                bio: "Renewable energy specialist designing community-owned microgrids and battery storage systems for low-income neighborhoods.",
                photo: photo("1517841905240-472988babdf9", "Soraya Chen Energy Cooperative Engineer"),
                tags: ["Solar Power", "Battery Storage", "Co-ops"],
              },
              {
                name: "David O'Connor",
                role: "Circular Economy Coordinator",
                department: "Tool Libraries & Repair",
                bio: "Craftsman and open-source hardware advocate managing our network of 12 community tool lending libraries.",
                photo: photo("1539571696357-5a69c17a67c6", "David O'Connor Tool Library Coordinator"),
                tags: ["Repair", "Upcycling", "Tool Library"],
              },
            ],
          },
          { background: "surface" },
        ),
        section(
          "pricing",
          {
            variant: "spotlight-tier",
            eyebrow: "Support the Movement",
            heading: "Accessible Membership for Every Neighbor",
            intro: "Participation is always free. Voluntary monthly dues power our micro-grant fund for grassroots community projects.",
            columns: 3,
            plans: [
              {
                name: "Community Member",
                price: "$0",
                period: "Forever Free",
                badge: "Free Access",
                description: "Full access to volunteer workdays, community tool libraries, seed exchanges, and local chapter meetings.",
                features: [
                  "Access to local tool library & repair cafes",
                  "Free seeds and gardening workshops",
                  "Voting rights in monthly chapter assemblies",
                  "Access to community Discord & forum",
                ],
                featured: false,
                cta: { label: "Join for Free", href: "/contact" },
              },
              {
                name: "Active Sustainer",
                price: "$15",
                period: "Per Month",
                badge: "Most Popular",
                description: "Directly funds community tool purchases, native tree saplings, and youth organizer stipends.",
                features: [
                  "Everything in Community Member",
                  "100% of dues go to local chapter grant pool",
                  "Annual Collective impact print zine",
                  "Free admission to Annual Impact Summit",
                  "Sponsor one youth fellow workshop seat",
                ],
                featured: true,
                cta: { label: "Become Sustainer", href: "/contact" },
              },
              {
                name: "Circle Steward",
                price: "$45",
                period: "Per Month",
                badge: "Key Supporter",
                description: "For established neighbors and small local businesses dedicated to funding significant neighborhood infrastructure.",
                features: [
                  "All Active Sustainer benefits",
                  "Underwrite one microgrid feasibility study",
                  "Quarterly steward roundtable with founders",
                  "Special recognition in annual impact report",
                ],
                featured: false,
                cta: { label: "Join as Steward", href: "/contact" },
              },
            ],
          },
          { background: "default", anchor: "membership" },
        ),
        section(
          "faq",
          {
            variant: "categorized-cards",
            eyebrow: "Common Inquiries",
            heading: "Frequently Asked Questions",
            intro: "Find answers about joining, volunteering, or launching a new chapter in your neighborhood.",
            items: [
              {
                category: "Getting Involved",
                question: "How do I find or start a chapter in my town?",
                answer:
                  "Check our chapter locator directory. If your city doesn't have an active branch yet, you can apply to start a starter chapter with support, tool grants, and mentorship from our onboarding team.",
              },
              {
                category: "Volunteering",
                question: "Do I need special skills to volunteer?",
                answer:
                  "Not at all! Whether you are an experienced carpenter or someone who has never touched a trowel, our workdays are collaborative and beginner-friendly with skilled volunteer coaches on site.",
              },
              {
                category: "Grants",
                question: "How do community micro-grants work?",
                answer:
                  "Any group of 3+ neighbors can submit a 1-page proposal for up to $3,500 for neighborhood projects (gardens, solar, repair, youth). Grants are reviewed and voted on by local chapter members monthly.",
              },
              {
                category: "Nonprofit Status",
                question: "Is Solaria Collective a registered nonprofit?",
                answer:
                  "Yes, Solaria is a 501(c)(3) tax-exempt nonprofit organization. All donations, sustainer dues, and sponsorships are tax-deductible to the fullest extent of the law.",
              },
            ],
          },
          { background: "surface" },
        ),
        section(
          "cta",
          {
            variant: "centered-card",
            eyebrow: "Every Neighborhood Counts",
            heading: "Be the reason your neighborhood thrives in 2026",
            text: "Join 28,000+ neighbors already building resilient, green, and joyful communities. It starts with one afternoon.",
            button: { label: "Find Your Local Chapter", href: "/about" },
            secondaryButton: { label: "Sign Up for Newsletter", href: "/contact" },
          },
          { background: "default" },
        ),
      ],
    },
    {
      name: "Initiatives",
      slug: "/courses",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Our Action Framework",
          heading: "Six Grassroots Programs Transforming Neighborhoods",
          subheading: "Explore each initiative's blueprints, open-source toolkits, and how your neighborhood can implement them.",
          primaryCta: { label: "Download Community Playbook", href: "/contact" },
          secondaryCta: { label: "Join a Project Team", href: "/contact" },
        }),
        section(
          "services",
          {
            variant: "cards-grid",
            eyebrow: "Action Pillars",
            heading: "All Active Initiatives",
            intro: "Comprehensive resources, volunteer schedules, and toolkits for each community focus area.",
            columns: 3,
            mobileColumns: 1,
            items: [
              {
                title: "Urban Food Forests & Agroecology",
                description: "Over 48,000 native fruit trees, berry bushes, and pollinator plants established across 24 public parks and vacant lots.",
                badge: "Agroecology",
                features: ["Zero chemical pesticides", "Public harvest calendars", "Permaculture workshops"],
              },
              {
                title: "Community Solar Microgrid Cooperatives",
                description: "Neighborhood microgrids ensuring uninterrupted emergency power and lowering tenant electricity costs by an average of 34%.",
                badge: "Clean Energy",
                features: ["Tenant-owned solar panels", "Emergency battery backup", "Zero-interest financing"],
              },
              {
                title: "Youth Civic Leadership Academy",
                description: "Training the next generation of municipal leaders, climate advocates, and community organizers with paid semester fellowships.",
                badge: "Youth",
                features: ["$1,500 semester stipends", "City hall shadow days", "Public campaign design"],
              },
            ],
          },
          { background: "surface" },
        ),
      ],
    },
    {
      name: "About",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "About Solaria Collective",
          heading: "A decentralized, community-owned movement for grassroots resilience",
          subheading: "Founded in 2021 by a group of neighborhood organizers, Solaria has grown into a global network of 140+ municipal chapters.",
          primaryCta: { label: "Read Our 2026 Charter", href: "/contact" },
        }),
        section(
          "features",
          {
            variant: "cards",
            eyebrow: "The Movement",
            heading: "Our Principles of Action",
            intro: "How we ensure our collective remains accountable, democratic, and radical in its care.",
            columns: 3,
            mobileColumns: 1,
            items: [
              {
                icon: "heart",
                title: "Radical Inclusivity",
                description: "Everyone is welcome at the table, regardless of background, technical skills, or financial means.",
              },
              {
                icon: "shield",
                title: "Open Knowledge",
                description: "All blueprints, microgrid schematics, and curriculum materials are licensed under Creative Commons for free use.",
              },
              {
                icon: "bolt",
                title: "Mutual Care",
                description: "We show up for our neighbors in times of both everyday need and climate crisis with immediate, tangible support.",
              },
            ],
          },
          { background: "surface" },
        ),
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "cards-hub",
          eyebrow: "Get Connected",
          heading: "Reach Out to Solaria Collective",
          text: "Looking to connect with your local chapter, donate materials to a tool library, or partner with us? We'd love to hear from you.",
          showForm: true,
          submitLabel: "Send Message",
          email: "hello@solariacollective.org",
          phone: "+1 (503) 914-2200",
          address: "1204 SE Water Ave, Portland, OR",
          officeHours: "Tue-Sat: 10am - 6pm PST",
          channels: [
            { label: "General Inquiries", value: "hello@solariacollective.org", icon: "mail" },
            { label: "Chapter Support", value: "chapters@solariacollective.org", icon: "user" },
            { label: "Community Hotline", value: "+1 (503) 914-2200", icon: "phone" },
          ],
        }),
      ],
    },
  ],
});
