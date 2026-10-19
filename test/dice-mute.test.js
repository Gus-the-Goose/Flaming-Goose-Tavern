import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { parseHTML } from "linkedom";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

// Run the real page and event handlers with browser speech/storage boundaries mocked.
function openPage(storage = new Map(), { speechSupported = true } = {}) {
  const { document, Event } = parseHTML(html);
  const spoken = [];
  let cancellations = 0;
  const speechSynthesis = {
    speaking: false, paused: false,
    getVoices: () => [],
    speak(utterance) { spoken.push(utterance); this.speaking = true; utterance.onstart?.(); },
    cancel() { cancellations++; this.speaking = false; this.paused = false; },
  };
  // LinkeDOM select.value is read-only; native browser selects allow assignment.
  for (const select of document.querySelectorAll("select")) {
    Object.defineProperty(select, "value", { value: "", writable: true });
  }
  const window = { setTimeout() {}, setInterval() {}, addEventListener() {} };
  if (speechSupported) window.speechSynthesis = speechSynthesis;
  const context = vm.createContext({
    document, window, navigator: {}, console,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    // Initial server loading is unrelated to dice; leave it pending without timers.
    fetch: () => new Promise(() => {}),
  });
  vm.runInContext(script, context);
  return {
    document, spoken, storage, speechSynthesis,
    get cancellations() { return cancellations; },
    run: code => vm.runInContext(code, context),
    click: selector => document.querySelector(selector).click(),
    change: selector => document.querySelector(selector).dispatchEvent(new Event("change")),
    result: document.querySelector("#dice-result"),
    mute: document.querySelector("#dice-mute"),
  };
}

test("audible rolls keep their modifier, speech, and live announcement", () => {
  const page = openPage();
  page.run("Math.random = () => 0.6");
  page.document.querySelector("#dice-mod").value = "-2";
  page.click('[data-die="20"]');
  assert.equal(page.result.textContent, "d20: 13 (-2) = 11");
  assert.match(page.spoken.at(-1).text, /Natural 13, minus 2, total 11/);
  assert.equal(page.result.getAttribute("role"), "alert");
  assert.equal(page.result.getAttribute("aria-live"), "assertive");
  assert.match(page.run("pageSpeechText()"), /Latest dice result/);
});

test("muted DM rolls stay visible but never enter speech or spoken archives", () => {
  const page = openPage();
  page.click("#dice-mute");
  page.click('[data-die="20"]');
  assert.match(page.result.textContent, /^d20:/);
  assert.equal(page.result.classList.contains("hidden"), false);
  assert.equal(page.spoken.length, 0);
  assert.equal(page.storage.has("flaming-goose-spoken-archive"), false);
  assert.equal(page.result.getAttribute("aria-live"), "off");
  assert.equal(page.result.hasAttribute("role"), false);
  assert.doesNotMatch(page.run("pageSpeechText()"), /Latest dice result/);
  page.click("#dice-mute");
  assert.doesNotMatch(page.run("pageSpeechText()"), /Latest dice result/);
  assert.equal(page.result.getAttribute("aria-live"), "off");
  page.run("speakPage()");
  assert.doesNotMatch(page.spoken.at(-1).text, /Latest dice result/);
  page.click('[data-die="6"]');
  assert.match(page.spoken.at(-1).text, /Rolled a d 6/);
  assert.equal(page.result.getAttribute("aria-live"), "assertive");
});

test("mute survives settings edits and reloads, independently for each device", () => {
  const page = openPage();
  page.click("#dice-mute");
  page.change("#set-tts-voice");
  const reloaded = openPage(page.storage);
  assert.equal(reloaded.mute.getAttribute("aria-pressed"), "true");
  assert.equal(reloaded.mute.textContent, "Dice muted");
  reloaded.click('[data-die="4"]');
  assert.equal(reloaded.spoken.length, 0);
  assert.equal(openPage().mute.getAttribute("aria-pressed"), "false");
});

test("mute stops an active dice read and a page read containing dice", () => {
  for (const readPage of [false, true]) {
    const page = openPage();
    page.click('[data-die="20"]');
    if (readPage) page.run("speakPage()");
    const before = page.cancellations;
    page.click("#dice-mute");
    assert.equal(page.cancellations, before + 1);
    assert.equal(page.run("ttsQueue.length"), 0);
    assert.equal(page.speechSynthesis.speaking, false);
  }
});

test("dice mute leaves other narration and automatic table speech available", () => {
  const page = openPage();
  page.run('speak("The tavern door opens.")');
  const before = page.cancellations;
  page.click("#dice-mute");
  assert.equal(page.cancellations, before);
  page.run('saveSettings({ ...loadSettings(), voiceoverMode: true }); speakNewEntriesIfVoiceoverMode([{ speakerLabel: "Player", text: "Hello, table." }])');
  assert.match(page.spoken.at(-1).text, /Hello, table/);
});

test("mute works even when the browser has no speech synthesis", () => {
  const page = openPage(new Map(), { speechSupported: false });
  page.click("#dice-mute");
  page.click('[data-die="8"]');
  assert.equal(page.result.getAttribute("aria-live"), "off");
  assert.match(page.result.textContent, /^d8:/);
});
