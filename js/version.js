// Footer commit hash. The site has no build step, so the deployed page can't
// embed its own SHA — instead we ask GitHub for the tip of main at load time,
// cached per session to stay far below the 60 req/h anonymous API limit.
"use strict";

(async () => {
  const el = document.getElementById("commit");
  try {
    let sha = sessionStorage.getItem("jellytek-sha");
    if (!sha) {
      const res = await fetch(
        "https://api.github.com/repos/ShmukaDuk/jellytek/commits/main",
        { headers: { Accept: "application/vnd.github+json" } }
      );
      if (!res.ok) throw new Error(res.status);
      sha = (await res.json()).sha;
      sessionStorage.setItem("jellytek-sha", sha);
    }
    el.textContent = sha.slice(0, 7);
    el.href = `https://github.com/ShmukaDuk/jellytek/commit/${sha}`;
  } catch {
    el.textContent = "main";        // offline or rate-limited — degrade quietly
  }
})();
