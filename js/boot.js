// Runs synchronously in <head>, before first paint, so the scroll-reveal rules
// only ever hide content on a page that actually has the JS to reveal it again.
document.documentElement.classList.add("js");
