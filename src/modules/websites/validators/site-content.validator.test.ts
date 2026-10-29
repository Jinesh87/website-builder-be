import assert from "node:assert/strict";
import { test } from "node:test";
import { sectionSchema } from "./site-content.validator.js";

const OPTIONS = { stripUnknown: true, abortEarly: false } as const;
const settings = { background: "default", hideOnMobile: false };

const downloadButton = {
  label: "Download Brochure",
  href: "https://api.example.com/api/media/files/0f8fad5b-d9cb-469f-a165-70867728950e",
  actionType: "download",
  downloadFileName: "Brochure.pdf",
  icon: "download",
  iconPosition: "right",
  openInNewTab: true,
};

test("button icons and download settings survive saving", () => {
  const section = {
    id: "cta-1",
    type: "cta",
    hidden: false,
    settings,
    data: { heading: "Ready to Transform Your Space?", button: { label: "Contact Us", href: "/contact" }, secondaryButton: downloadButton },
  };
  const { value, error } = sectionSchema.validate(section, OPTIONS);
  assert.equal(error, undefined);
  assert.deepEqual(value.data.secondaryButton, downloadButton);
});

test("video demo buttons survive saving with videoUrl and actionType", () => {
  const videoButton = {
    label: "Watch 2-min demo",
    href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    actionType: "video",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    videoTitle: "Platform Demo",
    icon: "play",
    iconPosition: "left",
  };
  const section = {
    id: "cta-2",
    type: "cta",
    hidden: false,
    settings,
    data: { heading: "Experience Our Platform", button: videoButton },
  };
  const { value, error } = sectionSchema.validate(section, OPTIONS);
  assert.equal(error, undefined);
  assert.deepEqual(value.data.button, videoButton);
});

test("button links stay limited to safe options", () => {
  const withButton = (secondaryButton: object) => ({
    id: "cta-1",
    type: "cta",
    hidden: false,
    settings,
    data: { heading: "CTA", button: { label: "Go", href: "/contact" }, secondaryButton },
  });
  assert.ok(sectionSchema.validate(withButton({ ...downloadButton, href: "javascript:alert(1)" }), OPTIONS).error);
  assert.ok(sectionSchema.validate(withButton({ ...downloadButton, actionType: "script" }), OPTIONS).error);
  assert.ok(sectionSchema.validate(withButton({ ...downloadButton, iconImage: { url: "javascript:alert(1)", alt: "" } }), OPTIONS).error);
});

test("Do's & Don'ts cards keep their variant, checklist points and bottom button", () => {
  const section = {
    id: "cards-1",
    type: "cards",
    hidden: false,
    settings,
    data: {
      variant: "dos-donts",
      heading: "Do's & Don'ts",
      columns: 2,
      mobileColumns: 1,
      bottomCta: { label: "Download Installation Guide", href: "/resources", icon: "download", actionType: "download" },
      items: [
        { title: "Do's", icon: "check", accentColor: "#16a34a", checklist: ["Store boards flat.", { text: "Pre-drill holes.", icon: "check" }] },
        { title: "Don'ts", icon: "x", accentColor: "#ef4444", checklist: ["Avoid harsh solvents."] },
      ],
    },
  };
  const { value, error } = sectionSchema.validate(section, OPTIONS);
  assert.equal(error, undefined);
  assert.equal(value.data.variant, "dos-donts");
  assert.deepEqual(value.data.items[0].checklist, section.data.items[0].checklist);
  assert.deepEqual(value.data.items[1].checklist, section.data.items[1].checklist);
  assert.deepEqual(value.data.bottomCta, section.data.bottomCta);
});

test("film cards keep an uploaded video or a YouTube link, and can omit the video", () => {
  const film = (videoUrl?: string) => ({
    id: "cards-film",
    type: "cards",
    hidden: false,
    settings,
    data: {
      variant: "film-vault",
      heading: "OUR WORK",
      columns: 4,
      mobileColumns: 1,
      items: [
        {
          title: "MIDNIGHT RADIO",
          subtitle: "MUSIC VIDEOS",
          badge: "03:45",
          description: "Broadcast commercial.",
          ...(videoUrl ? { videoUrl } : {}),
        },
      ],
    },
  });

  const youtube = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const uploaded = "https://api.example.com/api/media/files/0f8fad5b-d9cb-469f-a165-70867728950e";
  const file = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  for (const videoUrl of [youtube, uploaded, file, "/bannervid.mp4"]) {
    const { value, error } = sectionSchema.validate(film(videoUrl), OPTIONS);
    assert.equal(error, undefined, videoUrl);
    assert.equal(value.data.items[0].videoUrl, videoUrl);
  }

  const cleared = sectionSchema.validate(film(), OPTIONS);
  assert.equal(cleared.error, undefined);
  assert.equal(cleared.value.data.items[0].videoUrl, undefined);

  const rejected = sectionSchema.validate(film("https://vimeo.com/123456789"), OPTIONS);
  assert.ok(rejected.error);
});
