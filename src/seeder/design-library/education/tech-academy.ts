import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "../business/build.js";
import { TECH_ACADEMY_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "glass-dock",
  siteName: NAME,
  logo: TECH_ACADEMY_LOGO,
  logoDisplay: "logo_only",
  menu: [
    { label: "Curriculum", href: "/courses" },
    { label: "Admissions", href: "/admissions" },
    { label: "Mentors", href: "/#mentors" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Apply for Fellowship", href: "/admissions" },
  announcement: "Spring 2026 Cohort Applications Closing Soon — 8 Seats Remaining",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "cta-banner",
  siteName: NAME,
  logo: TECH_ACADEMY_LOGO,
  description:
    "Quantum Tech Academy is a next-generation engineering fellowship training senior AI researchers, distributed systems architects, and modern engineering leaders.",
  ctaBanner: {
    enabled: true,
    heading: "Ready to accelerate into staff-level engineering?",
    subheading: "Join 1,200+ alumni deployed at OpenAI, Stripe, Google DeepMind, and high-growth AI startups.",
    primaryCta: { label: "Start Application", href: "/admissions" },
    secondaryCta: { label: "Browse Curriculum", href: "/courses" },
  },
  columns: [
    {
      title: "Programs",
      links: [
        { label: "Generative AI Systems", href: "/courses" },
        { label: "Distributed Infrastructure", href: "/courses" },
        { label: "Autonomous Agents", href: "/courses" },
        { label: "Full-Stack Next-Gen", href: "/courses" },
      ],
    },
    {
      title: "Fellowship",
      links: [
        { label: "Admissions & Tuition", href: "/admissions" },
        { label: "Scholarships & ISAs", href: "/admissions" },
        { label: "Mentor Network", href: "/#mentors" },
        { label: "Alumni Outcomes", href: "/#outcomes" },
      ],
    },
  ],
  contact: {
    email: "admissions@quantumacademy.tech",
    phone: "+1 (415) 802-9910",
    address: "555 Mission St, Suite 2400, San Francisco, CA",
  },
  social: [
    { label: "GitHub", href: "https://github.com" },
    { label: "Twitter", href: "https://x.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "Discord", href: "https://discord.com" },
  ],
  copyright: `© 2026 ${NAME}. Advancing open technical intelligence.`,
};

export const TECH_ACADEMY: BusinessTemplate = businessTemplate({
  key: "tech-academy-indigo",
  name: "Tech Academy · Indigo",
  category: "Education",
  description:
    "A premier AI & distributed systems engineering fellowship with live cohort telemetry, interactive curriculum tracks, mentor networks, and admissions financing.",
  themeName: "Quantum Indigo Dark",
  theme: {
    colors: {
      primary: "#6366F1",
      secondary: "#06B6D4",
      background: "#090D1A",
      surface: "#111827",
      text: "#F3F4F6",
      muted: "#9CA3AF",
    },
    fonts: { heading: "sora", body: "jetbrains-mono" },
    buttonStyle: "filled",
    cardStyle: "border",
    radius: "md",
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
          variant: "floating-cards",
          eyebrow: "Engineering Fellowship & Research Lab",
          badgeIcon: "⚡",
          heading: "The master fellowship for senior engineers & AI builders",
          highlightText: "senior engineers & AI builders",
          subheading:
            "Intensive 12-week cohorts in generative AI architecture, large-scale distributed systems, and modern edge infrastructure taught by staff engineers.",
          primaryCta: { label: "Apply for Spring Cohort", href: "/admissions" },
          secondaryCta: { label: "View Curriculum", href: "/courses" },
          floatingCards: [
            {
              title: "Active Cohort",
              subtitle: "24 Fellows · 8 Staff Mentors",
              badge: "Live",
              icon: "rocket",
            },
            {
              title: "Placement Rate",
              subtitle: "94% at Tier-1 Tech & AI Labs",
              badge: "Verified",
              icon: "chart",
            },
            {
              title: "Avg Comp",
              subtitle: "$182k Median Base + Equity",
              badge: "2026",
              icon: "wallet",
            },
          ],
        }),
        section(
          "marquee",
          {
            variant: "cards-stream",
            items: [
              { text: "PyTorch & TensorRT LLM Ops", badge: "AI Core" },
              { text: "Distributed Concurrency in Go & Rust", badge: "Systems" },
              { text: "Kubernetes Cloud-Native Orch", badge: "DevOps" },
              { text: "Autonomous Multi-Agent Swarms", badge: "Agents" },
              { text: "Postgres pgvector & Vector Search", badge: "Data" },
              { text: "WASM & Edge Computing Runtimes", badge: "Edge" },
            ],
            speed: "normal",
            pauseOnHover: true,
          },
          { background: "surface", spacing: "compact" },
        ),
        section(
          "services",
          {
            variant: "bento-grid",
            eyebrow: "Accelerated Specializations",
            heading: "Four Industry-Calibrated Engineering Tracks",
            intro:
              "Engineered from the ground up to bridge the chasm between textbook tutorials and mission-critical production architecture.",
            columns: 3,
            mobileColumns: 1,
            items: [
              {
                title: "Generative AI Systems & Agent Swarms",
                description:
                  "Train, fine-tune, and deploy production LLM pipelines. Master LoRA, vLLM inference optimization, RAG retrieval routers, and multi-agent consensus protocols.",
                badge: "12 Weeks · 8 Capstones",
                duration: "Full-Time or Evenings",
                price: "Cohort 14",
                features: [
                  "Distributed model fine-tuning with DeepSpeed",
                  "Sub-50ms streaming inference endpoints",
                  "Graph-based vector retrieval with Hybrid Search",
                ],
                image: photo("1526374965328-7f61d4dc18c5", "Generative AI Code Terminal and Neural Graph"),
              },
              {
                title: "Distributed Infrastructure & Cloud Scale",
                description:
                  "Architect fault-tolerant systems handling 1M+ req/sec. Implement Raft consensus, Kafka streaming topology, zero-downtime DB migrations, and eBPF observability.",
                badge: "10 Weeks · 6 Capstones",
                duration: "Go & Rust Focus",
                price: "Cohort 12",
                features: [
                  "Custom Raft cluster implementation in Go",
                  "Event-driven architecture with Redpanda & Kafka",
                  "Multi-region failover and active-active setups",
                ],
                image: photo("1555066931-4365d14bab8c", "Distributed Cloud Cluster and Server Dashboard"),
              },
              {
                title: "Full-Stack Next-Gen & Reactive Web",
                description:
                  "Build high-performance web applications using Next.js 15, WebGL 3D canvases, server-sent events, and WebAssembly micro-engines.",
                badge: "8 Weeks · 4 Capstones",
                duration: "TypeScript & Rust",
                price: "Cohort 9",
                features: [
                  "React Server Components & streaming SSR",
                  "Interactive 3D canvas with Three.js / WebGPU",
                  "Optimistic offline sync with local SQLite/CRDTs",
                ],
                image: photo("1517694712202-14dd9538aa97", "Modern Full-Stack Code Editor on MacBook Pro"),
              },
            ],
          },
          { background: "default" },
        ),
        section(
          "stats",
          {
            heading: "Real Impact Proven by Fellowship Data",
            intro: "Our graduates don't just find jobs; they build the infrastructure that defines the modern web.",
            items: [
              { value: "94%", label: "Senior Job Placement within 90 Days" },
              { value: "$182,000", label: "Median Starting Compensation" },
              { value: "450+", label: "Hiring Partners & Venture Backers" },
              { value: "4.95 / 5", label: "Fellow Satisfaction Rating" },
            ],
          },
          { background: "surface", anchor: "outcomes" },
        ),
        section(
          "features",
          {
            variant: "grid",
            eyebrow: "The Quantum Advantage",
            heading: "How We Build Senior Engineering Capability",
            intro: "Designed for ambitious developers who learn fastest by building real production software.",
            columns: 4,
            mobileColumns: 1,
            items: [
              {
                icon: "bolt",
                iconColor: "indigo",
                title: "1:1 Staff Mentorship",
                description: "Weekly architecture reviews and code audits with Staff Engineers from top Silicon Valley tech companies.",
              },
              {
                icon: "code",
                iconColor: "cyan",
                title: "Production Infrastructure",
                description: "Each fellow receives dedicated GPU clusters and AWS/GCP credits to deploy live, high-traffic systems.",
              },
              {
                icon: "shield",
                iconColor: "blue",
                title: "Zero-to-One Capstone",
                description: "Build an open-source tool or commercial prototype reviewed by venture capitalists and engineering directors.",
              },
              {
                icon: "rocket",
                iconColor: "purple",
                title: "Lifetime Alumni Network",
                description: "Private Discord, invite-only hackathons, continuing education masterclasses, and executive angel syndicates.",
              },
            ],
          },
          { background: "default" },
        ),
        section(
          "team",
          {
            variant: "grid-cards",
            eyebrow: "Faculty & Resident Fellows",
            heading: "Taught Exclusively by Active Staff Engineers",
            intro: "Learn directly from the builders shipping the infrastructure and models used by millions.",
            columns: 4,
            mobileColumns: 1,
            members: [
              {
                name: "Dr. Elena Rostova",
                role: "Director of AI Systems",
                department: "Generative AI Track",
                bio: "Former Staff Research Scientist at DeepMind; author of leading papers on sparse attention mechanisms.",
                photo: photo("1573496359142-b8d87734a5a2", "Dr. Elena Rostova Staff AI Researcher"),
                tags: ["LLMOps", "PyTorch", "vLLM"],
              },
              {
                name: "Marcus Thorne",
                role: "Principal Infrastructure Architect",
                department: "Distributed Systems Track",
                bio: "Ex-Stripe Core Infra Lead; scaled global ledger pipelines processing 45k transactions per second.",
                photo: photo("1507003211169-0a1dd7228f2d", "Marcus Thorne Principal Infrastructure Architect"),
                tags: ["Go", "Kafka", "Kubernetes"],
              },
              {
                name: "Amina Al-Mansoor",
                role: "VP of Developer Experience",
                department: "Full-Stack Web Track",
                bio: "Vercel alumni, core contributor to open-source UI toolkits and streaming client engines.",
                photo: photo("1534528741775-53994a69daeb", "Amina Al-Mansoor VP of Developer Experience"),
                tags: ["Next.js", "WebGPU", "TypeScript"],
              },
              {
                name: "Kaelen Chen",
                role: "Head of Autonomous Agents",
                department: "Agent Systems Lab",
                bio: "Robotics and reinforcement learning researcher with 12 published patents in multi-agent routing.",
                photo: photo("1500648767791-00dcc994a43e", "Kaelen Chen Head of Autonomous Agents"),
                tags: ["RLHF", "LangGraph", "Python"],
              },
            ],
          },
          { background: "surface", anchor: "mentors" },
        ),
        section(
          "pricing",
          {
            variant: "spotlight-tier",
            eyebrow: "Investment & Financing",
            heading: "Transparent Fellowship Tuition Options",
            intro: "We align our incentives with your success. Choose upfront tuition, deferred financing, or corporate sponsorship.",
            columns: 3,
            plans: [
              {
                name: "Upfront Fellowship",
                price: "$4,800",
                period: "Full Program",
                badge: "Best Value",
                description: "Single payment saving $1,200 compared to installment plans. Includes lifetime alumni access.",
                features: [
                  "12 Weeks full live cohort access",
                  "Dedicated 1:1 weekly mentor",
                  "$500 GPU cloud credits included",
                  "Portfolio code review by CTOs",
                  "Lifetime Discord & community",
                ],
                featured: false,
                cta: { label: "Apply with Upfront", href: "/admissions" },
              },
              {
                name: "Income Share Agreement",
                price: "$0",
                period: "Until You Get Hired",
                badge: "Most Popular",
                description: "Pay nothing upfront. Only pay back 9% of salary after securing a role paying $100k+.",
                features: [
                  "Zero upfront tuition barrier",
                  "Cap set at 1.4x standard tuition",
                  "Protected by salary minimum threshold",
                  "Full access to career placement team",
                  "Mock interviews with Hiring Managers",
                  "Priority capstone sponsor matching",
                ],
                featured: true,
                cta: { label: "Apply for ISA Track", href: "/admissions" },
              },
              {
                name: "Enterprise Sponsored",
                price: "$6,500",
                period: "Per Engineer",
                badge: "Corporate",
                description: "For teams upskilling staff engineers into generative AI and distributed architectures.",
                features: [
                  "Company expense reimbursement invoice",
                  "Custom capstone tailored to company stack",
                  "Quarterly progress telemetry to manager",
                  "Executive mentor alignment",
                  "Dedicated Slack channel with faculty",
                ],
                featured: false,
                cta: { label: "Inquire for Teams", href: "/contact" },
              },
            ],
          },
          { background: "default" },
        ),
        section(
          "faq",
          {
            variant: "accordion-classic",
            eyebrow: "Admissions & Logistics",
            heading: "Frequently Asked Questions",
            intro: "Everything you need to know about eligibility, technical rigor, and scheduling.",
            items: [
              {
                category: "Admissions",
                question: "What are the technical prerequisites for the fellowship?",
                answer:
                  "Candidates should have at least 2+ years of professional software engineering experience in any language (Go, Python, TypeScript, Rust, C++), and a working knowledge of data structures, API protocols, and basic Git workflows.",
              },
              {
                category: "Commitment",
                question: "How many hours per week are required?",
                answer:
                  "The full-time track requires 35-40 hours weekly including lectures, lab pair programming, and capstone sprints. The part-time evening track is designed for working engineers at 12-15 hours per week.",
              },
              {
                category: "Financing",
                question: "How does the Income Share Agreement (ISA) work?",
                answer:
                  "Under our ISA, you pay $0 upfront. Once you graduate and secure a qualifying role earning $100,000+ per year, you pay 9% of your monthly gross income for 24 months, with an absolute maximum payment cap.",
              },
              {
                category: "Outcomes",
                question: "What kind of career placement support is provided?",
                answer:
                  "Fellows undergo technical resume surgery, live system design whiteboarding drills, compensation negotiation workshops, and direct executive introductions to engineering managers across our 450+ partner network.",
              },
            ],
          },
          { background: "surface" },
        ),
        section(
          "cta",
          {
            variant: "centered-card",
            eyebrow: "Spring Cohort Starting Soon",
            heading: "Take your place among the next generation of staff engineers",
            text: "Admissions are evaluated on a rolling basis. Submit your application today to lock in early mentor matching.",
            button: { label: "Submit Application Now", href: "/admissions" },
            secondaryButton: { label: "Schedule Advisor Call", href: "/contact" },
            trustBadges: ["Zero Risk Application", "Takes 10 Minutes", "Selective Cohorts"],
          },
          { background: "default" },
        ),
      ],
    },
    {
      name: "Curriculum",
      slug: "/courses",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Academic Syllabus",
          heading: "Rigorous, production-tested curricula for modern engineers",
          subheading: "Browse our 12-week comprehensive syllabi designed by Silicon Valley staff engineers and AI researchers.",
          primaryCta: { label: "Download Full PDF Syllabus", href: "/contact" },
          secondaryCta: { label: "Apply for Fellowship", href: "/admissions" },
        }),
        section(
          "services",
          {
            variant: "horizontal-cards",
            eyebrow: "Core Modules",
            heading: "Detailed Course Breakdown",
            intro: "Deep dive into each technical module, code repositories, and weekly capstone deliverables.",
            columns: 3,
            mobileColumns: 1,
            items: [
              {
                title: "Module 1: Large Language Model Architecture",
                description: "Transformers from scratch, flash attention mechanisms, quantization (AWQ/GPTQ), and fine-tuning with LoRA/QLoRA.",
                badge: "Weeks 1-3",
                price: "PyTorch",
                features: ["Attention mechanisms code implementation", "Distributed training with FSDP", "Evaluation benchmarks (MMLU, GSM8K)"],
              },
              {
                title: "Module 2: High-Performance Vector Retrieval & RAG",
                description: "Embedding architectures, HNSW graphs, hybrid search rerankers, semantic caching, and streaming agent routers.",
                badge: "Weeks 4-6",
                price: "pgvector & Rust",
                features: ["Dense and sparse hybrid scoring", "Context compression pipelines", "Evaluation of hallucination rates"],
              },
              {
                title: "Module 3: Distributed Consensus & Edge Orchestration",
                description: "Building Raft consensus from first principles, fault injection with Jepsen, and multi-region Kubernetes deployments.",
                badge: "Weeks 7-9",
                price: "Go & Docker",
                features: ["Leader election and log replication", "Chaos engineering drills", "Telemetry with Prometheus and OpenTelemetry"],
              },
              {
                title: "Module 4: Autonomous Agent Swarms & Tool Use",
                description: "Stateful agents with LangGraph, tool-calling schema validation, memory distillation, and sandboxed code execution.",
                badge: "Weeks 10-12",
                price: "Python & Docker",
                features: ["Multi-agent debate protocols", "Sandboxed Python execution", "Production deployment on modal/fly.io"],
              },
            ],
          },
          { background: "surface" },
        ),
        section(
          "cta",
          {
            variant: "centered-card",
            heading: "Have questions about course modules or technical depth?",
            text: "Chat with a technical admissions counselor to review your current tech stack and background.",
            button: { label: "Book 15-Min Syllabus Review", href: "/contact" },
          },
          { background: "default" },
        ),
      ],
    },
    {
      name: "Admissions",
      slug: "/admissions",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Rolling Admissions",
          heading: "Join our selective community of engineering fellows",
          subheading: "We evaluate candidates based on curiosity, past projects, code quality, and potential for rapid growth.",
          primaryCta: { label: "Begin Online Application", href: "/contact" },
          secondaryCta: { label: "Review Financing Options", href: "/admissions" },
        }),
        section(
          "features",
          {
            variant: "cards",
            eyebrow: "The 3-Step Process",
            heading: "How Fellowship Admissions Work",
            intro: "A streamlined, respectful process with fast turnarounds at every step.",
            columns: 3,
            mobileColumns: 1,
            items: [
              {
                icon: "chat",
                iconColor: "indigo",
                title: "1. Online Application",
                description: "Share your background, GitHub profile, and a brief statement on why you want to master AI systems (10 mins).",
              },
              {
                icon: "code",
                iconColor: "cyan",
                title: "2. Technical Take-Home Sprint",
                description: "A pragmatic 90-minute asynchronous coding challenge reflecting real production systems, not leetcode riddles.",
              },
              {
                icon: "user",
                iconColor: "purple",
                title: "3. Architecture Interview",
                description: "A 30-minute collaborative design session with a faculty mentor to discuss your code and career trajectory.",
              },
            ],
          },
          { background: "surface" },
        ),
        section(
          "contact",
          {
            variant: "split-form",
            eyebrow: "Apply Today",
            heading: "Submit Your Fellowship Application",
            text: "Fill out the initial application below. You will receive take-home instructions within 24 business hours.",
            showForm: true,
            submitLabel: "Submit Application",
            email: "admissions@quantumacademy.tech",
            phone: "+1 (415) 802-9910",
            address: "555 Mission St, San Francisco, CA",
            officeHours: "Mon-Fri: 9am - 6pm PST",
          },
          { background: "default" },
        ),
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "cards-hub",
          eyebrow: "Get In Touch",
          heading: "Connect with the Quantum Admissions Office",
          text: "Have inquiries about corporate sponsorships, customized team cohorts, or academic partnerships? We are here to assist.",
          showForm: true,
          submitLabel: "Send Inquiry",
          email: "admissions@quantumacademy.tech",
          phone: "+1 (415) 802-9910",
          address: "555 Mission St, Suite 2400, San Francisco, CA",
          officeHours: "Mon-Fri: 9am - 6pm PST",
          channels: [
            { label: "Admissions Inquiries", value: "admissions@quantumacademy.tech", icon: "mail" },
            { label: "Enterprise Upskilling", value: "enterprise@quantumacademy.tech", icon: "phone" },
            { label: "Community Discord", value: "discord.gg/quantum-academy", icon: "chat" },
          ],
        }),
      ],
    },
  ],
});
