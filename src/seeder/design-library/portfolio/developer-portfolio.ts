import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "../business/build.js";
import { DEVELOPER_PORTFOLIO_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "logo-left",
  siteName: NAME,
  logo: DEVELOPER_PORTFOLIO_LOGO,
  logoDisplay: "logo_only",
  menu: [
    { label: "Overview", href: "/" },
    { label: "Systems & Code", href: "/portfolio" },
    { label: "Architecture & Bio", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "View GitHub", href: "https://github.com" },
  secondaryCta: { label: "Consultation", href: "/contact" },
  announcement: "Shipped Turbocache v3.2 — 1.2M RPS on Edge Workers",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  logo: DEVELOPER_PORTFOLIO_LOGO,
  tagline: "Staff Systems & Distributed Infrastructure Engineer",
  description: "Engineering fault-tolerant distributed backends, high-throughput edge runtimes, and developer infrastructure. Built for reliability.",
  columns: [
    {
      title: "Navigation",
      links: [
        { label: "Overview", href: "/" },
        { label: "Production Systems", href: "/portfolio" },
        { label: "Architecture Bio", href: "/about" },
        { label: "Consultation", href: "/contact" },
      ],
    },
    {
      title: "Open Source",
      links: [
        { label: "Turbocache CLI", href: "https://github.com" },
        { label: "Go-Raft-Cluster", href: "https://github.com" },
        { label: "Next-Edge-Kit", href: "https://github.com" },
      ],
    },
  ],
  contact: {
    email: "marcus@bluewavedev.com",
    phone: "+1 (206) 555-0149",
    address: "Seattle, WA · Available Globally",
  },
  social: [
    { label: "GitHub", href: "https://github.com" },
    { label: "Twitter", href: "https://x.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
  copyright: `© 2026 ${NAME}. Open source tools licensed under MIT.`,
};

export const DEVELOPER_PORTFOLIO: BusinessTemplate = businessTemplate({
  key: "developer-portfolio-ocean",
  name: "Developer Portfolio · Ocean",
  category: "Portfolio",
  description: "A precision tech engineering portfolio with high-throughput architecture case studies, terminal previews, open-source repositories, and advisory channels.",
  themeName: "Bluewave Ocean Tech",
  theme: {
    colors: {
      primary: "#0066FF",
      secondary: "#00C2FF",
      background: "#F4F8FC",
      surface: "#E8F1FC",
      text: "#091E3A",
      muted: "#4D6482",
    },
    fonts: { heading: "space-grotesk", body: "geist" },
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
          variant: "split",
          eyebrow: "Staff Full-Stack & Distributed Systems Engineer",
          heading: "Building high-throughput platforms, real-time engines, and distributed web infrastructure",
          highlightText: "distributed web infrastructure",
          subheading: "I design resilient backends in Go & Rust, reactive frontends in Next.js & WebGL, and open-source developer tools used by 45,000+ engineers worldwide.",
          primaryCta: { label: "Explore Production Systems", href: "/portfolio" },
          secondaryCta: { label: "Technical Bio", href: "/about" },
          image: photo("1555066931-4365d14bab8c", "Marcus Chen engineering workstation running terminal and code"),
          imageStyle: "plain",
        }),
        section(
          "marquee",
          {
            variant: "pill-badges",
            items: [
              { text: "Go (Golang)" },
              { text: "Rust" },
              { text: "TypeScript / Next.js" },
              { text: "PostgreSQL & pgvector" },
              { text: "Kubernetes & Docker" },
              { text: "Kafka / Redis Streams" },
              { text: "GraphQL & gRPC" },
              { text: "Cloudflare Workers / WASM" },
              { text: "Distributed Consensus (Raft)" },
            ],
            speed: "normal",
            pauseOnHover: true,
          },
          { background: "surface", spacing: "compact" },
        ),
        section("services", {
          variant: "horizontal-cards",
          eyebrow: "Engineered Systems",
          heading: "Featured Production Deployments",
          intro: "A collection of high-load platforms, edge caches, and open-source infrastructure projects.",
          columns: 3,
          mobileColumns: 1,
          items: [
            {
              title: "HyperScale Edge: Global Cache",
              description: "Engineered an in-memory edge caching proxy processing 1.2M req/sec with sub-5ms P99 latency across 240 global PoPs.",
              badge: "Rust / WASM",
              duration: "1.2M RPS",
              price: "P99 < 5ms",
              features: [
                "Sub-5ms global latency",
                "Zero-alloc serialization",
                "Live health telemetry probes",
              ],
            },
            {
              title: "SyncStream: Real-time Engine",
              description: "CRDT-based conflict-free data synchronization engine supporting 50,000 concurrent socket connections per node.",
              badge: "Go / WebSocket",
              duration: "50k Conns",
              price: "Zero Data Loss",
              features: [
                "State-based CRDT logic",
                "Redis cluster pub/sub mesh",
                "End-to-end encrypted packets",
              ],
            },
            {
              title: "VectorMesh: Serverless Search",
              description: "High-performance vector search engine indexing 80M vectors with hybrid BM25 and cosine distance algorithms.",
              badge: "TypeScript / pgvector",
              duration: "80M Vectors",
              price: "12ms Query",
              features: [
                "Hybrid search ranking",
                "Bespoke HNSW graph indexing",
                "Automated re-sharding",
              ],
            },
          ],
        }),
        section("features", {
          variant: "grid",
          eyebrow: "Engineering Disciplines",
          heading: "Core Technical Competencies",
          columns: 3,
          mobileColumns: 1,
          items: [
            {
              icon: "code",
              iconColor: "blue",
              title: "Distributed Systems Architecture",
              description: "Designing fault-tolerant, horizontally scalable microservices capable of surviving network partitions and region failovers.",
            },
            {
              icon: "rocket",
              iconColor: "cyan",
              title: "Full-Stack Web Performance",
              description: "Obsessive sub-second TTFB, edge compute routing, code splitting, and zero-layout-shift UI engineering with Next.js & React.",
            },
            {
              icon: "lock",
              iconColor: "indigo",
              title: "Security, Auth & Compliance",
              description: "Zero-trust IAM protocols, OAuth2/OIDC, cryptographically signed JWT sessions, and SOC2 / HIPAA compliant system audit logging.",
            },
            {
              icon: "cloud",
              iconColor: "blue",
              title: "Cloud Native & DevOps",
              description: "Infrastructure as Code via Terraform, Kubernetes orchestration, automated canary rollouts, and GitOps CI/CD pipelines.",
            },
            {
              icon: "chart",
              iconColor: "green",
              title: "Observability & Profiling",
              description: "End-to-end distributed tracing via OpenTelemetry, Prometheus alerting, flame graphs, and heap memory leak diagnosis.",
            },
            {
              icon: "sparkles",
              iconColor: "purple",
              title: "AI/ML Model Serving & RAG",
              description: "Low-latency inference pipelines, semantic vector search, streaming token responders, and custom fine-tuning orchestration.",
            },
          ],
        }),
        section(
          "stats",
          {
            heading: "Engineering At Scale",
            intro: "Operational numbers from production deployments and open-source ecosystems.",
            items: [
              { value: "99.999%", label: "System Uptime Maintained" },
              { value: "48k+", label: "GitHub Stars Across Repos" },
              { value: "14M+", label: "Monthly NPM Downloads" },
              { value: "1.8B+", label: "Daily API Calls Handled" },
            ],
          },
          { background: "surface" },
        ),
        section(
          "testimonials",
          {
            heading: "Peer & Executive Endorsements",
            items: [
              {
                quote: "Marcus took our distributed payment pipeline from constant weekend outages to 99.999% uptime while slashing our AWS bill by $65,000 a month.",
                name: "David Vance",
                role: "CTO, CloudPay Global",
              },
              {
                quote: "The cleanest Go codebase I have ever reviewed. His architectural blueprints set the gold standard for our entire engineering team of 120 developers.",
                name: "Dr. Aris Thorne",
                role: "VP of Infrastructure, Nexus Data",
              },
              {
                quote: "Marcus does not just write code; he thinks like a founding engineer. His speed from zero to working prototype is simply unprecedented.",
                name: "Leila Mirani",
                role: "General Partner, Horizon Edge Ventures",
              },
            ],
          },
          { background: "surface" },
        ),
        section("cta", {
          variant: "centered-card",
          eyebrow: "Technical Consultation",
          heading: "Looking for a Staff Engineer or Technical Advisor?",
          text: "Available for architecture audits, performance deep dives, and interim engineering leadership for high-growth tech companies.",
          button: { label: "Schedule Architecture Review", href: "/contact" },
          secondaryButton: { label: "Review Open Source Code", href: "/portfolio" },
        }),
      ],
    },
    {
      name: "Systems & Code",
      slug: "/portfolio",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Repositories & Systems",
          heading: "Open Source Tools & Production Code",
          subheading: "A catalog of libraries, frameworks, and architecture blueprints maintained in public repositories.",
        }),
        section("services", {
          eyebrow: "Code & Blueprints",
          heading: "Featured Repositories",
          variant: "bento-grid",
          columns: 3,
          mobileColumns: 1,
          items: [
            {
              title: "Turbocache CLI",
              description: "Blazing-fast distributed compilation cache for monorepos written in Rust, cutting CI build times by 78%.",
              badge: "24.5k Stars",
              duration: "Rust / CLI",
              price: "v3.2",
              features: [
                "Cross-platform static binary",
                "S3 & GCS remote cache sync",
                "Zero config project detection",
              ],
            },
            {
              title: "Go-Raft-Cluster",
              description: "Educational and production-ready implementation of the Raft consensus protocol in pure idiomatic Go.",
              badge: "8.2k Stars",
              duration: "Go / Raft",
              price: "v1.8",
              features: [
                "Leader election and heartbeats",
                "Snapshot compaction engine",
                "Chaos monkey failure tested",
              ],
            },
            {
              title: "Next-Edge-Kit",
              description: "Opinionated boilerplate for building multi-tenant SaaS applications on Cloudflare Workers and Edge KV.",
              badge: "15.4k Stars",
              duration: "TypeScript / Next",
              price: "v4.0",
              features: [
                "Multi-tenant edge authentication",
                "Global rate limiting middleware",
                "Stripe billing webhook sync",
              ],
            },
          ],
        }),
        section("gallery", {
          heading: "Architecture Blueprints & System Diagrams",
          columns: 3,
          mobileColumns: 1,
          images: [
            photo("1555066931-4365d14bab8c", "Developer terminal running Go microservices"),
            photo("1558494949-ef010cbdcc31", "Server rack data center infrastructure"),
            photo("1526374965328-7f61d4dc18c5", "TypeScript IDE code review"),
            photo("1522071820081-009f0129c71c", "System architecture engineering team"),
            photo("1518770660439-4636190af475", "Silicon chip microarchitecture"),
            photo("1498050108023-c5249f4df085", "Multi-monitor dev setup with logs"),
          ],
        }),
        section("cta", {
          variant: "floating-card",
          heading: "Explore public contributions on GitHub",
          text: "Over 2,400 commits in the last 12 months across open-source runtimes, parsers, and distributed consensus algorithms.",
          button: { label: "Visit GitHub Profile", href: "https://github.com" },
        }),
      ],
    },
    {
      name: "Architecture & Bio",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "split-left",
          eyebrow: "Engineer & Architect",
          heading: "Marcus Chen",
          subheading: "12+ years of engineering experience spanning distributed databases, cloud edge runtimes, and developer tooling.",
          primaryCta: { label: "Contact Marcus", href: "/contact" },
          image: photo("1507003211169-0a1dd7228f2d", "Marcus Chen software engineer portrait"),
        }),
        section("text", {
          heading: "Engineering Principles",
          body: "Software engineering is fundamentally about managing complexity under real-world constraints.\n\nI believe in small, composable primitives, explicit error handling over silent failures, and choosing boring technology where reliability matters most.\n\nOver the past twelve years, I have helped early-stage seed startups scale to hundreds of millions of requests, led migrations away from monolithic legacy stacks, and authored open-source libraries adopted by Fortune 500 engineering teams.",
        }),
        section("features", {
          variant: "cards",
          eyebrow: "Career Journey",
          heading: "Engineering Experience",
          columns: 3,
          mobileColumns: 1,
          items: [
            {
              icon: "cloud",
              iconColor: "blue",
              title: "Staff Systems Architect @ CloudEdge (2023 – Present)",
              description: "Spearheading global caching infrastructure and low-latency edge compute runtimes across 240 global datacenters.",
            },
            {
              icon: "chart",
              iconColor: "cyan",
              title: "Principal Backend Engineer @ ScaleData (2019 – 2023)",
              description: "Designed the real-time event streaming pipeline processing 1.8B records daily using Kafka, Go, and PostgreSQL.",
            },
            {
              icon: "code",
              iconColor: "indigo",
              title: "Senior Full-Stack Engineer @ FinStack (2015 – 2019)",
              description: "Built zero-downtime ledger migration engines and micro-frontend banking modules with React, GraphQL, and Node.",
            },
          ],
        }),
        section("logos", {
          heading: "Infrastructure & Ecosystems I Work With",
          grayscale: true,
          logos: [
            photo("1558494949-ef010cbdcc31", "Cloud infrastructure network", 400),
            photo("1555066931-4365d14bab8c", "Kubernetes cluster ecosystem", 400),
            photo("1526374965328-7f61d4dc18c5", "TypeScript runtime consortium", 400),
            photo("1518770660439-4636190af475", "WASM edge compute partner", 400),
          ],
        }),
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Engineering Advisory",
          heading: "Let's Connect",
          subheading: "Inquiries regarding technical advisory, system architecture reviews, speaking, or contract engineering.",
        }),
        section("contact", {
          variant: "split-form",
          eyebrow: "Contact Channel",
          heading: "Direct Communication",
          text: "Whether you're facing a critical scalability bottleneck, planning an architecture refactor, or want to sponsor an open-source tool, feel free to reach out.",
          email: "marcus@bluewavedev.com",
          phone: "+1 (206) 555-0149",
          address: "Seattle, WA · Available Globally",
          officeHours: "Monday – Friday, 08:00 – 18:00 PST",
          responseTime: "Under 24 hours",
          showForm: true,
          submitLabel: "Transmit Engineering Brief",
          serviceOptions: [
            "Distributed Systems Audit",
            "Performance & Latency Optimization",
            "Technical Due Diligence",
            "Open-Source Sponsorship",
            "Keynote / Tech Talk",
          ],
          channels: [
            {
              label: "Email",
              value: "marcus@bluewavedev.com",
              description: "Direct inbox for technical inquiries",
            },
            {
              label: "GitHub",
              value: "github.com/marcuschen-dev",
              description: "Public repositories and issue discussions",
            },
            {
              label: "Calendar",
              value: "cal.com/marcuschen",
              description: "Direct 30-min architecture consultation",
            },
          ],
        }),
        section(
          "faq",
          {
            variant: "categorized-cards",
            eyebrow: "Technical FAQ",
            heading: "Consultation & Collaboration Notes",
            intro: "Answers to common questions from CTOs, VPs of Engineering, and technical founders.",
            items: [
              {
                category: "Advisory",
                question: "What is your architecture review process?",
                answer: "A typical architecture audit takes 5 business days: 2 days of code and telemetry deep dive, 1 day of team interviews, and delivery of a comprehensive prioritized remediation roadmap.",
              },
              {
                category: "Advisory",
                question: "Do you sign non-disclosure agreements?",
                answer: "Yes, standard mutual NDAs are gladly signed prior to accessing private codebases, architecture diagrams, or cloud accounts.",
              },
              {
                category: "Speaking",
                question: "Are you available for conference talks or workshops?",
                answer: "Yes. I frequently present on Go concurrency patterns, distributed systems resilience, and web performance at tech conferences worldwide.",
              },
              {
                category: "Open Source",
                question: "Can our company sponsor custom features in your open-source tools?",
                answer: "Yes. Enterprise sponsorship tiers include prioritized feature requests, guaranteed SLA support, and architecture integration guidance.",
              },
            ],
          },
          { background: "surface" },
        ),
      ],
    },
  ],
});
