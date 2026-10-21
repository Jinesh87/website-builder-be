import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "../business/build.js";
import { SAAS_PLATFORM_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "floating",
  siteName: NAME,
  logo: SAAS_PLATFORM_LOGO,
  logoDisplay: "logo_only",
  menu: [
    { label: "Features", href: "/#features" },
    { label: "Architecture", href: "/#architecture" },
    { label: "Benchmarks", href: "/#benchmarks" },
    { label: "Pricing", href: "/#pricing" },
  ],
  cta: { label: "Deploy Cluster", href: "/#pricing" },
  announcement: "Nexus v4.2 Live — Sub-10ms Global Distributed Agent Routing",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  logo: SAAS_PLATFORM_LOGO,
  description:
    "Nexus AI is the autonomous infrastructure platform powering real-time multi-agent orchestration, ultra-low latency inference, and enterprise zero-trust model guardrails.",
  columns: [
    {
      title: "Platform",
      links: [
        { label: "Neural Routing", href: "/#features" },
        { label: "Agent Orchestration", href: "/#features" },
        { label: "Vector Pipeline", href: "/#features" },
        { label: "Edge Nodes", href: "/#benchmarks" },
      ],
    },
    {
      title: "Developers",
      links: [
        { label: "API Reference", href: "/#architecture" },
        { label: "SDK Client Libraries", href: "/#architecture" },
        { label: "Security & SOC2", href: "/#architecture" },
        { label: "Status Telemetry", href: "/#benchmarks" },
      ],
    },
    {
      title: "Solutions",
      links: [
        { label: "Enterprise AI", href: "/#pricing" },
        { label: "Financial Systems", href: "/#pricing" },
        { label: "Healthcare Data", href: "/#pricing" },
        { label: "Startups & Scaleups", href: "/#pricing" },
      ],
    },
  ],
  contact: {
    email: "enterprise@nexusai.io",
    phone: "+1 (415) 890-4412",
    address: "742 Montgomery St, Financial District, San Francisco, CA",
  },
  social: [
    { label: "GitHub", href: "https://github.com" },
    { label: "X", href: "https://x.com" },
    { label: "Discord", href: "https://discord.com" },
  ],
  legalLinks: [
    { label: "Privacy Policy", href: "/#architecture" },
    { label: "Terms of Service", href: "/#pricing" },
    { label: "Security Whitepaper", href: "/#architecture" },
  ],
  copyright: `© 2026 ${NAME}. Built for mission-critical intelligence.`,
};

export const SAAS_PLATFORM: BusinessTemplate = businessTemplate({
  key: "saas-platform-cyber",
  name: "Nexus AI · Cyber",
  category: "Landing page",
  description:
    "A dark, high-converting AI SaaS and cloud platform landing page featuring an interactive 3D curved banner carousel, live telemetry, and bento architecture grids.",
  themeName: "Nexus Cyber Dark",
  theme: {
    colors: {
      primary: "#6366F1",
      secondary: "#06B6D4",
      background: "#080B14",
      surface: "#10162A",
      text: "#F8FAFC",
      muted: "#94A3B8",
    },
    fonts: { heading: "sora", body: "inter" },
    buttonStyle: "filled",
    cardStyle: "shadow",
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
        // 1. High-Impact Hero with Live Status & Metric Pill
        section(
          "hero",
          {
            variant: "split",
            eyebrow: "Next-Gen Autonomous Agent Infrastructure",
            heading: "Autonomous AI infrastructure built for mission-critical workloads",
            highlightText: "mission-critical workloads",
            subheading:
              "Deploy high-throughput multi-agent swarms with deterministic guardrails, sub-millisecond neural routing, and unified memory pipelines across 180+ global edge locations.",
            primaryCta: { label: "Start Free Sandbox", href: "/#pricing" },
            secondaryCta: { label: "Explore Architecture", href: "/#architecture" },
            image: photo("1551288049-bebda4e38f71", "Nexus AI Real-time Telemetry Dashboard", 1200),
            imageStyle: "glow",
            rating: { stars: 5, text: "4.9/5 from 850+ enterprise engineering teams", avatarCount: 4 },
          },
          { background: "default" },
        ),

        // 2. Distinct Banner Carousel: 3D Curved Banner Carousel
        section(
          "carousel",
          {
            variant: "curved-banner",
            eyebrow: "Global Intelligence Mesh",
            heading: "Engineered for autonomous workflows at scale",
            intro: "Seamlessly route, execute, and verify agent swarms with zero infrastructure overhead.",
            autoPlay: true,
            interval: 4,
            pauseOnHover: true,
            slides: [
              {
                title: "Sub-10ms Neural Routing",
                subtitle: "Edge Model Execution",
                description: "Dynamic latency-optimized model switching across all frontier models and local weights.",
                badge: "Ultra Low Latency",
                image: photo("1526374965328-7f61d4dc18c5", "Neural routing code terminal", 1000),
                button: { label: "View Benchmarks", href: "/#benchmarks" },
              },
              {
                title: "Swarm Orchestration Engine",
                subtitle: "Multi-Agent Coordination",
                description: "Deterministic graph execution with verifiable rollback state and distributed locks.",
                badge: "Autonomous Agents",
                image: photo("1518770660439-4636190af475", "Distributed silicon processor", 1000),
                button: { label: "Read Docs", href: "/#architecture" },
              },
              {
                title: "Zero-Trust Agent Sandbox",
                subtitle: "Isolated Code Execution",
                description: "Micro-VM isolated execution environments with granular network policies and cryptographic proofs.",
                badge: "Hardware Isolation",
                image: photo("1550751827-4bd374c3f58b", "Secure enterprise datacenter", 1000),
                button: { label: "Security Whitepaper", href: "/#architecture" },
              },
              {
                title: "Distributed Vector Memory",
                subtitle: "Peta-scale Context Indexing",
                description: "Instant vector sync across 180 regions with hybrid keyword and semantic ranking.",
                badge: "Global RAG",
                image: photo("1451187580459-43490279c0fa", "Global neural digital network mesh", 1000),
                button: { label: "Test Indexing", href: "/#features" },
              },
              {
                title: "Live Telemetry & Auditing",
                subtitle: "Continuous Observability",
                description: "Deep token inspection, cost attribution, and compliance tracing down to individual agent tokens.",
                badge: "Full Observability",
                image: photo("1504384308090-c894fdcc538d", "Futuristic analytics monitoring desk", 1000),
                button: { label: "Inspect Metrics", href: "/#benchmarks" },
              },
            ],
          },
          { background: "surface", spacing: "relaxed", anchor: "features" },
        ),

        // 3. Trusted Enterprise Partners (Logos)
        section(
          "logos",
          {
            heading: "Trusted by engineering leaders at hyperscale startups & Fortune 500s",
            grayscale: true,
            logos: [
              photo("1551288049-bebda4e38f71", "Enterprise Partner 1", 400),
              photo("1451187580459-43490279c0fa", "Enterprise Partner 2", 400),
              photo("1518770660439-4636190af475", "Enterprise Partner 3", 400),
              photo("1526374965328-7f61d4dc18c5", "Enterprise Partner 4", 400),
            ],
          },
          { background: "default", spacing: "compact" },
        ),

        // 4. Bento-Grid Services / Architecture Features
        section(
          "services",
          {
            variant: "bento-grid",
            eyebrow: "Core Capabilities",
            heading: "Everything you need to ship production AI without the ops burden",
            columns: 3,
            mobileColumns: 1,
            showImages: true,
            showBadges: true,
            showIcons: true,
            items: [
              {
                title: "Dynamic Model Router",
                description:
                  "Automatically dispatch requests to the highest quality, lowest cost, or fastest model based on live latency telemetry.",
                icon: "bolt",
                badge: "Real-time",
                featured: true,
                image: photo("1531403009284-440f080d1e12", "Architecture wireframe", 1000),
                link: { label: "Explore Routing", href: "/#architecture" },
              },
              {
                title: "Deterministic State & Memory",
                description:
                  "Persistent short and long-term memory streams synchronized across thousands of parallel agent threads.",
                icon: "layers",
                badge: "Global Sync",
                image: photo("1451187580459-43490279c0fa", "Distributed context indexing", 900),
                link: { label: "Memory Docs", href: "/#features" },
              },
              {
                title: "Cryptographic Guardrails",
                description:
                  "Prevent prompt injection, hallucinated tool calls, and data exfiltration with hardware-attested sandbox filters.",
                icon: "shield",
                badge: "SOC2 Compliance",
                image: photo("1550751827-4bd374c3f58b", "Secure enterprise datacenter", 900),
                link: { label: "Security Model", href: "/#features" },
              },
              {
                title: "Automated Evaluation & Evals",
                description:
                  "Benchmark every prompt revision against historical test suites with continuous regression scoring.",
                icon: "check",
                badge: "CI/CD Evals",
                image: photo("1526374965328-7f61d4dc18c5", "Automated test benchmarks", 900),
                link: { label: "Continuous Testing", href: "/#features" },
              },
              {
                title: "One-Click Edge Deployment",
                description:
                  "Deploy TypeScript and Python agent definitions to worldwide edge clusters in less than 3 seconds.",
                icon: "rocket",
                badge: "180+ Regions",
                image: photo("1504384308090-c894fdcc538d", "Edge deployment console", 900),
                link: { label: "CLI Overview", href: "/#architecture" },
              },
            ],
          },
          { background: "surface", anchor: "architecture" },
        ),

        // 5. Global Benchmarks Split Section
        section(
          "split",
          {
            eyebrow: "Architectural Benchmarks",
            heading: "Engineered for 10x throughput at 40% lower compute cost",
            body: "Nexus bypasses traditional reverse-proxy bottlenecks with zero-copy Rust runtime drivers and intelligent distributed caching.",
            image: photo("1550751827-4bd374c3f58b", "Nexus high-performance server clusters", 1200),
            imagePosition: "right",
            bullets: [
              "Sub-12ms time-to-first-token (TTFT) across 98% of worldwide requests",
              "Autonomous token cache compression with up to 65% prompt token savings",
              "Full telemetry export to Datadog, OpenTelemetry, and Prometheus",
              "Zero maintenance infrastructure with automatic vertical auto-scaling",
            ],
            cta: { label: "Read Architecture Whitepaper", href: "/#architecture" },
          },
          { background: "default", anchor: "benchmarks" },
        ),

        // 6. Hard Numbers: Stats Section
        section(
          "stats",
          {
            heading: "Powering the next era of intelligent software",
            intro: "Battle-tested numbers from production clusters operating globally.",
            items: [
              { value: "4.8B+", label: "Monthly Invocations" },
              { value: "< 11ms", label: "Global P99 Latency" },
              { value: "99.999%", label: "Platform SLA Uptime" },
              { value: "40%", label: "Compute Cost Reduction" },
            ],
          },
          { background: "surface" },
        ),

        // 7. Transparent Developer & Enterprise Pricing
        section(
          "pricing",
          {
            eyebrow: "Predictable Investment",
            heading: "Transparent plans that scale smoothly with your compute",
            intro: "Start free with full sandbox access. Upgrade seamlessly as your agent volume grows.",
            plans: [
              {
                name: "Developer Sandbox",
                price: "$0",
                period: "free forever",
                description: "Perfect for testing, prototyping, and personal autonomous projects.",
                featured: false,
                features: [
                  "Up to 100,000 monthly agent tokens",
                  "3 parallel agent threads",
                  "Community Discord support",
                  "Full TypeScript & Python SDKs",
                  "Standard latency routing",
                ],
                cta: { label: "Start Free", href: "mailto:enterprise@nexusai.io" },
              },
              {
                name: "Production Growth",
                price: "$79",
                period: "per month",
                description: "Engineered for fast-growing startups and scaling engineering teams.",
                featured: true,
                badge: "Most Popular",
                features: [
                  "10,000,000 monthly agent tokens included",
                  "50 parallel agent threads",
                  "Sub-15ms edge priority routing",
                  "Deterministic memory vaults",
                  "Continuous CI/CD eval suite",
                  "Priority Slack engineering channel",
                ],
                cta: { label: "Deploy Cluster", href: "mailto:enterprise@nexusai.io" },
              },
              {
                name: "Enterprise Dedicated",
                price: "Custom",
                period: "annual billing",
                description: "Dedicated infrastructure, custom SLAs, and air-gapped on-prem deployments.",
                featured: false,
                features: [
                  "Unlimited agent invocations & throughput",
                  "Dedicated private VPC edge clusters",
                  "Custom zero-data-retention model SLAs",
                  "SOC2 Type II & HIPAA BAA compliance",
                  "24/7 dedicated solutions architect",
                  "Custom model fine-tuning adapters",
                ],
                cta: { label: "Schedule Architecture Review", href: "mailto:enterprise@nexusai.io" },
              },
            ],
          },
          { background: "default", anchor: "pricing" },
        ),

        // 8. Social Proof: Testimonials
        section(
          "testimonials",
          {
            heading: "What technical leaders say about Nexus",
            items: [
              {
                quote:
                  "Nexus reduced our multi-agent pipeline latency from 680ms down to 42ms. It transformed our real-time customer copilot from sluggish to feeling like magic.",
                name: "Dr. Elena Rostova",
                role: "VP of Artificial Intelligence, HyperScale Labs",
              },
              {
                quote:
                  "The zero-trust sandbox and cryptographic guardrails allowed our compliance team to approve autonomous workflows in days instead of months.",
                name: "Marcus Vance",
                role: "Chief Information Security Officer, FinCore Systems",
              },
              {
                quote:
                  "Their predictive prompt cache alone paid for the entire platform in the first 48 hours of our global launch.",
                name: "Julian Thorne",
                role: "Founder & CEO, Synthetix Audio",
              },
            ],
          },
          { background: "surface" },
        ),

        // 9. Frequently Asked Questions
        section(
          "faq",
          {
            heading: "Frequently Asked Questions",
            intro: "Have questions about integration, data security, or throughput? We have answers.",
            items: [
              {
                question: "How does Nexus maintain sub-10ms latency?",
                answer:
                  "Nexus uses zero-copy Rust connection proxies positioned at 180+ global edge Points of Presence (PoPs) directly peered with all major cloud datacenters.",
              },
              {
                question: "Are our proprietary prompts or data used for training?",
                answer:
                  "Never. All Nexus enterprise traffic operates with cryptographic Zero-Data Retention (ZDR). Your prompts, embeddings, and outputs are processed in volatile RAM.",
              },
              {
                question: "Which model providers and frameworks are supported?",
                answer:
                  "Nexus supports Anthropic, OpenAI, Google Gemini, Mistral, and custom vLLM/Ollama endpoints out of the box with drop-in SDK compatibility.",
              },
              {
                question: "Can we run Nexus in our own AWS, GCP, or Azure VPC?",
                answer:
                  "Yes. Our Enterprise tier offers full Terraform and Helm charts for self-hosted private VPC deployments with automated control plane synchronization.",
              },
            ],
          },
          { background: "default" },
        ),

        // 10. High-Converting CTA Band
        section(
          "cta",
          {
            variant: "centered-card",
            cardStyle: "elevated",
            eyebrow: "Instant Setup",
            heading: "Ready to deploy your first production agent in 3 minutes?",
            text: "Join over 2,400 engineering teams building high-reliability autonomous systems on Nexus AI.",
            button: { label: "Create Free Sandbox Cluster", href: "/#pricing" },
            secondaryButton: { label: "Schedule 1-on-1 Demo", href: "mailto:enterprise@nexusai.io" },
            trustBadges: ["No credit card required", "Instant API key generation", "Free $100 compute credit"],
          },
          { background: "surface" },
        ),
      ],
    },
  ],
});
